/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  auth: {
    newAccount: {
      store: typeof routes['auth.new_account.store']
    }
    accessTokens: {
      store: typeof routes['auth.access_tokens.store']
    }
  }
  profile: {
    profile: {
      show: typeof routes['profile.profile.show']
    }
    accessTokens: {
      destroy: typeof routes['profile.access_tokens.destroy']
    }
  }
  import: {
    status: typeof routes['import.status']
    run: typeof routes['import.run']
  }
  sets: {
    index: typeof routes['sets.index']
    show: typeof routes['sets.show']
  }
  cards: {
    index: typeof routes['cards.index']
    filters: typeof routes['cards.filters']
    show: typeof routes['cards.show']
  }
  copies: {
    index: typeof routes['copies.index']
    store: typeof routes['copies.store']
    bulk: typeof routes['copies.bulk']
    update: typeof routes['copies.update']
    slot: typeof routes['copies.slot']
    destroy: typeof routes['copies.destroy']
  }
  storageLocations: {
    index: typeof routes['storage_locations.index']
    store: typeof routes['storage_locations.store']
    show: typeof routes['storage_locations.show']
    update: typeof routes['storage_locations.update']
    destroy: typeof routes['storage_locations.destroy']
  }
  decklists: {
    index: typeof routes['decklists.index']
    store: typeof routes['decklists.store']
    show: typeof routes['decklists.show']
    update: typeof routes['decklists.update']
    destroy: typeof routes['decklists.destroy']
    entry: typeof routes['decklists.entry']
    import: typeof routes['decklists.import']
    export: typeof routes['decklists.export']
    autoAssign: typeof routes['decklists.auto_assign']
    release: typeof routes['decklists.release']
  }
}
