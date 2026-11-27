import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'decklists'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('name').notNullable()
      table.text('description').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    // Contenu théorique de la decklist : quelle carte, combien de fois
    this.schema.createTable('decklist_entries', (table) => {
      table.increments('id').notNullable()
      table
        .integer('decklist_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('decklists')
        .onDelete('CASCADE')
      table.string('card_id').notNullable().references('id').inTable('cards').onDelete('CASCADE')
      table.integer('quantity').notNullable().defaultTo(1)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['decklist_id', 'card_id'])
    })
  }

  async down() {
    this.schema.dropTable('decklist_entries')
    this.schema.dropTable(this.tableName)
  }
}
