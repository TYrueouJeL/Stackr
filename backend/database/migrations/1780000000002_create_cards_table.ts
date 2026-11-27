import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'cards'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      // Identifiant fourni par l'API Riot
      table.string('id').primary()
      table.string('set_id').notNullable().references('id').inTable('card_sets').onDelete('CASCADE')
      table.integer('collector_number').nullable()
      table.string('name').notNullable()
      table.text('description').nullable()
      table.string('type').nullable()
      table.string('rarity').nullable()
      table.string('faction').nullable()
      table.integer('energy').nullable()
      table.integer('might').nullable()
      table.integer('cost').nullable()
      table.integer('power').nullable()
      table.text('keywords').notNullable().defaultTo('[]')
      table.text('tags').notNullable().defaultTo('[]')
      table.text('flavor_text').nullable()
      table.string('thumbnail_url').nullable()
      table.string('full_url').nullable()
      table.string('artist').nullable()
      // Réponse brute de l'API pour ne perdre aucune info
      table.text('raw').notNullable().defaultTo('{}')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['set_id', 'collector_number'])
      table.index(['name'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
