import { CardSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import CardSet from '#models/card_set'
import CardCopy from '#models/card_copy'

function parseList(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

export default class Card extends CardSchema {
  static table = 'cards'
  static selfAssignPrimaryKey = true

  @belongsTo(() => CardSet, { foreignKey: 'setId' })
  declare set: BelongsTo<typeof CardSet>

  @hasMany(() => CardCopy)
  declare copies: HasMany<typeof CardCopy>

  get keywordList() {
    return parseList(this.keywords)
  }

  get tagList() {
    return parseList(this.tags)
  }

  toApi() {
    return {
      id: this.id,
      setId: this.setId,
      collectorNumber: this.collectorNumber,
      name: this.name,
      description: this.description,
      type: this.type,
      rarity: this.rarity,
      faction: this.faction,
      stats: { energy: this.energy, might: this.might, cost: this.cost, power: this.power },
      keywords: this.keywordList,
      tags: this.tagList,
      flavorText: this.flavorText,
      thumbnailUrl: this.thumbnailUrl,
      fullUrl: this.fullUrl,
      artist: this.artist,
    }
  }
}
