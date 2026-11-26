import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'card_copies'

  async up() {
    // Un exemplaire physique d'une carte
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('card_id').notNullable().references('id').inTable('cards').onDelete('CASCADE')
      table
        .integer('storage_location_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('storage_locations')
        .onDelete('SET NULL')
      table
        .integer('decklist_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('decklists')
        .onDelete('SET NULL')
      table.boolean('foil').notNullable().defaultTo(false)
      table.string('condition').notNullable().defaultTo('NM')
      table.string('language').notNullable().defaultTo('fr')
      table.text('notes').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['card_id'])
      table.index(['storage_location_id'])
      table.index(['decklist_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
