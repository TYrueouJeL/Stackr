import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export interface EventDetails {
  foil?: boolean
  condition?: string
  language?: string
  storage?: string | null
  decklist?: string | null
}

/** Note un ajout ou un retrait d'exemplaires dans l'historique de l'utilisateur */
export async function logCollectionEvent(
  event: {
    userId: number
    cardId: string
    action: 'added' | 'removed'
    quantity: number
    details?: EventDetails
  },
  client: TransactionClientContract | typeof db = db
) {
  await client.table('collection_events').insert({
    user_id: event.userId,
    card_id: event.cardId,
    action: event.action,
    quantity: event.quantity,
    details: event.details ? JSON.stringify(event.details) : null,
    created_at: DateTime.utc().toSQL({ includeOffset: false }),
  })
}
