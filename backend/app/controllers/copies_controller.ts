import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import CardCopy from '#models/card_copy'
import {
  bulkUpdateCopiesValidator,
  createCopiesValidator,
  updateCopyValidator,
} from '#validators/stock'

export default class CopiesController {
  /**
   * Liste des exemplaires. Filtres : cardId, storageLocationId (ou "none"), decklistId (ou "none")
   */
  async index({ request }: HttpContext) {
    const { cardId, storageLocationId, decklistId } = request.qs()
    const query = CardCopy.query().preload('card').preload('storageLocation').preload('decklist')
    if (cardId) query.where('card_id', cardId)
    if (storageLocationId === 'none') query.whereNull('storage_location_id')
    else if (storageLocationId) query.where('storage_location_id', storageLocationId)
    if (decklistId === 'none') query.whereNull('decklist_id')
    else if (decklistId) query.where('decklist_id', decklistId)

    const copies = await query.orderBy('card_id').orderBy('id')
    return copies.map((c) => c.toApi())
  }

  /**
   * Ajoute un ou plusieurs exemplaires d'une carte
   */
  async store({ request, response }: HttpContext) {
    const { quantity = 1, ...data } = await request.validateUsing(createCopiesValidator)
    const copies = await db.transaction(async (trx) => {
      const created: CardCopy[] = []
      for (let i = 0; i < quantity; i++) {
        created.push(
          await CardCopy.create(
            {
              cardId: data.cardId,
              storageLocationId: data.storageLocationId ?? null,
              decklistId: data.decklistId ?? null,
              foil: data.foil ?? false,
              condition: data.condition ?? 'NM',
              language: data.language ?? 'fr',
              notes: data.notes ?? null,
            },
            { client: trx }
          )
        )
      }
      return created
    })
    return response.created(copies.map((c) => c.toApi()))
  }

  async update({ params, request }: HttpContext) {
    const copy = await CardCopy.findOrFail(params.id)
    copy.merge(await request.validateUsing(updateCopyValidator))
    await copy.save()
    return copy.toApi()
  }

  /**
   * Déplace plusieurs exemplaires d'un coup (rangement et/ou decklist)
   */
  async bulkUpdate({ request }: HttpContext) {
    const { ids, ...changes } = await request.validateUsing(bulkUpdateCopiesValidator)
    const update: Record<string, number | null> = {}
    if (changes.storageLocationId !== undefined)
      update.storage_location_id = changes.storageLocationId
    if (changes.decklistId !== undefined) update.decklist_id = changes.decklistId
    if (Object.keys(update).length) {
      await db
        .from('card_copies')
        .whereIn('id', ids)
        .update({ ...update, updated_at: DateTime.utc().toSQL({ includeOffset: false }) })
    }
    return { updated: ids.length }
  }

  async destroy({ params, response }: HttpContext) {
    const copy = await CardCopy.findOrFail(params.id)
    await copy.delete()
    return response.noContent()
  }
}
