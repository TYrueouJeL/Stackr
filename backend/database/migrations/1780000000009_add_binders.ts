import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Types de rangement (boîte, deck box, classeur). Un classeur a des pages de N pochettes ;
 * chaque exemplaire peut occuper une pochette (page, emplacement). On garde aussi la pochette
 * d'origine d'un exemplaire parti dans une deck box, pour l'y remettre à son retour.
 *
 * Colonnes simples uniquement : sous SQLite, une contrainte reconstruirait les tables.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('storage_locations', (table) => {
      table.string('kind').notNullable().defaultTo('box')
      table.integer('pockets_per_page').nullable()
      table.integer('page_count').nullable()
    })
    this.schema.alterTable('card_copies', (table) => {
      table.integer('binder_page').nullable()
      table.integer('binder_slot').nullable()
      table.integer('previous_binder_page').nullable()
      table.integer('previous_binder_slot').nullable()
    })
  }

  async down() {
    this.schema.alterTable('card_copies', (table) => {
      table.dropColumn('binder_page')
      table.dropColumn('binder_slot')
      table.dropColumn('previous_binder_page')
      table.dropColumn('previous_binder_slot')
    })
    this.schema.alterTable('storage_locations', (table) => {
      table.dropColumn('kind')
      table.dropColumn('pockets_per_page')
      table.dropColumn('page_count')
    })
  }
}
