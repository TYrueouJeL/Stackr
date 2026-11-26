import { StorageLocationSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import CardCopy from '#models/card_copy'

export default class StorageLocation extends StorageLocationSchema {
  static table = 'storage_locations'

  @hasMany(() => CardCopy)
  declare copies: HasMany<typeof CardCopy>
}
