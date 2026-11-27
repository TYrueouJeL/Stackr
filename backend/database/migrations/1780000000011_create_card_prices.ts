import { BaseSchema } from '@adonisjs/lucid/schema'

/** Prix Cardmarket du jour (guide des prix public), une ligne par carte */
export default class extends BaseSchema {
  protected tableName = 'card_prices'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('card_id').primary()
      table.integer('cardmarket_id').notNullable()
      table.decimal('trend', 10, 2).nullable()
      table.decimal('low', 10, 2).nullable()
      table.decimal('avg7', 10, 2).nullable()
      table.decimal('avg30', 10, 2).nullable()
      table.decimal('trend_foil', 10, 2).nullable()
      table.decimal('low_foil', 10, 2).nullable()
      table.decimal('avg7_foil', 10, 2).nullable()
      table.string('matched_by').notNullable() // openrift | name
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
