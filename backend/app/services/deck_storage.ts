import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

type Client = TransactionClientContract | typeof db

const now = () => DateTime.utc().toSQL({ includeOffset: false })

/**
 * Range dans la deck box les exemplaires qui viennent d'être affectés à une decklist
 * ayant un rangement. Le rangement d'origine est mémorisé pour pouvoir l'y remettre.
 */
export async function storeInDeckBox(copyIds: number[], client: Client = db) {
  if (!copyIds.length) return
  const rows = await client
    .from('card_copies as c')
    .join('decklists as d', 'd.id', 'c.decklist_id')
    .whereIn('c.id', copyIds)
    .whereNotNull('d.storage_location_id')
    .select('c.id', 'c.storage_location_id as current', 'd.storage_location_id as box')
  for (const r of rows) {
    if (r.current === r.box) continue
    await client.from('card_copies').where('id', r.id).update({
      storage_location_id: r.box,
      previous_storage_location_id: r.current,
      updated_at: now(),
    })
  }
}

/**
 * À appeler AVANT de retirer des exemplaires de leur decklist : ceux qui sont encore
 * dans la deck box retournent dans leur rangement d'origine.
 */
export async function leaveDeckBox(copyIds: number[], client: Client = db) {
  if (!copyIds.length) return
  const rows = await client
    .from('card_copies as c')
    .join('decklists as d', 'd.id', 'c.decklist_id')
    .whereIn('c.id', copyIds)
    .whereNotNull('d.storage_location_id')
    .whereRaw('c.storage_location_id = d.storage_location_id')
    .select('c.id', 'c.previous_storage_location_id as previous')
  for (const r of rows) {
    await client.from('card_copies').where('id', r.id).update({
      storage_location_id: r.previous,
      previous_storage_location_id: null,
      updated_at: now(),
    })
  }
}

/**
 * Le rangement de la decklist change : ses exemplaires qui étaient dans l'ancienne
 * deck box (ou sans rangement) passent dans la nouvelle ; sans nouvelle box, ils
 * retournent à leur rangement d'origine.
 */
export async function moveDeckBox(
  decklistId: number,
  oldBox: number | null,
  newBox: number | null,
  client: Client = db
) {
  if (oldBox === newBox) return
  const copies = await client
    .from('card_copies')
    .where('decklist_id', decklistId)
    .select('id', 'storage_location_id as current', 'previous_storage_location_id as previous')
  for (const c of copies) {
    const inOldBox = oldBox !== null && c.current === oldBox
    if (newBox === null) {
      if (inOldBox) {
        await client.from('card_copies').where('id', c.id).update({
          storage_location_id: c.previous,
          previous_storage_location_id: null,
          updated_at: now(),
        })
      }
      continue
    }
    if (c.current === newBox) continue
    await client
      .from('card_copies')
      .where('id', c.id)
      .update({
        storage_location_id: newBox,
        previous_storage_location_id: inOldBox ? c.previous : c.current,
        updated_at: now(),
      })
  }
}
