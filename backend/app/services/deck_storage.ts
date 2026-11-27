import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

type Client = TransactionClientContract | typeof db

const now = () => DateTime.utc().toSQL({ includeOffset: false })

interface CopyPlace {
  id: number
  current: number | null
  page: number | null
  slot: number | null
  previous: number | null
  previousPage: number | null
  previousSlot: number | null
}

const PLACE_COLUMNS = [
  'c.id',
  'c.storage_location_id as current',
  'c.binder_page as page',
  'c.binder_slot as slot',
  'c.previous_storage_location_id as previous',
  'c.previous_binder_page as previousPage',
  'c.previous_binder_slot as previousSlot',
]

/** Met l'exemplaire dans la box en mémorisant son rangement (et sa pochette) d'origine */
async function putInBox(copy: CopyPlace, box: number, client: Client, keepOrigin = false) {
  await client
    .from('card_copies')
    .where('id', copy.id)
    .update({
      storage_location_id: box,
      binder_page: null,
      binder_slot: null,
      previous_storage_location_id: keepOrigin ? copy.previous : copy.current,
      previous_binder_page: keepOrigin ? copy.previousPage : copy.page,
      previous_binder_slot: keepOrigin ? copy.previousSlot : copy.slot,
      updated_at: now(),
    })
}

/** Remet l'exemplaire dans son rangement d'origine, dans sa pochette si elle est encore libre */
async function returnHome(copy: CopyPlace, client: Client) {
  let page = copy.previousPage
  let slot = copy.previousSlot
  if (copy.previous !== null && page !== null && slot !== null) {
    const taken = await client
      .from('card_copies')
      .where({ storage_location_id: copy.previous, binder_page: page, binder_slot: slot })
      .whereNot('id', copy.id)
      .first()
    if (taken) page = slot = null
  } else {
    page = slot = null
  }
  await client.from('card_copies').where('id', copy.id).update({
    storage_location_id: copy.previous,
    binder_page: page,
    binder_slot: slot,
    previous_storage_location_id: null,
    previous_binder_page: null,
    previous_binder_slot: null,
    updated_at: now(),
  })
}

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
    .select(...PLACE_COLUMNS, 'd.storage_location_id as box')
  for (const r of rows) {
    if (r.current === r.box) continue
    await putInBox(r, r.box, client)
  }
}

/**
 * À appeler AVANT de retirer des exemplaires de leur decklist : ceux qui sont encore
 * dans la deck box retournent dans leur rangement (et leur pochette) d'origine.
 */
export async function leaveDeckBox(copyIds: number[], client: Client = db) {
  if (!copyIds.length) return
  const rows = await client
    .from('card_copies as c')
    .join('decklists as d', 'd.id', 'c.decklist_id')
    .whereIn('c.id', copyIds)
    .whereNotNull('d.storage_location_id')
    .whereRaw('c.storage_location_id = d.storage_location_id')
    .select(...PLACE_COLUMNS)
  for (const r of rows) await returnHome(r, client)
}

/**
 * Le rangement de la decklist change : ses exemplaires qui étaient dans l'ancienne
 * deck box (ou ailleurs) passent dans la nouvelle ; sans nouvelle box, ils
 * retournent à leur rangement d'origine.
 */
export async function moveDeckBox(
  decklistId: number,
  oldBox: number | null,
  newBox: number | null,
  client: Client = db
) {
  if (oldBox === newBox) return
  const copies: CopyPlace[] = await client
    .from('card_copies as c')
    .where('c.decklist_id', decklistId)
    .select(...PLACE_COLUMNS)
  for (const c of copies) {
    const inOldBox = oldBox !== null && c.current === oldBox
    if (newBox === null) {
      if (inOldBox) await returnHome(c, client)
      continue
    }
    if (c.current === newBox) continue
    await putInBox(c, newBox, client, inOldBox)
  }
}
