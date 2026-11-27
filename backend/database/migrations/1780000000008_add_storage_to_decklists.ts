import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Une decklist peut avoir un rangement (sa deck box). Les exemplaires affectés au deck
 * y sont rangés ; on garde leur rangement d'origine pour les y remettre quand ils sortent du deck.
 *
 * Colonnes simples, sans clé étrangère : sous SQLite, ajouter une contrainte reconstruit la
 * table, et supprimer l'ancienne table `decklists` déclencherait les ON DELETE CASCADE/SET NULL
 * (contenu des decks et affectations perdus). La cohérence est gérée par l'application
 * (suppression d'un rangement : voir StorageLocationsController.destroy).
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('decklists', (table) => {
      table.integer('storage_location_id').unsigned().nullable()
    })
    this.schema.alterTable('card_copies', (table) => {
      table.integer('previous_storage_location_id').unsigned().nullable()
    })
  }

  async down() {
    this.schema.alterTable('card_copies', (table) => {
      table.dropColumn('previous_storage_location_id')
    })
    this.schema.alterTable('decklists', (table) => {
      table.dropColumn('storage_location_id')
    })
  }
}
