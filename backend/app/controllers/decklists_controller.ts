import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Decklist from '#models/decklist'
import DecklistEntry from '#models/decklist_entry'
import CardCopy from '#models/card_copy'
import { assertOwnedTargets } from '#services/ownership'
import { checkLegality } from '#services/deck_legality'
import { leaveDeckBox, moveDeckBox, storeInDeckBox } from '#services/deck_storage'
import {
  SECTIONS,
  type Section,
  buildCardResolver,
  formatDecklist,
  parseDecklist,
  sectionForType,
} from '#services/decklist_text'
import {
  decklistEntryValidator,
  decklistImportValidator,
  decklistValidator,
} from '#validators/stock'

export default class DecklistsController {
  async index({ auth }: HttpContext) {
    const decklists = await Decklist.query()
      .where('user_id', auth.getUserOrFail().id)
      .withAggregate('entries', (q) => q.sum('quantity').as('total_cards'))
      .withCount('copies', (q) => q.as('assigned'))
      .preload('storageLocation')
      .orderBy('name')

    // Aperçu : la légende du deck, ses couleurs (domaines) et quelques illustrations
    const ids = decklists.map((d) => d.id)
    const rows = ids.length
      ? await db
          .from('decklist_entries as e')
          .join('cards as c', 'c.id', 'e.card_id')
          .whereIn('e.decklist_id', ids)
          .select(
            'e.decklist_id',
            'e.quantity',
            'e.section',
            'c.keywords',
            'c.id',
            'c.name',
            'c.type',
            'c.faction',
            'c.thumbnail_url'
          )
          .orderBy('e.quantity', 'desc')
          .orderBy('c.name')
      : []

    const previews = new Map<
      number,
      {
        legend: { id: string; name: string; thumbnailUrl: string | null } | null
        domains: string[]
        images: string[]
        legality: { legal: boolean; issues: number }
      }
    >()
    for (const id of ids) {
      const entries = rows.filter((r) => r.decklist_id === id)
      const legendRow =
        entries.find((r) => r.section === 'legend') ??
        entries.find((r) => r.type === 'Legend') ??
        null
      const split = (faction: string | null) =>
        (faction ?? '')
          .split('/')
          .map((f: string) => f.trim())
          .filter(Boolean)

      // Les couleurs d'un deck sont celles de sa légende ; sans légende, les plus présentes
      let domains = legendRow ? split(legendRow.faction) : []
      if (!domains.length) {
        const weight = new Map<string, number>()
        for (const r of entries.filter((e) => e.section === 'main' || e.section === 'champion')) {
          for (const d of split(r.faction)) weight.set(d, (weight.get(d) ?? 0) + Number(r.quantity))
        }
        domains = [...weight.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([d]) => d)
      }

      const images = entries
        .filter(
          (r) =>
            r.thumbnail_url &&
            r.id !== legendRow?.id &&
            !['rune', 'battlefield', 'sideboard', 'legend'].includes(r.section)
        )
        .sort((a, b) => (a.section === 'champion' ? -1 : b.section === 'champion' ? 1 : 0))
        .slice(0, 2)
        .map((r) => r.thumbnail_url as string)

      previews.set(id, {
        legend: legendRow
          ? { id: legendRow.id, name: legendRow.name, thumbnailUrl: legendRow.thumbnail_url }
          : null,
        domains,
        images,
        legality: (() => {
          const l = checkLegality(
            entries.map((e) => ({ section: e.section, quantity: Number(e.quantity), card: e }))
          )
          return { legal: l.legal, issues: l.issues.length }
        })(),
      })
    }

    return decklists.map((d) => {
      const total = Number(d.$extras.total_cards ?? 0)
      const assigned = Number(d.$extras.assigned ?? 0)
      return {
        id: d.id,
        name: d.name,
        description: d.description,
        totalCards: total,
        assignedCopies: assigned,
        complete: total > 0 && assigned >= total,
        storageLocation: d.storageLocation
          ? { id: d.storageLocation.id, name: d.storageLocation.name }
          : null,
        ...(previews.get(d.id) ?? {
          legend: null,
          domains: [],
          images: [],
          legality: { legal: false, issues: 0 },
        }),
      }
    })
  }

  async store({ auth, request, response }: HttpContext) {
    const userId = auth.getUserOrFail().id
    const data = await request.validateUsing(decklistValidator)
    await assertOwnedTargets(userId, data)
    const decklist = await Decklist.create({ ...data, userId })
    return response.created(decklist)
  }

