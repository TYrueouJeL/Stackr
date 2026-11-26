import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Decklist from '#models/decklist'
import DecklistEntry from '#models/decklist_entry'
import CardCopy from '#models/card_copy'
import Card from '#models/card'
import {
  decklistEntryValidator,
  decklistImportValidator,
  decklistValidator,
} from '#validators/stock'

export default class DecklistsController {
  async index({}: HttpContext) {
    const decklists = await Decklist.query()
      .withAggregate('entries', (q) => q.sum('quantity').as('total_cards'))
      .withCount('copies', (q) => q.as('assigned'))
      .orderBy('name')
    return decklists.map((d) => {
      const total = Number(d.$extras.total_cards ?? 0)
      const assigned = Number(d.$extras.assigned ?? 0)
      return {
        id: d.id,
        name: d.name,
        description: d.description,
        totalCards: total,
        assignedCopies: assigned,
        complete: total > 0 && assigned >= total,
      }
    })
  }

  async store({ request, response }: HttpContext) {
    const decklist = await Decklist.create(await request.validateUsing(decklistValidator))
    return response.created(decklist)
  }

  /**
   * Détail : pour chaque carte de la liste, combien sont demandées, quels
   * exemplaires sont affectés et combien d'exemplaires libres sont disponibles
   */
  async show({ params }: HttpContext) {
    const decklist = await Decklist.findOrFail(params.id)
    const entries = await DecklistEntry.query().where('decklist_id', decklist.id).preload('card')
    const copies = await CardCopy.query()
      .where('decklist_id', decklist.id)
      .preload('storageLocation')
      .preload('card')
      .orderBy('id')

    const cardIds = [...new Set([...entries.map((e) => e.cardId), ...copies.map((c) => c.cardId)])]
    const freeRows = cardIds.length
      ? await db
          .from('card_copies')
          .select('card_id')
          .count('* as free')
          .whereIn('card_id', cardIds)
          .whereNull('decklist_id')
          .groupBy('card_id')
      : []
    const free = new Map(freeRows.map((r) => [r.card_id as string, Number(r.free)]))

    const rows = entries.map((entry) => {
      const assigned = copies.filter((c) => c.cardId === entry.cardId)
      return {
        card: entry.card.toApi(),
        quantity: entry.quantity,
        assigned: assigned.map((c) => c.toApi()),
        missing: Math.max(0, entry.quantity - assigned.length),
        available: free.get(entry.cardId) ?? 0,
      }
    })

    // Exemplaires affectés à la decklist mais absents de la liste
    const extra = copies.filter((c) => !entries.some((e) => e.cardId === c.cardId))

    rows.sort(
      (a, b) =>
        (a.card.type ?? '').localeCompare(b.card.type ?? '') ||
        a.card.name.localeCompare(b.card.name)
    )

    const totalCards = rows.reduce((s, r) => s + r.quantity, 0)
    const assignedCount = rows.reduce((s, r) => s + Math.min(r.quantity, r.assigned.length), 0)
    return {
      id: decklist.id,
      name: decklist.name,
      description: decklist.description,
      totalCards,
      assignedCopies: assignedCount,
      missingCards: rows.reduce((s, r) => s + r.missing, 0),
      entries: rows,
      extraCopies: extra.map((c) => c.toApi()),
    }
  }

  async update({ params, request }: HttpContext) {
    const decklist = await Decklist.findOrFail(params.id)
    decklist.merge(await request.validateUsing(decklistValidator))
    await decklist.save()
    return decklist
  }

  /**
   * Supprime la decklist ; ses exemplaires redeviennent libres
   */
  async destroy({ params, response }: HttpContext) {
    const decklist = await Decklist.findOrFail(params.id)
    await db.from('card_copies').where('decklist_id', decklist.id).update({ decklist_id: null })
    await decklist.delete()
    return response.noContent()
  }

