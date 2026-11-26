import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Chaque ligne de decklist appartient à une section : legend, champion, main,
 * battlefield, rune ou sideboard. Une même carte peut être dans deux sections
 * (ex : deck principal et sideboard).
 */
export default class extends BaseSchema {
  protected tableName = 'decklist_entries'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('section').notNullable().defaultTo('main')
    })

    // Les entrées existantes prennent la section correspondant au type de carte
    this.defer(async (db) => {
      const rows = await db
        .from('decklist_entries as e')
        .join('cards as c', 'c.id', 'e.card_id')
        .select('e.id', 'c.type')
      for (const row of rows) {
        const section =
          row.type === 'Legend'
            ? 'legend'
            : row.type === 'Rune'
              ? 'rune'
              : row.type === 'Battlefield'
                ? 'battlefield'
                : 'main'
        if (section !== 'main') {
          await db.from('decklist_entries').where('id', row.id).update({ section })
        }
      }
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['decklist_id', 'card_id'])
      table.unique(['decklist_id', 'card_id', 'section'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['decklist_id', 'card_id', 'section'])
      table.dropColumn('section')
      table.unique(['decklist_id', 'card_id'])
    })
  }
}
