import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { displayName, normalizeName } from '#services/decklist_text'
import { pricesFor } from '#services/cardmarket_prices'

interface Line {
  key: string
  name: string
  card: {
    id: string
    name: string
    setId: string
    collectorNumber: number | null
    thumbnailUrl: string | null
    type: string | null
  }
  needed: number
  available: number
  missing: number
  decklists: { id: number; name: string; quantity: number }[]
}

export default class ShoppingController {
  /**
   * Liste d'achat : pour les decklists choisies (toutes par défaut), les cartes qui
   * manquent dans la collection. Une carte compte par son nom, quelle que soit
   * l'impression possédée (une version alternative de Cleave fait l'affaire).
   * Les exemplaires déjà affectés à une autre decklist ne sont pas disponibles.
   */
  async index({ auth, request }: HttpContext) {
    const userId = auth.getUserOrFail().id
    const decks = await db
      .from('decklists')
      .where('user_id', userId)
      .select('id', 'name')
      .orderBy('name')
    const requested = String(request.input('decklists', ''))
      .split(',')
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0)
    const selected = requested.length ? decks.filter((d) => requested.includes(d.id)) : decks
    const selectedIds = selected.map((d) => d.id)

    const lines = new Map<string, Line>()
    if (selectedIds.length) {
      const entries = await db
        .from('decklist_entries as e')
        .join('cards as c', 'c.id', 'e.card_id')
        .whereIn('e.decklist_id', selectedIds)
        .select(
          'e.decklist_id',
          'e.quantity',
          'c.id',
          'c.name',
          'c.set_id',
          'c.collector_number',
          'c.thumbnail_url',
          'c.type'
        )
      for (const e of entries) {
        const key = normalizeName(e.name)
        const line: Line = lines.get(key) ?? {
          key,
          name: displayName(e.name),
          card: {
            id: e.id,
            name: e.name,
            setId: e.set_id,
            collectorNumber: e.collector_number,
            thumbnailUrl: e.thumbnail_url,
            type: e.type,
          },
          needed: 0,
          available: 0,
          missing: 0,
          decklists: [],
        }
        line.needed += Number(e.quantity)
        const deckName = selected.find((d) => d.id === e.decklist_id)?.name ?? ''
        const deckLine = line.decklists.find((d) => d.id === e.decklist_id)
        if (deckLine) deckLine.quantity += Number(e.quantity)
        else
          line.decklists.push({ id: e.decklist_id, name: deckName, quantity: Number(e.quantity) })
        lines.set(key, line)
      }

      const copies = await db
        .from('card_copies as cp')
        .join('cards as c', 'c.id', 'cp.card_id')
        .where('cp.user_id', userId)
        .where((q) => q.whereNull('cp.decklist_id').orWhereIn('cp.decklist_id', selectedIds))
        .select('c.name')
      for (const copy of copies) {
        const line = lines.get(normalizeName(copy.name))
        if (line) line.available++
      }
    }

    const all = [...lines.values()].map((l) => ({
      ...l,
      missing: Math.max(0, l.needed - l.available),
    }))
    const missing = all.filter((l) => l.missing > 0).sort((a, b) => a.name.localeCompare(b.name))
    const prices = await pricesFor(missing.map((l) => l.card.id))
    const priced = missing.map((l) => {
      const price = prices.get(l.card.id) ?? null
      const total = price?.value ? Math.round(price.value * l.missing * 100) / 100 : null
      return { ...l, price, total }
    })
    return {
      decklists: decks.map((d) => ({ ...d, selected: selectedIds.includes(d.id) })),
      totalNeeded: all.reduce((s, l) => s + l.needed, 0),
      totalMissing: missing.reduce((s, l) => s + l.missing, 0),
      lines: priced,
      totalCost: Math.round(priced.reduce((s, l) => s + (l.total ?? 0), 0) * 100) / 100,
      unpriced: priced.filter((l) => !l.price?.value).length,
      text: missing.map((l) => `${l.missing} ${l.name}`).join('\n'),
    }
  }
}
