import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class HistoryController {
  /**
   * Historique des ajouts et retraits, du plus récent au plus ancien.
   * Filtres : cardId, action (added|removed) ; pagination page/perPage.
   */
  async index({ auth, request }: HttpContext) {
    const userId = auth.getUserOrFail().id
    const page = Math.max(1, Number(request.input('page', 1)) || 1)
    const perPage = Math.min(200, Math.max(1, Number(request.input('perPage', 50)) || 50))
    const { cardId, action } = request.qs()

    const query = db
      .from('collection_events as e')
      .leftJoin('cards as c', 'c.id', 'e.card_id')
      .where('e.user_id', userId)
      .select(
        'e.id',
        'e.card_id',
        'e.action',
        'e.quantity',
        'e.details',
        'e.created_at',
        'c.name',
        'c.set_id',
        'c.collector_number',
        'c.thumbnail_url',
        'c.rarity'
      )
      .orderBy('e.created_at', 'desc')
      .orderBy('e.id', 'desc')
    if (cardId) query.where('e.card_id', cardId)
    if (action === 'added' || action === 'removed') query.where('e.action', action)

    const result = await query.paginate(page, perPage)
    const totals = await db
      .from('collection_events')
      .where('user_id', userId)
      .select('action')
      .sum('quantity as total')
      .groupBy('action')

    return {
      meta: result.getMeta(),
      totals: {
        added: 0,
        removed: 0,
        ...Object.fromEntries(totals.map((t) => [t.action, Number(t.total)])),
      },
      data: result.all().map((r) => ({
        id: r.id,
        action: r.action,
        quantity: r.quantity,
        // Stocké en UTC sans fuseau : on le renvoie en ISO pour que le navigateur affiche l'heure locale
        createdAt: `${String(r.created_at).replace(' ', 'T')}Z`,
        details: r.details ? JSON.parse(r.details) : {},
        card: {
          id: r.card_id,
          name: r.name ?? r.card_id,
          setId: r.set_id,
          collectorNumber: r.collector_number,
          thumbnailUrl: r.thumbnail_url,
          rarity: r.rarity,
        },
      })),
    }
  }
}
