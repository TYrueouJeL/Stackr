/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractRawResponse, ExtractResponse, Method, PathWithRegistry, PatternsByMethod, RouteWithRegistry } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'
import type { routes } from './index.ts'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'auth.new_account.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.access_tokens.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/account/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
    }
  }
  'profile.access_tokens.destroy': {
    methods: ["POST"]
    pattern: '/api/v1/account/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['destroy']>>>
    }
  }
  'import.status': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/import'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/import_controller').default['status']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/import_controller').default['status']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/import_controller').default['status']>>>
    }
  }
  'import.run': {
    methods: ["POST"]
    pattern: '/api/v1/import'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/stock').importValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/stock').importValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/import_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/import_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/import_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'prices.update': {
    methods: ["POST"]
    pattern: '/api/v1/prices'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/import_controller').default['prices']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/import_controller').default['prices']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/import_controller').default['prices']>>>
    }
  }
  'sets.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/sets'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/sets_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/sets_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/sets_controller').default['index']>>>
    }
  }
  'sets.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/sets/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/sets_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/sets_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/sets_controller').default['show']>>>
    }
  }
  'cards.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/cards'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/cards_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/cards_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/cards_controller').default['index']>>>
    }
  }
  'cards.filters': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/cards/filters'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/cards_controller').default['filters']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/cards_controller').default['filters']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/cards_controller').default['filters']>>>
    }
  }
  'cards.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/cards/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/cards_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/cards_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/cards_controller').default['show']>>>
    }
  }
  'copies.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/copies'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/copies_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/copies_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/copies_controller').default['index']>>>
    }
  }
  'copies.store': {
    methods: ["POST"]
    pattern: '/api/v1/copies'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/stock').createCopiesValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/stock').createCopiesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/copies_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/copies_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/copies_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'copies.bulk': {
    methods: ["PATCH"]
    pattern: '/api/v1/copies'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/stock').bulkUpdateCopiesValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/stock').bulkUpdateCopiesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/copies_controller').default['bulkUpdate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/copies_controller').default['bulkUpdate']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/copies_controller').default['bulkUpdate']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'copies.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/copies/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/stock').updateCopyValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/stock').updateCopyValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/copies_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/copies_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/copies_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'copies.slot': {
    methods: ["PUT"]
    pattern: '/api/v1/copies/:id/slot'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/stock').binderSlotValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/stock').binderSlotValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/copies_controller').default['placeInSlot']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/copies_controller').default['placeInSlot']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/copies_controller').default['placeInSlot']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'copies.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/copies/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/copies_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/copies_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/copies_controller').default['destroy']>>>
    }
  }
  'history.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/history'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/history_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/history_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/history_controller').default['index']>>>
    }
  }
  'shopping.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/shopping-list'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/shopping_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/shopping_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/shopping_controller').default['index']>>>
    }
  }
  'storage_locations.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/storage-locations'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/storage_locations_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/storage_locations_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/storage_locations_controller').default['index']>>>
    }
  }
  'storage_locations.store': {
    methods: ["POST"]
    pattern: '/api/v1/storage-locations'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/stock').storageLocationValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/stock').storageLocationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/storage_locations_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/storage_locations_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/storage_locations_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'storage_locations.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/storage-locations/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/storage_locations_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/storage_locations_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/storage_locations_controller').default['show']>>>
    }
  }
  'storage_locations.update': {
    methods: ["PUT","PATCH"]
    pattern: '/api/v1/storage-locations/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/stock').storageLocationValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/stock').storageLocationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/storage_locations_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/storage_locations_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/storage_locations_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'storage_locations.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/storage-locations/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/storage_locations_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/storage_locations_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/storage_locations_controller').default['destroy']>>>
    }
  }
  'decklists.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/decklists'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['index']>>>
    }
  }
  'decklists.store': {
    methods: ["POST"]
    pattern: '/api/v1/decklists'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/stock').decklistValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/stock').decklistValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'decklists.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/decklists/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['show']>>>
    }
  }
  'decklists.update': {
    methods: ["PUT","PATCH"]
    pattern: '/api/v1/decklists/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/stock').decklistValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/stock').decklistValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'decklists.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/decklists/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['destroy']>>>
    }
  }
  'decklists.entry': {
    methods: ["PUT"]
    pattern: '/api/v1/decklists/:id/entries'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/stock').decklistEntryValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/stock').decklistEntryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['setEntry']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['setEntry']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['setEntry']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'decklists.import': {
    methods: ["POST"]
    pattern: '/api/v1/decklists/:id/import'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/stock').decklistImportValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/stock').decklistImportValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['importText']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['importText']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['importText']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'decklists.export': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/decklists/:id/export'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['exportText']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['exportText']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['exportText']>>>
    }
  }
  'decklists.auto_assign': {
    methods: ["POST"]
    pattern: '/api/v1/decklists/:id/auto-assign'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['autoAssign']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['autoAssign']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['autoAssign']>>>
    }
  }
  'decklists.release': {
    methods: ["POST"]
    pattern: '/api/v1/decklists/:id/release'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['release']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['release']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/decklists_controller').default['release']>>>
    }
  }
}

export namespace Route {
  export type Request<Name extends keyof typeof routes> = RouteWithRegistry.Request<typeof routes, Name>
  export type Response<Name extends keyof typeof routes> = RouteWithRegistry.Response<typeof routes, Name>
  export type Params<Name extends keyof typeof routes> = RouteWithRegistry.Params<typeof routes, Name>
  export type Body<Name extends keyof typeof routes> = RouteWithRegistry.Body<typeof routes, Name>
  export type Query<Name extends keyof typeof routes> = RouteWithRegistry.Query<typeof routes, Name>
  export type Error<Name extends keyof typeof routes> = RouteWithRegistry.Error<typeof routes, Name>
}

export namespace Path {
  export type Request<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Request<typeof routes, M, P>
  export type Response<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Response<typeof routes, M, P>
  export type Params<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Params<typeof routes, M, P>
  export type Body<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Body<typeof routes, M, P>
  export type Query<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Query<typeof routes, M, P>
  export type Error<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Error<typeof routes, M, P>
}
