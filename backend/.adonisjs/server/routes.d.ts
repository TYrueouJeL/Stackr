import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'import.status': { paramsTuple?: []; params?: {} }
    'import.run': { paramsTuple?: []; params?: {} }
    'sets.index': { paramsTuple?: []; params?: {} }
    'sets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'cards.index': { paramsTuple?: []; params?: {} }
    'cards.filters': { paramsTuple?: []; params?: {} }
    'cards.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'copies.index': { paramsTuple?: []; params?: {} }
    'copies.store': { paramsTuple?: []; params?: {} }
    'copies.bulk': { paramsTuple?: []; params?: {} }
    'copies.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'copies.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storage_locations.index': { paramsTuple?: []; params?: {} }
    'storage_locations.store': { paramsTuple?: []; params?: {} }
    'storage_locations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storage_locations.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storage_locations.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'decklists.index': { paramsTuple?: []; params?: {} }
    'decklists.store': { paramsTuple?: []; params?: {} }
    'decklists.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'decklists.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'decklists.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'decklists.entry': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'decklists.import': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'decklists.export': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'decklists.auto_assign': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'decklists.release': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'import.status': { paramsTuple?: []; params?: {} }
    'sets.index': { paramsTuple?: []; params?: {} }
    'sets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'cards.index': { paramsTuple?: []; params?: {} }
    'cards.filters': { paramsTuple?: []; params?: {} }
    'cards.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'copies.index': { paramsTuple?: []; params?: {} }
    'storage_locations.index': { paramsTuple?: []; params?: {} }
    'storage_locations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'decklists.index': { paramsTuple?: []; params?: {} }
    'decklists.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'decklists.export': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'import.status': { paramsTuple?: []; params?: {} }
    'sets.index': { paramsTuple?: []; params?: {} }
    'sets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'cards.index': { paramsTuple?: []; params?: {} }
    'cards.filters': { paramsTuple?: []; params?: {} }
    'cards.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'copies.index': { paramsTuple?: []; params?: {} }
    'storage_locations.index': { paramsTuple?: []; params?: {} }
    'storage_locations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'decklists.index': { paramsTuple?: []; params?: {} }
    'decklists.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'decklists.export': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'import.run': { paramsTuple?: []; params?: {} }
    'copies.store': { paramsTuple?: []; params?: {} }
    'storage_locations.store': { paramsTuple?: []; params?: {} }
    'decklists.store': { paramsTuple?: []; params?: {} }
    'decklists.import': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'decklists.auto_assign': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'decklists.release': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PATCH: {
    'copies.bulk': { paramsTuple?: []; params?: {} }
    'copies.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storage_locations.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'decklists.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'copies.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storage_locations.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'decklists.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PUT: {
    'storage_locations.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'decklists.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'decklists.entry': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}