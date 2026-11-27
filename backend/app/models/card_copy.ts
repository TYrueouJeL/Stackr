import { CardCopySchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Card from '#models/card'
import StorageLocation from '#models/storage_location'
import Decklist from '#models/decklist'

export default class CardCopy extends CardCopySchema {
  static table = 'card_copies'

  @belongsTo(() => Card)
  declare card: BelongsTo<typeof Card>

  @belongsTo(() => StorageLocation)
  declare storageLocation: BelongsTo<typeof StorageLocation>

  @belongsTo(() => Decklist)
  declare decklist: BelongsTo<typeof Decklist>

  toApi() {
    return {
      id: this.id,
      cardId: this.cardId,
      storageLocationId: this.storageLocationId,
      decklistId: this.decklistId,
      binderPage: this.binderPage,
      binderSlot: this.binderSlot,
      foil: Boolean(this.foil),
      condition: this.condition,
      language: this.language,
      notes: this.notes,
      createdAt: this.createdAt,
      card: this.$preloaded.card ? this.card.toApi() : undefined,
      storageLocation: this.$preloaded.storageLocation
        ? this.storageLocation && { id: this.storageLocation.id, name: this.storageLocation.name }
        : undefined,
      decklist: this.$preloaded.decklist
        ? this.decklist && { id: this.decklist.id, name: this.decklist.name }
        : undefined,
    }
  }
}
