import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import CardCopy from '#models/card_copy'
import { assertOwnedTargets } from '#services/ownership'
import { leaveDeckBox, storeInDeckBox } from '#services/deck_storage'
import { logCollectionEvent } from '#services/collection_history'
import { Exception } from '@adonisjs/core/exceptions'
import {
  binderSlotValidator,
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
      await logCollectionEvent(
        {
          userId,
          cardId: data.cardId,
          action: 'added',
          quantity,
          details: await this.describe(created[0], trx),
        },
        trx
      )
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
        // Changer de rangement fait sortir de la pochette, sauf si on reste dans le même classeur
        await trx
          .from('card_copies')
          .whereIn('id', ids)
          .where((q) =>
            changes.storageLocationId === null
              ? q.whereNotNull('storage_location_id')
              : q
                  .whereNull('storage_location_id')
                  .orWhereNot('storage_location_id', changes.storageLocationId as number)
          )
          .update({ binder_page: null, binder_slot: null })
        await trx.from('card_copies').whereIn('id', ids).update({
          storage_location_id: changes.storageLocationId,
          previous_storage_location_id: null,
          previous_binder_page: null,
          previous_binder_slot: null,
          updated_at: now(),
        })
      } else if (changes.decklistId) {
        await storeInDeckBox(ids, trx)
      }
    })
  }

  /**
   * Place un exemplaire de classeur dans une pochette (page, emplacement), ou l'en retire
   * avec page/slot à null. Si la pochette est occupée, les deux exemplaires échangent leur place.
   */
  async placeInSlot({ auth, params, request }: HttpContext) {
    const userId = auth.getUserOrFail().id
    const copy = await CardCopy.query()
      .where({ id: params.id, user_id: userId })
      .preload('storageLocation')
      .firstOrFail()
    const { page, slot } = await request.validateUsing(binderSlotValidator)
    const binder = copy.storageLocation
    if (!binder || binder.kind !== 'binder') {
      throw new Exception("Cet exemplaire n'est pas dans un classeur", { status: 422 })
    }
    if ((page === null) !== (slot === null)) {
      throw new Exception('Indique la page et la pochette', { status: 422 })
    }
    if (page !== null && slot !== null) {
      if (slot > (binder.pocketsPerPage ?? 9) || page > (binder.pageCount ?? 1)) {
        throw new Exception("Cette pochette n'existe pas dans le classeur", { status: 422 })
      }
    }

    await db.transaction(async (trx) => {
      if (page !== null && slot !== null) {
        await trx
          .from('card_copies')
          .where({ storage_location_id: binder.id, binder_page: page, binder_slot: slot })
          .whereNot('id', copy.id)
          .update({ binder_page: copy.binderPage, binder_slot: copy.binderSlot })
      }
      await trx
        .from('card_copies')
        .where('id', copy.id)
        .update({
          binder_page: page,
          binder_slot: slot,
          updated_at: DateTime.utc().toSQL({ includeOffset: false }),
        })
    })
    await copy.refresh()
    return copy.toApi()
  }

  async destroy({ auth, params, response }: HttpContext) {
    const userId = auth.getUserOrFail().id
    const copy = await CardCopy.query().where({ id: params.id, user_id: userId }).firstOrFail()
    await db.transaction(async (trx) => {
      const details = await this.describe(copy, trx)
      copy.useTransaction(trx)
      await copy.delete()
      await logCollectionEvent(
        { userId, cardId: copy.cardId, action: 'removed', quantity: 1, details },
        trx
      )
    })
    return response.noContent()
  }

  /** Résumé d'un exemplaire pour l'historique (les noms sont figés au moment de l'action) */
  private async describe(copy: CardCopy, client: any) {
    const storage = copy.storageLocationId
      ? await client.from('storage_locations').where('id', copy.storageLocationId).first()
      : null
    const deck = copy.decklistId
      ? await client.from('decklists').where('id', copy.decklistId).first()
      : null
    return {
      foil: Boolean(copy.foil),
      condition: copy.condition,
      language: copy.language,
      storage: storage?.name ?? null,
      decklist: deck?.name ?? null,
    }
  }
}
