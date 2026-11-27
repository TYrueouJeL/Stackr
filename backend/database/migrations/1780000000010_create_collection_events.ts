import { BaseSchema } from '@adonisjs/lucid/schema'

/** Historique des ajouts et retraits d'exemplaires dans la collection */
export default class extends BaseSchema {
  protected tableName = 'collection_events'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('user_id').unsigned().notNullable().index()
      table.string('card_id').notNullable()
      table.string('action').notNullable() // added | removed
      table.integer('quantity').notNullable().defaultTo(1)
      table.text('details').nullable() // JSON : finition, état, langue, rangement…
      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
