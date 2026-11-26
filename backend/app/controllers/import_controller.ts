import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import { RiftboundApiError } from '#services/riftbound_api'
import importContent from '#services/card_importer'
import { type ContentSource, defaultSource, fetchContent } from '#services/content_source'
import { importValidator } from '#validators/stock'

export default class ImportController {
  async status({ auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const [sets, cards, copies] = await Promise.all([
      db.from('card_sets').count('* as total'),
      db.from('cards').count('* as total'),
      db.from('card_copies').where('user_id', user.id).count('* as total'),
    ])
    const last = await db.from('cards').max('updated_at as last').first()
    return {
      sets: Number(sets[0].total),
      cards: Number(cards[0].total),
      copies: Number(copies[0].total),
      lastImport: last?.last ?? null,
      source: defaultSource(),
      apiKeyConfigured: Boolean(env.get('RIOT_API_KEY')),
      canImport: Boolean(user.isAdmin),
    }
  }

  /**
   * Met à jour le catalogue commun : réservé aux administrateurs
   */
  async store({ auth, request, response }: HttpContext) {
    if (!auth.getUserOrFail().isAdmin) {
      return response.forbidden({
        message: 'Seul un administrateur peut mettre à jour le catalogue',
      })
    }
    const { locale, source } = await request.validateUsing(importValidator)
    try {
      const content = await fetchContent(
        (source ?? defaultSource()) as ContentSource,
        locale ?? 'en'
      )
      return await importContent(content)
    } catch (error) {
      if (error instanceof RiftboundApiError || error instanceof Error) {
        return response.status(502).send({ message: error.message })
      }
      throw error
    }
  }
}
