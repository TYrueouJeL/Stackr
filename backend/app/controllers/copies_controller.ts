import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import CardCopy from '#models/card_copy'
import { assertOwnedTargets } from '#services/ownership'
import {
  bulkUpdateCopiesValidator,
  createCopiesValidator,
  updateCopyValidator,
} from '#validators/stock'

export default class CopiesController {
  /**
   * Liste des exemplaires. Filtres : cardId, storageLocationId (ou "none"), decklistId (ou "none")
   */
  async index({ auth, request }: HttpContext) {
    const userId = auth.getUserOrFail().id
    const { cardId, storageLocationId, decklistId } = request.qs()
    const query = CardCopy.query()
      .where('user_id', userId)
      .preload('card')
      .preload('storageLocation')
      .preload('decklist')
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
  async store({ auth, request, response }: HttpContext) {
    const userId = auth.getUserOrFail().id
    const { quantity = 1, ...data } = await request.validateUsing(createCopiesValidator)
    await assertOwnedTargets(userId, data)

    const copies = await db.transaction(async (trx) => {
      const created: CardCopy[] = []
      for (let i = 0; i < quantity; i++) {
        created.push(
          await CardCopy.create(
            {
              userId,
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

  async update({ auth, params, request }: HttpContext) {
    const userId = auth.getUserOrFail().id
    const copy = await CardCopy.query().where({ id: params.id, user_id: userId }).firstOrFail()
    const changes = await request.validateUsing(updateCopyValidator)
    await assertOwnedTargets(userId, changes)
    copy.merge(changes)
    await copy.save()
    return copy.toApi()
  }

  /**
   * Déplace plusieurs exemplaires d'un coup (rangement et/ou decklist)
   */
  async bulkUpdate({ auth, request }: HttpContext) {
    const userId = auth.getUserOrFail().id
    const { ids, ...changes } = await request.validateUsing(bulkUpdateCopiesValidator)
    await assertOwnedTargets(userId, changes)

    const update: Record<string, number | null> = {}
    if (changes.storageLocationId !== undefined)
      update.storage_location_id = changes.storageLocationId
    if (changes.decklistId !== undefined) update.decklist_id = changes.decklistId
    if (Object.keys(update).length) {
      await db
        .from('card_copies')
        .whereIn('id', ids)
        .where('user_id', userId)
        .update({ ...update, updated_at: DateTime.utc().toSQL({ includeOffset: false }) })
    }
    return { updated: ids.length }
  }

  async destroy({ auth, params, response }: HttpContext) {
    const userId = auth.getUserOrFail().id
    const copy = await CardCopy.query().where({ id: params.id, user_id: userId }).firstOrFail()
    await copy.delete()
    return response.noContent()
  }
}
