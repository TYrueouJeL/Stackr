import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Card from '#models/card'
import CardCopy from '#models/card_copy'
import DecklistEntry from '#models/decklist_entry'

export default class CardsController {
  /**
   * Recherche de cartes. Filtres : q, set, rarity, type, faction, owned (yes|no)
   */
  async index({ request }: HttpContext) {
    const { q, set, rarity, type, faction, owned } = request.qs()
    const page = Math.max(1, Number(request.input('page', 1)) || 1)
    const perPage = Math.min(200, Math.max(1, Number(request.input('perPage', 60)) || 60))

    const query = Card.query().withCount('copies', (sub) => sub.as('owned'))
    if (q) query.whereILike('name', `%${q}%`)
    if (set) query.where('set_id', set)
    if (rarity) query.where('rarity', rarity)
    if (type) query.where('type', type)
    if (faction) query.where('faction', faction)
    if (owned === 'yes') query.has('copies')
    if (owned === 'no') query.doesntHave('copies')

    const result = await query
      .orderBy('set_id')
      .orderByRaw('collector_number is null, collector_number')
      .orderBy('name')
      .paginate(page, perPage)

    return {
      meta: result.getMeta(),
      data: result.all().map((c) => ({ ...c.toApi(), owned: Number(c.$extras.owned) })),
    }
  }

  /**
   * Valeurs distinctes pour les filtres
   */
  async filters({}: HttpContext) {
    const distinct = async (column: string) => {
      const rows = await db.from('cards').distinct(column).whereNotNull(column).orderBy(column)
      return rows.map((row) => row[column] as string)
    }
    return {
      rarities: await distinct('rarity'),
      types: await distinct('type'),
      factions: await distinct('faction'),
    }
  }

  async show({ params, response }: HttpContext) {
    const card = await Card.query().where('id', params.id).preload('set').first()
    if (!card) return response.notFound({ message: 'Carte introuvable' })

    const copies = await CardCopy.query()
      .where('card_id', card.id)
      .preload('storageLocation')
      .preload('decklist')
      .orderBy('id')

    const decklists = await DecklistEntry.query().where('card_id', card.id).preload('decklist')

    return {
      ...card.toApi(),
      set: { id: card.set.id, name: card.set.name },
      owned: copies.length,
      copies: copies.map((c) => c.toApi()),
      decklists: decklists.map((e) => ({
        id: e.decklist.id,
        name: e.decklist.name,
        quantity: e.quantity,
        assigned: copies.filter((c) => c.decklistId === e.decklistId).length,
      })),
    }
  }
}
