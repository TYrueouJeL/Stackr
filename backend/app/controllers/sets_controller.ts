import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import CardSet from '#models/card_set'
import Card from '#models/card'

export default class SetsController {
  /**
   * Liste des extensions avec la complétion du masterset
   */
  async index({}: HttpContext) {
    const rows = await db
      .from('card_sets as s')
      .select('s.id', 's.name', 's.position')
      .select(db.raw('(select count(*) from cards c where c.set_id = s.id) as total_cards'))
      .select(
        db.raw(
          '(select count(distinct cc.card_id) from card_copies cc join cards c on c.id = cc.card_id where c.set_id = s.id) as owned_cards'
        )
      )
      .select(
        db.raw(
          '(select count(*) from card_copies cc join cards c on c.id = cc.card_id where c.set_id = s.id) as total_copies'
        )
      )
      .orderBy('s.position')
      .orderBy('s.id')

    return rows.map((row) => {
      const total = Number(row.total_cards)
      const owned = Number(row.owned_cards)
      return {
        id: row.id,
        name: row.name,
        totalCards: total,
        ownedCards: owned,
        totalCopies: Number(row.total_copies),
        completion: total ? Math.round((owned / total) * 1000) / 10 : 0,
      }
    })
  }

  /**
   * Détail d'une extension : toutes ses cartes et la quantité possédée
   */
  async show({ params, response }: HttpContext) {
    const set = await CardSet.find(params.id)
    if (!set) return response.notFound({ message: 'Extension introuvable' })

    const cards = await Card.query()
      .where('set_id', set.id)
      .withCount('copies', (q) => q.as('owned'))
      .orderByRaw('collector_number is null, collector_number')
      .orderBy('name')

    const items = cards.map((c) => ({ ...c.toApi(), owned: Number(c.$extras.owned) }))
    const owned = items.filter((c) => c.owned > 0).length

    const byRarity: Record<string, { total: number; owned: number }> = {}
    for (const card of items) {
      const key = card.rarity ?? 'Inconnue'
      byRarity[key] ??= { total: 0, owned: 0 }
      byRarity[key].total++
      if (card.owned > 0) byRarity[key].owned++
    }

    return {
      id: set.id,
      name: set.name,
      totalCards: items.length,
      ownedCards: owned,
      totalCopies: items.reduce((sum, c) => sum + c.owned, 0),
      completion: items.length ? Math.round((owned / items.length) * 1000) / 10 : 0,
      byRarity,
      cards: items,
    }
  }
}
