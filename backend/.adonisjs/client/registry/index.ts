/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

export type { Route, Path } from './schema.d.ts'

const placeholder: any = {}

const routes = {
  'auth.new_account.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/signup',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"signup"]],
    types: placeholder as Registry['auth.new_account.store']['types'],
  },
  'auth.access_tokens.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/login',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"login"]],
    types: placeholder as Registry['auth.access_tokens.store']['types'],
  },
  'profile.profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/account/profile',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"profile"]],
    types: placeholder as Registry['profile.profile.show']['types'],
  },
  'profile.access_tokens.destroy': {
    methods: ["POST"],
    pattern: '/api/v1/account/logout',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"logout"]],
    types: placeholder as Registry['profile.access_tokens.destroy']['types'],
  },
  'import.status': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/import',
    tokens: [[0,"api"],[0,"v1"],[0,"import"]],
    types: placeholder as Registry['import.status']['types'],
  },
  'import.run': {
    methods: ["POST"],
    pattern: '/api/v1/import',
    tokens: [[0,"api"],[0,"v1"],[0,"import"]],
    types: placeholder as Registry['import.run']['types'],
  },
  'sets.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/sets',
    tokens: [[0,"api"],[0,"v1"],[0,"sets"]],
    types: placeholder as Registry['sets.index']['types'],
  },
  'sets.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/sets/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"sets"],[1,"id"]],
    types: placeholder as Registry['sets.show']['types'],
  },
  'cards.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/cards',
    tokens: [[0,"api"],[0,"v1"],[0,"cards"]],
    types: placeholder as Registry['cards.index']['types'],
  },
  'cards.filters': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/cards/filters',
    tokens: [[0,"api"],[0,"v1"],[0,"cards"],[0,"filters"]],
    types: placeholder as Registry['cards.filters']['types'],
  },
  'cards.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/cards/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"cards"],[1,"id"]],
    types: placeholder as Registry['cards.show']['types'],
  },
  'copies.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/copies',
    tokens: [[0,"api"],[0,"v1"],[0,"copies"]],
    types: placeholder as Registry['copies.index']['types'],
  },
  'copies.store': {
    methods: ["POST"],
    pattern: '/api/v1/copies',
    tokens: [[0,"api"],[0,"v1"],[0,"copies"]],
    types: placeholder as Registry['copies.store']['types'],
  },
  'copies.bulk': {
    methods: ["PATCH"],
    pattern: '/api/v1/copies',
    tokens: [[0,"api"],[0,"v1"],[0,"copies"]],
    types: placeholder as Registry['copies.bulk']['types'],
  },
  'copies.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/copies/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"copies"],[1,"id"]],
    types: placeholder as Registry['copies.update']['types'],
  },
  'copies.slot': {
    methods: ["PUT"],
    pattern: '/api/v1/copies/:id/slot',
    tokens: [[0,"api"],[0,"v1"],[0,"copies"],[1,"id"],[0,"slot"]],
    types: placeholder as Registry['copies.slot']['types'],
  },
  'copies.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/copies/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"copies"],[1,"id"]],
    types: placeholder as Registry['copies.destroy']['types'],
  },
  'storage_locations.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/storage-locations',
    tokens: [[0,"api"],[0,"v1"],[0,"storage-locations"]],
    types: placeholder as Registry['storage_locations.index']['types'],
  },
  'storage_locations.store': {
    methods: ["POST"],
    pattern: '/api/v1/storage-locations',
    tokens: [[0,"api"],[0,"v1"],[0,"storage-locations"]],
    types: placeholder as Registry['storage_locations.store']['types'],
  },
  'storage_locations.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/storage-locations/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"storage-locations"],[1,"id"]],
    types: placeholder as Registry['storage_locations.show']['types'],
  },
  'storage_locations.update': {
    methods: ["PUT","PATCH"],
    pattern: '/api/v1/storage-locations/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"storage-locations"],[1,"id"]],
    types: placeholder as Registry['storage_locations.update']['types'],
  },
  'storage_locations.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/storage-locations/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"storage-locations"],[1,"id"]],
    types: placeholder as Registry['storage_locations.destroy']['types'],
  },
  'decklists.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/decklists',
    tokens: [[0,"api"],[0,"v1"],[0,"decklists"]],
    types: placeholder as Registry['decklists.index']['types'],
  },
  'decklists.store': {
    methods: ["POST"],
    pattern: '/api/v1/decklists',
    tokens: [[0,"api"],[0,"v1"],[0,"decklists"]],
    types: placeholder as Registry['decklists.store']['types'],
  },
  'decklists.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/decklists/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"decklists"],[1,"id"]],
    types: placeholder as Registry['decklists.show']['types'],
  },
  'decklists.update': {
    methods: ["PUT","PATCH"],
    pattern: '/api/v1/decklists/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"decklists"],[1,"id"]],
    types: placeholder as Registry['decklists.update']['types'],
  },
  'decklists.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/decklists/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"decklists"],[1,"id"]],
    types: placeholder as Registry['decklists.destroy']['types'],
  },
  'decklists.entry': {
    methods: ["PUT"],
    pattern: '/api/v1/decklists/:id/entries',
    tokens: [[0,"api"],[0,"v1"],[0,"decklists"],[1,"id"],[0,"entries"]],
    types: placeholder as Registry['decklists.entry']['types'],
  },
  'decklists.import': {
    methods: ["POST"],
    pattern: '/api/v1/decklists/:id/import',
    tokens: [[0,"api"],[0,"v1"],[0,"decklists"],[1,"id"],[0,"import"]],
    types: placeholder as Registry['decklists.import']['types'],
  },
  'decklists.export': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/decklists/:id/export',
    tokens: [[0,"api"],[0,"v1"],[0,"decklists"],[1,"id"],[0,"export"]],
    types: placeholder as Registry['decklists.export']['types'],
  },
  'decklists.auto_assign': {
    methods: ["POST"],
    pattern: '/api/v1/decklists/:id/auto-assign',
    tokens: [[0,"api"],[0,"v1"],[0,"decklists"],[1,"id"],[0,"auto-assign"]],
    types: placeholder as Registry['decklists.auto_assign']['types'],
  },
  'decklists.release': {
    methods: ["POST"],
    pattern: '/api/v1/decklists/:id/release',
    tokens: [[0,"api"],[0,"v1"],[0,"decklists"],[1,"id"],[0,"release"]],
    types: placeholder as Registry['decklists.release']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
