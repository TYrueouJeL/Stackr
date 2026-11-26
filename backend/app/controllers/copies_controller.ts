import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import CardCopy from '#models/card_copy'
import { assertOwnedTargets } from '#services/ownership'
import { leaveDeckBox, storeInDeckBox } from '#services/deck_storage'
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
      // Sans rangement choisi, un exemplaire ajouté directement dans un deck va dans sa deck box
      if (data.decklistId && !data.storageLocationId) {
        await storeInDeckBox(
          created.map((c) => c.id),
          trx
        )
        for (const c of created) await c.refresh()
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
    await this.moveCopies([copy.id], changes)
    await copy.refresh()
    const { storageLocationId, decklistId, ...rest } = changes
    copy.merge(rest)
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

    const owned = await db
      .from('card_copies')
      .whereIn('id', ids)
      .where('user_id', userId)
      .select('id')
    await this.moveCopies(
      owned.map((r) => r.id),
      changes
    )
    return { updated: owned.length }
  }

  /**
   * Change le rangement et/ou la decklist d'exemplaires en gardant la deck box cohérente :
   * entrer dans un deck qui a un rangement y range l'exemplaire, en sortir le remet à sa place
   * (sauf si un rangement est donné explicitement).
   */
  private async moveCopies(
    ids: number[],
    changes: { storageLocationId?: number | null; decklistId?: number | null }
  ) {
    if (!ids.length) return
    const now = () => DateTime.utc().toSQL({ includeOffset: false })
    const explicitStorage = changes.storageLocationId !== undefined
    await db.transaction(async (trx) => {
      if (changes.decklistId !== undefined) {
        const leaving = await trx
          .from('card_copies')
          .whereIn('id', ids)
          .whereNotNull('decklist_id')
          .where((q) =>
            changes.decklistId === null
              ? q
              : q.whereNot('decklist_id', changes.decklistId as number)
          )
          .select('id')
        if (!explicitStorage) {
          await leaveDeckBox(
            leaving.map((r) => r.id),
            trx
          )
        }
        await trx
          .from('card_copies')
          .whereIn('id', ids)
          .update({ decklist_id: changes.decklistId, updated_at: now() })
      }
      if (explicitStorage) {
        await trx.from('card_copies').whereIn('id', ids).update({
          storage_location_id: changes.storageLocationId,
          previous_storage_location_id: null,
          updated_at: now(),
        })
      } else if (changes.decklistId) {
        await storeInDeckBox(ids, trx)
      }
    })
  }

  async destroy({ auth, params, response }: HttpContext) {
    const userId = auth.getUserOrFail().id
    const copy = await CardCopy.query().where({ id: params.id, user_id: userId }).firstOrFail()
    await copy.delete()
    return response.noContent()
  }
}
