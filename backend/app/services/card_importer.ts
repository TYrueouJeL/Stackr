import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { CardDTO, RiftboundContentDTO } from '#services/riftbound_api'

export interface ImportResult {
  version: string
  lastUpdated: string
  sets: number
  cards: number
}

function toInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function cardRow(card: CardDTO, setId: string, now: string | null) {
  return {
    id: String(card.id),
    set_id: setId,
    collector_number: toInt(card.collectorNumber),
    name: card.name ?? String(card.id),
    description: card.description ?? null,
    type: card.type ?? null,
    rarity: card.rarity ?? null,
    faction: card.faction ?? null,
    energy: toInt(card.stats?.energy),
    might: toInt(card.stats?.might),
    cost: toInt(card.stats?.cost),
    power: toInt(card.stats?.power),
    keywords: JSON.stringify(card.keywords ?? []),
    tags: JSON.stringify(card.tags ?? []),
    flavor_text: card.flavorText ?? null,
    thumbnail_url: card.art?.thumbnailURL ?? null,
    full_url: card.art?.fullURL ?? null,
    artist: card.art?.artist ?? null,
    raw: JSON.stringify(card.raw ?? card),
    created_at: now,
    updated_at: now,
  }
}

/**
 * Insère ou met à jour (upsert) les extensions et cartes renvoyées par l'API.
 * Les exemplaires, decklists et rangements ne sont jamais touchés.
 */
export default async function importContent(content: RiftboundContentDTO): Promise<ImportResult> {
  const now = DateTime.utc().toSQL({ includeOffset: false })
  let cardCount = 0

  await db.transaction(async (trx) => {
    for (const [index, set] of (content.sets ?? []).entries()) {
      await trx
        .insertQuery()
        .table('card_sets')
        .insert({ id: set.id, name: set.name, position: index, created_at: now, updated_at: now })
        .knexQuery.onConflict('id')
        .merge(['name', 'position', 'updated_at'])

      const rows = (set.cards ?? []).map((card) => cardRow(card, card.set || set.id, now))
      // Une carte peut référencer une extension absente de la liste : on la crée
      for (const extraSetId of new Set(rows.map((r) => r.set_id).filter((id) => id !== set.id))) {
        await trx
          .insertQuery()
          .table('card_sets')
          .insert({
            id: extraSetId,
            name: extraSetId,
            position: 1000,
            created_at: now,
            updated_at: now,
          })
          .knexQuery.onConflict('id')
          .ignore()
      }

      for (let i = 0; i < rows.length; i += 100) {
        const chunk = rows.slice(i, i + 100)
        await trx
          .insertQuery()
          .table('cards')
          .multiInsert(chunk)
          .knexQuery.onConflict('id')
          .merge(Object.keys(chunk[0]).filter((k) => k !== 'id' && k !== 'created_at'))
      }
      cardCount += rows.length
    }
  })

  return {
    version: content.version,
    lastUpdated: content.lastUpdated,
    sets: content.sets?.length ?? 0,
    cards: cardCount,
  }
}
