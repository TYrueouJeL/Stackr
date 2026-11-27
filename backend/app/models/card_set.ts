import { CardSetSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Card from '#models/card'

export default class CardSet extends CardSetSchema {
  static table = 'card_sets'
  static selfAssignPrimaryKey = true

  @hasMany(() => Card, { foreignKey: 'setId' })
  declare cards: HasMany<typeof Card>
}
