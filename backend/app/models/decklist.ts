import { DecklistSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import StorageLocation from '#models/storage_location'
import DecklistEntry from '#models/decklist_entry'
import CardCopy from '#models/card_copy'

export default class Decklist extends DecklistSchema {
  static table = 'decklists'

  @hasMany(() => DecklistEntry)
  declare entries: HasMany<typeof DecklistEntry>

  @hasMany(() => CardCopy)
  declare copies: HasMany<typeof CardCopy>

  @belongsTo(() => StorageLocation)
  declare storageLocation: BelongsTo<typeof StorageLocation>
}
