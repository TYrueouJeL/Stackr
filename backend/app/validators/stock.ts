import vine from '@vinejs/vine'

const conditions = ['M', 'NM', 'EX', 'GD', 'LP', 'PL', 'PO'] as const

export const createCopiesValidator = vine.create({
  cardId: vine.string().exists({ table: 'cards', column: 'id' }),
  quantity: vine.number().withoutDecimals().min(1).max(100).optional(),
  storageLocationId: vine.number().withoutDecimals().nullable().optional(),
  decklistId: vine.number().withoutDecimals().nullable().optional(),
  foil: vine.boolean().optional(),
  condition: vine.enum(conditions).optional(),
  language: vine.string().maxLength(10).optional(),
  notes: vine.string().maxLength(1000).nullable().optional(),
})

export const updateCopyValidator = vine.create({
  storageLocationId: vine.number().withoutDecimals().nullable().optional(),
  decklistId: vine.number().withoutDecimals().nullable().optional(),
  foil: vine.boolean().optional(),
  condition: vine.enum(conditions).optional(),
  language: vine.string().maxLength(10).optional(),
  notes: vine.string().maxLength(1000).nullable().optional(),
})

export const bulkUpdateCopiesValidator = vine.create({
  ids: vine.array(vine.number().withoutDecimals()).minLength(1),
  storageLocationId: vine.number().withoutDecimals().nullable().optional(),
  decklistId: vine.number().withoutDecimals().nullable().optional(),
})

export const storageLocationValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(255),
  description: vine.string().maxLength(2000).nullable().optional(),
})

export const decklistValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(255),
  description: vine.string().maxLength(5000).nullable().optional(),
})

export const decklistEntryValidator = vine.create({
  cardId: vine.string().exists({ table: 'cards', column: 'id' }),
  quantity: vine.number().withoutDecimals().min(0).max(99),
  section: vine
    .enum(['legend', 'champion', 'main', 'battlefield', 'rune', 'sideboard'] as const)
    .optional(),
})

export const decklistImportValidator = vine.create({
  text: vine.string().maxLength(20000),
  replace: vine.boolean().optional(),
})

export const importValidator = vine.create({
  locale: vine.string().maxLength(10).optional(),
  source: vine.enum(['riftcodex', 'riot'] as const).optional(),
})
