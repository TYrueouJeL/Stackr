import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Chaque collection (exemplaires, decklists, rangements) appartient à un utilisateur.
 * Le catalogue de cartes reste commun. Les données créées avant l'ajout des comptes
 * (user_id NULL) sont rattachées au premier compte créé.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      table.boolean('is_admin').notNullable().defaultTo(false)
    })

    for (const tableName of ['storage_locations', 'decklists', 'card_copies']) {
      this.schema.alterTable(tableName, (table) => {
        table
          .integer('user_id')
          .unsigned()
          .nullable()
          .references('id')
          .inTable('users')
          .onDelete('CASCADE')
        table.index(['user_id'])
      })
    }
  }

  async down() {
    for (const tableName of ['storage_locations', 'decklists', 'card_copies']) {
      this.schema.alterTable(tableName, (table) => {
        table.dropForeign(['user_id'])
        table.dropIndex(['user_id'])
        table.dropColumn('user_id')
      })
    }
    this.schema.alterTable('users', (table) => {
      table.dropColumn('is_admin')
    })
  }
}
