import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'

/**
 * Vérifie que le rangement et la decklist ciblés appartiennent bien à l'utilisateur
 */
export async function assertOwnedTargets(
  userId: number,
  targets: { storageLocationId?: number | null; decklistId?: number | null }
) {
  if (targets.storageLocationId) {
    const found = await db
      .from('storage_locations')
      .where({ id: targets.storageLocationId, user_id: userId })
      .first()
    if (!found) throw new Exception('Rangement introuvable', { status: 404 })
  }
  if (targets.decklistId) {
    const found = await db
      .from('decklists')
      .where({ id: targets.decklistId, user_id: userId })
      .first()
    if (!found) throw new Exception('Decklist introuvable', { status: 404 })
  }
}
