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
      .withCount('copies', (q) => q.as('copies_count'))
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
    // Aperçu : quelques cartes tirées au hasard parmi celles du rangement
    const preview = async (locationId: number | null) => {
      const q = db
        .from('card_copies as cc')
        .join('cards as c', 'c.id', 'cc.card_id')
        .where('cc.user_id', userId)
        .whereNotNull('c.thumbnail_url')
        .groupBy('c.id', 'c.thumbnail_url', 'c.name')
        .orderByRaw('RANDOM()')
        .limit(3)
        .select('c.thumbnail_url', 'c.name')
      if (locationId === null) q.whereNull('cc.storage_location_id')
      else q.where('cc.storage_location_id', locationId)
      const rows = await q
      return rows.map((r) => ({ name: r.name as string, imageUrl: r.thumbnail_url as string }))
    }
    const previews = await Promise.all(locations.map((l) => preview(l.id)))
    return {
      unassignedPreview: await preview(null),
      locations: locations.map((l, i) => ({
        ...this.serialize(l),
        copies: Number(l.$extras.copies_count ?? 0),
        preview: previews[i],
        decklists: decks
          .filter((d) => d.storage_location_id === l.id)
          .map((d) => ({ id: d.id, name: d.name })),
      })),
      unassigned: Number(unassigned[0].$extras.total),
    }
  }

  async store({ auth, request, response }: HttpContext) {
    const data = this.withLayout(await request.validateUsing(storageLocationValidator))
    const location = await StorageLocation.create({ ...data, userId: auth.getUserOrFail().id })
    return response.created(this.serialize(location))
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
      ...this.serialize(location),
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
    const data = await request.validateUsing(storageLocationValidator)
    location.merge(
      this.withLayout({
        ...data,
        kind: data.kind ?? (location.kind as (typeof data)['kind']),
        pocketsPerPage:
          data.pocketsPerPage !== undefined ? data.pocketsPerPage : location.pocketsPerPage,
        pageCount: data.pageCount !== undefined ? data.pageCount : location.pageCount,
      })
    )
    await location.save()

    // Les pochettes qui n'existent plus (classeur réduit ou changé de type) sont vidées
    const outOfRange = db.from('card_copies').where('storage_location_id', location.id)
    if (location.kind !== 'binder') outOfRange.whereNotNull('binder_page')
    else {
      outOfRange.where((q) =>
        q
          .where('binder_page', '>', location.pageCount ?? 0)
          .orWhere('binder_slot', '>', location.pocketsPerPage ?? 0)
      )
    }
    await outOfRange.update({ binder_page: null, binder_slot: null })
    return this.serialize(location)
  }

  /**
   * Supprime le rangement ; ses exemplaires deviennent "sans rangement"
   */
  async destroy({ auth, params, response }: HttpContext) {
    const location = await this.find(auth.getUserOrFail().id, params.id)
    await CardCopy.query()
      .where('storage_location_id', location.id)
      .update({ storage_location_id: null, binder_page: null, binder_slot: null })
    await db.from('card_copies').where('previous_storage_location_id', location.id).update({
      previous_storage_location_id: null,
      previous_binder_page: null,
      previous_binder_slot: null,
    })
    await db
      .from('decklists')
      .where('storage_location_id', location.id)
      .update({ storage_location_id: null })
    await location.delete()
    return response.noContent()
  }

  /** Un classeur a toujours une mise en page (9 pochettes et 10 pages par défaut) */
  private withLayout<
    T extends { kind?: string; pocketsPerPage?: number | null; pageCount?: number | null },
  >(data: T): T {
    if (data.kind === 'binder') {
      return { ...data, pocketsPerPage: data.pocketsPerPage ?? 9, pageCount: data.pageCount ?? 10 }
    }
    return { ...data, pocketsPerPage: null, pageCount: null }
  }

  private serialize(l: StorageLocation) {
    return {
      id: l.id,
      name: l.name,
      description: l.description,
      kind: l.kind,
      pocketsPerPage: l.pocketsPerPage,
      pageCount: l.pageCount,
    }
  }

  private find(userId: number, id: unknown) {
    return StorageLocation.query().where({ id, user_id: userId }).firstOrFail()
  }
}