  /**
   * Ajoute/modifie une carte de la liste (quantity = 0 la retire)
   */
  async setEntry({ params, request }: HttpContext) {
    const decklist = await Decklist.findOrFail(params.id)
    const { cardId, quantity } = await request.validateUsing(decklistEntryValidator)
    if (quantity === 0) {
      await DecklistEntry.query().where({ decklist_id: decklist.id, card_id: cardId }).delete()
      return { cardId, quantity: 0 }
    }
    const entry = await DecklistEntry.updateOrCreate(
      { decklistId: decklist.id, cardId },
      { quantity }
    )
    return { cardId: entry.cardId, quantity: entry.quantity }
  }

  /**
   * Importe une liste texte ("3 Nom de carte" ou "3x ID") dans la decklist
   */
  async importText({ params, request }: HttpContext) {
    const decklist = await Decklist.findOrFail(params.id)
    const { text, replace } = await request.validateUsing(decklistImportValidator)

    const wanted = new Map<string, number>()
    const notFound: string[] = []
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#') || line.startsWith('//')) continue
      const match = line.match(/^(\d+)\s*x?\s+(.+)$/i)
      const quantity = match ? Number(match[1]) : 1
      const label = (match ? match[2] : line).trim()
      const card =
        (await Card.find(label)) ??
        (await Card.query()
          .whereRaw('lower(name) = ?', [label.toLowerCase()])
          .orderBy('id')
          .first())
      if (!card) {
        notFound.push(line)
        continue
      }
      wanted.set(card.id, (wanted.get(card.id) ?? 0) + quantity)
    }

    await db.transaction(async (trx) => {
      if (replace) await trx.from('decklist_entries').where('decklist_id', decklist.id).delete()
      for (const [cardId, quantity] of wanted) {
        await DecklistEntry.updateOrCreate(
          { decklistId: decklist.id, cardId },
          { quantity },
          { client: trx }
        )
      }
    })

    return { imported: wanted.size, notFound }
  }

  /**
   * Affecte automatiquement des exemplaires libres aux cartes manquantes
   */
  async autoAssign({ params }: HttpContext) {
    const decklist = await Decklist.findOrFail(params.id)
    const entries = await DecklistEntry.query().where('decklist_id', decklist.id)
    let assigned = 0

    await db.transaction(async (trx) => {
      for (const entry of entries) {
        const already = await trx
          .from('card_copies')
          .where({ decklist_id: decklist.id, card_id: entry.cardId })
          .count('* as total')
        const missing = entry.quantity - Number(already[0].total)
        if (missing <= 0) continue
        const freeIds = await trx
          .from('card_copies')
          .where('card_id', entry.cardId)
          .whereNull('decklist_id')
          .orderBy('foil', 'asc')
          .orderBy('id', 'asc')
          .limit(missing)
          .select('id')
        if (!freeIds.length) continue
        await trx
          .from('card_copies')
          .whereIn(
            'id',
            freeIds.map((r) => r.id)
          )
          .update({
            decklist_id: decklist.id,
            updated_at: DateTime.utc().toSQL({ includeOffset: false }),
          })
        assigned += freeIds.length
      }
    })

    return { assigned }
  }

  /**
   * Libère tous les exemplaires affectés à la decklist
   */
  async release({ params }: HttpContext) {
    const decklist = await Decklist.findOrFail(params.id)
    const released = await db
      .from('card_copies')
      .where('decklist_id', decklist.id)
      .update({ decklist_id: null, updated_at: DateTime.utc().toSQL({ includeOffset: false }) })
    return { released: Array.isArray(released) ? released.length : released }
  }

  async exportText({ params, response }: HttpContext) {
    const decklist = await Decklist.findOrFail(params.id)
    const entries = await DecklistEntry.query().where('decklist_id', decklist.id).preload('card')
    const text = entries
      .sort((a, b) => a.card.name.localeCompare(b.card.name))
      .map((e) => `${e.quantity} ${e.card.name}`)
      .join('\n')
    return response.header('content-type', 'text/plain; charset=utf-8').send(text)
  }
}