  /**
   * Détail : pour chaque carte de la liste, combien sont demandées, quels
   * exemplaires sont affectés et combien d'exemplaires libres sont disponibles
   */
  async show({ auth, params }: HttpContext) {
    const decklist = await this.find(auth.getUserOrFail().id, params.id)
    const entries = await DecklistEntry.query().where('decklist_id', decklist.id).preload('card')
    const copies = await CardCopy.query()
      .where('decklist_id', decklist.id)
      .preload('storageLocation')
      .preload('card')
      .orderBy('id')

    const cardIds = [...new Set([...entries.map((e) => e.cardId), ...copies.map((c) => c.cardId)])]
    const freeRows = cardIds.length
      ? await db
          .from('card_copies')
          .select('card_id')
          .count('* as free')
          .whereIn('card_id', cardIds)
          .where('user_id', decklist.userId!)
          .whereNull('decklist_id')
          .groupBy('card_id')
      : []
    const free = new Map(freeRows.map((r) => [r.card_id as string, Number(r.free)]))

    // Les exemplaires affectés d'une carte sont répartis entre ses sections, dans l'ordre
    const order = (section: string) => SECTIONS.indexOf(section as Section)
    entries.sort(
      (a, b) =>
        order(a.section) - order(b.section) ||
        (a.card.type ?? '').localeCompare(b.card.type ?? '') ||
        a.card.name.localeCompare(b.card.name)
    )
    const pool = new Map<string, CardCopy[]>()
    for (const copy of copies) pool.set(copy.cardId, [...(pool.get(copy.cardId) ?? []), copy])

    const rows = entries.map((entry) => {
      const remaining = pool.get(entry.cardId) ?? []
      const assigned = remaining.splice(0, entry.quantity)
      return {
        section: entry.section,
        card: entry.card.toApi(),
        quantity: entry.quantity,
        assigned: assigned.map((c) => c.toApi()),
        missing: Math.max(0, entry.quantity - assigned.length),
        available: free.get(entry.cardId) ?? 0,
      }
    })

    // Exemplaires affectés en trop ou à des cartes absentes de la liste
    const extra = [...pool.values()].flat()

    const totalCards = rows.reduce((s, r) => s + r.quantity, 0)
    const assignedCount = rows.reduce((s, r) => s + r.assigned.length, 0)
    const sections = SECTIONS.map((section) => ({
      section,
      count: rows.filter((r) => r.section === section).reduce((s, r) => s + r.quantity, 0),
    }))
    return {
      id: decklist.id,
      name: decklist.name,
      description: decklist.description,
      storageLocation: decklist.storageLocation
        ? { id: decklist.storageLocation.id, name: decklist.storageLocation.name }
        : null,
      totalCards,
      assignedCopies: assignedCount,
      missingCards: rows.reduce((s, r) => s + r.missing, 0),
      sections,
      legality: checkLegality(
        entries.map((e) => ({ section: e.section, quantity: e.quantity, card: e.card }))
      ),
      entries: rows,
      extraCopies: extra.map((c) => c.toApi()),
    }
  }

  async update({ auth, params, request }: HttpContext) {
    const userId = auth.getUserOrFail().id
    const decklist = await this.find(userId, params.id)
    const data = await request.validateUsing(decklistValidator)
    await assertOwnedTargets(userId, data)
    const oldBox = decklist.storageLocationId ?? null
    await db.transaction(async (trx) => {
      decklist.useTransaction(trx)
      decklist.merge(data)
      await decklist.save()
      if (data.storageLocationId !== undefined) {
        await moveDeckBox(decklist.id, oldBox, data.storageLocationId, trx)
      }
    })
    return decklist
  }

  /**
   * Supprime la decklist ; ses exemplaires redeviennent libres
   */
  async destroy({ auth, params, response }: HttpContext) {
    const decklist = await this.find(auth.getUserOrFail().id, params.id)
    await db.transaction(async (trx) => {
      await leaveDeckBox(await this.copyIds(decklist.id, trx), trx)
      await trx.from('card_copies').where('decklist_id', decklist.id).update({ decklist_id: null })
      await trx.from('decklists').where('id', decklist.id).delete()
    })
    return response.noContent()
  }

  /**
   * Ajoute/modifie une carte de la liste (quantity = 0 la retire)
   */
  async setEntry({ auth, params, request }: HttpContext) {
    const decklist = await this.find(auth.getUserOrFail().id, params.id)
    const {
      cardId,
      quantity,
      section: wanted,
    } = await request.validateUsing(decklistEntryValidator)
    const card = await db.from('cards').where('id', cardId).select('type').first()
    const section = wanted ?? sectionForType(card?.type)
    if (quantity === 0) {
      await DecklistEntry.query()
        .where({ decklist_id: decklist.id, card_id: cardId, section })
        .delete()
      return { cardId, section, quantity: 0 }
    }
    const entry = await DecklistEntry.updateOrCreate(
      { decklistId: decklist.id, cardId, section },
      { quantity }
    )
    return { cardId: entry.cardId, section: entry.section, quantity: entry.quantity }
  }

