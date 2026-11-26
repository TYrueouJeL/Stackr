import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import RiftboundApi, { RiftboundApiError } from '#services/riftbound_api'
import importContent from '#services/card_importer'
import { importValidator } from '#validators/stock'

export default class ImportController {
  async status({}: HttpContext) {
    const [sets, cards, copies] = await Promise.all([
      db.from('card_sets').count('* as total'),
      db.from('cards').count('* as total'),
      db.from('card_copies').count('* as total'),
    ])
    const last = await db.from('cards').max('updated_at as last').first()
    return {
      sets: Number(sets[0].total),
      cards: Number(cards[0].total),
      copies: Number(copies[0].total),
      lastImport: last?.last ?? null,
      apiKeyConfigured: Boolean(new RiftboundApi()['apiKey']),
    }
  }

  async store({ request, response }: HttpContext) {
    const { locale } = await request.validateUsing(importValidator)
    try {
      const content = await new RiftboundApi().fetchContent(locale ?? 'en')
      return await importContent(content)
    } catch (error) {
      if (error instanceof RiftboundApiError) {
        return response.status(502).send({ message: error.message, status: error.status })
      }
      throw error
    }
  }
}
