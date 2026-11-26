import type { HttpContext } from '@adonisjs/core/http'
import StorageLocation from '#models/storage_location'
import CardCopy from '#models/card_copy'
import { storageLocationValidator } from '#validators/stock'

export default class StorageLocationsController {
  async index({}: HttpContext) {
    const locations = await StorageLocation.query()
      .withCount('copies', (q) => q.as('copies'))
      .orderBy('name')
    const unassigned = await CardCopy.query().whereNull('storage_location_id').count('* as total')
    return {
      locations: locations.map((l) => ({
        id: l.id,
        name: l.name,
        description: l.description,
        copies: Number(l.$extras.copies),
      })),
      unassigned: Number(unassigned[0].$extras.total),
    }
  }

  async store({ request, response }: HttpContext) {
    const location = await StorageLocation.create(
      await request.validateUsing(storageLocationValidator)
    )
    return response.created(location)
  }

  async show({ params }: HttpContext) {
    const location = await StorageLocation.findOrFail(params.id)
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
      copies: copies.map((c) => c.toApi()),
    }
  }

  async update({ params, request }: HttpContext) {
    const location = await StorageLocation.findOrFail(params.id)
    location.merge(await request.validateUsing(storageLocationValidator))
    await location.save()
    return location
  }

  /**
   * Supprime le rangement ; ses exemplaires deviennent "sans rangement"
   */
  async destroy({ params, response }: HttpContext) {
    const location = await StorageLocation.findOrFail(params.id)
    await CardCopy.query()
      .where('storage_location_id', location.id)
      .update({ storage_location_id: null })
    await location.delete()
    return response.noContent()
  }
}