  /**
   * Importe une liste texte. Accepte le format par sections des deckbuilders
   * (Legend:, Champion:, MainDeck:, Battlefields:, Runes:, Sideboard:) ou une
   * simple liste "3 Nom de carte". Sans section, elle est déduite du type de carte.
   */
  async importText({ auth, params, request }: HttpContext) {
    const decklist = await this.find(auth.getUserOrFail().id, params.id)
    const { text, replace } = await request.validateUsing(decklistImportValidator)
    const resolve = await buildCardResolver()

    const wanted = new Map<string, { cardId: string; section: Section; quantity: number }>()
    const notFound: string[] = []
    for (const line of parseDecklist(text)) {
      const card = resolve(line.label)
      if (!card) {
        notFound.push(line.raw)
        continue
      }
      const section = line.section ?? sectionForType(card.type)
      const key = `${section}|${card.id}`
      const current = wanted.get(key)
      wanted.set(key, {
        cardId: card.id,
        section,
        quantity: (current?.quantity ?? 0) + line.quantity,
      })
    }

    await db.transaction(async (trx) => {
      if (replace) await trx.from('decklist_entries').where('decklist_id', decklist.id).delete()
      for (const { cardId, section, quantity } of wanted.values()) {
        await DecklistEntry.updateOrCreate(
          { decklistId: decklist.id, cardId, section },
          { quantity },
          { client: trx }
        )
      }
    })

    const counts = Object.fromEntries(
      SECTIONS.map((section) => [
        section,
        [...wanted.values()]
          .filter((w) => w.section === section)
          .reduce((sum, w) => sum + w.quantity, 0),
      ])
    )
    return { imported: wanted.size, sections: counts, notFound }
  }

  /**
   * Affecte automatiquement des exemplaires libres aux cartes manquantes
   */
  async autoAssign({ auth, params }: HttpContext) {
    const decklist = await this.find(auth.getUserOrFail().id, params.id)
    const entries = await DecklistEntry.query().where('decklist_id', decklist.id)
    let assigned = 0

    // Une carte présente dans plusieurs sections demande la somme des quantités
    const needed = new Map<string, number>()
    for (const e of entries) needed.set(e.cardId, (needed.get(e.cardId) ?? 0) + e.quantity)

    await db.transaction(async (trx) => {
      for (const [cardId, quantity] of needed) {
        const entry = { cardId, quantity }
        const already = await trx
          .from('card_copies')
          .where({ decklist_id: decklist.id, card_id: entry.cardId })
          .count('* as total')
        const missing = entry.quantity - Number(already[0].total)
        if (missing <= 0) continue
        const freeIds = await trx
          .from('card_copies')
          .where('card_id', entry.cardId)
          .where('user_id', decklist.userId!)
          .whereNull('decklist_id')
          .orderBy('foil', 'asc')
          .orderBy('id', 'asc')
          .limit(missing)
          .select('id')
        if (!freeIds.length) continue
        await trx
          .from('card_copies')
          .whereIn(
            'id',
            freeIds.map((r) => r.id)
          )
          .update({
            decklist_id: decklist.id,
            updated_at: DateTime.utc().toSQL({ includeOffset: false }),
          })
        await storeInDeckBox(
          freeIds.map((r) => r.id),
          trx
        )
        assigned += freeIds.length
      }
    })

    return { assigned }
  }

  /**
   * Libère tous les exemplaires affectés à la decklist
   */
  async release({ auth, params }: HttpContext) {
    const decklist = await this.find(auth.getUserOrFail().id, params.id)
    const ids = await this.copyIds(decklist.id)
    await db.transaction(async (trx) => {
      await leaveDeckBox(ids, trx)
      await trx
        .from('card_copies')
        .whereIn('id', ids)
        .update({ decklist_id: null, updated_at: DateTime.utc().toSQL({ includeOffset: false }) })
    })
    return { released: ids.length }
  }

  private async copyIds(decklistId: number, client: any = db): Promise<number[]> {
    const rows = await client.from('card_copies').where('decklist_id', decklistId).select('id')
    return rows.map((r: { id: number }) => r.id)
  }

  async exportText({ auth, params, response }: HttpContext) {
    const decklist = await this.find(auth.getUserOrFail().id, params.id)
    const entries = await DecklistEntry.query().where('decklist_id', decklist.id).preload('card')
    const text = formatDecklist(
      entries.map((e) => ({ section: e.section, quantity: e.quantity, name: e.card.name }))
    )
    return response.header('content-type', 'text/plain; charset=utf-8').send(text)
  }

  private find(userId: number, id: unknown) {
    return Decklist.query().where({ id, user_id: userId }).preload('storageLocation').firstOrFail()
  }
}
