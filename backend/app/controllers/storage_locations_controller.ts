import db from '@adonisjs/lucid/services/db'
import type { HttpContext } from '@adonisjs/core/http'
import StorageLocation from '#models/storage_location'
import CardCopy from '#models/card_copy'
import { storageLocationValidator } from '#validators/stock'

export default class StorageLocationsController {
  async index({ auth }: HttpContext) {
    const userId = auth.getUserOrFail().id
    const locations = await StorageLocation.query()
      .where('user_id', userId)
      .withCount('copies', (q) => q.as('copies'))
      .orderBy('name')
    const unassigned = await CardCopy.query()
      .where('user_id', userId)
      .whereNull('storage_location_id')
      .count('* as total')
    const decks = await db
      .from('decklists')
      .where('user_id', userId)
      .whereNotNull('storage_location_id')
      .select('id', 'name', 'storage_location_id')
      .orderBy('name')
    return {
      locations: locations.map((l) => ({
        id: l.id,
        name: l.name,
        description: l.description,
        copies: Number(l.$extras.copies),
        decklists: decks
          .filter((d) => d.storage_location_id === l.id)
          .map((d) => ({ id: d.id, name: d.name })),
      })),
      unassigned: Number(unassigned[0].$extras.total),
    }
  }

  async store({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(storageLocationValidator)
    const location = await StorageLocation.create({ ...data, userId: auth.getUserOrFail().id })
    return response.created(location)
  }

  async show({ auth, params }: HttpContext) {
    const location = await this.find(auth.getUserOrFail().id, params.id)
    const copies = await CardCopy.query()
      .where('storage_location_id', location.id)
      .preload('card')
      .preload('decklist')
      .orderBy('card_id')
      .orderBy('id')
    return {
      id: location.id,
      name: location.name,
      description: location.description,
      decklists: await db
        .from('decklists')
        .where('storage_location_id', location.id)
        .select('id', 'name')
        .orderBy('name'),
      copies: copies.map((c) => c.toApi()),
    }
  }

  async update({ auth, params, request }: HttpContext) {
    const location = await this.find(auth.getUserOrFail().id, params.id)
    location.merge(await request.validateUsing(storageLocationValidator))
    await location.save()
    return location
  }

  /**
   * Supprime le rangement ; ses exemplaires deviennent "sans rangement"
   */
  async destroy({ auth, params, response }: HttpContext) {
    const location = await this.find(auth.getUserOrFail().id, params.id)
    await CardCopy.query()
      .where('storage_location_id', location.id)
      .update({ storage_location_id: null })
    await db
      .from('card_copies')
      .where('previous_storage_location_id', location.id)
      .update({ previous_storage_location_id: null })
    await db
      .from('decklists')
      .where('storage_location_id', location.id)
      .update({ storage_location_id: null })
    await location.delete()
    return response.noContent()
  }

  private find(userId: number, id: unknown) {
    return StorageLocation.query().where({ id, user_id: userId }).firstOrFail()
  }
}
