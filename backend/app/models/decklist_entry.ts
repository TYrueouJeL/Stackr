import { DecklistEntrySchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Card from '#models/card'
import Decklist from '#models/decklist'

export default class DecklistEntry extends DecklistEntrySchema {
  static table = 'decklist_entries'

  @belongsTo(() => Card)
  declare card: BelongsTo<typeof Card>

  @belongsTo(() => Decklist)
  declare decklist: BelongsTo<typeof Decklist>
}
