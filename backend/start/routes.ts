/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router.get('/', () => {
  return { name: 'Stackr API', status: 'ok' }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.AccessTokens, 'store'])
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    // Toutes les routes suivantes nécessitent d'être connecté
    router
      .group(() => {
        // Mise à jour du catalogue (RiftCodex ou API Riot)
        router.get('import', [controllers.Import, 'status']).as('import.status')
        router.post('import', [controllers.Import, 'store']).as('import.run')

        // Catalogue
        router.get('sets', [controllers.Sets, 'index']).as('sets.index')
        router.get('sets/:id', [controllers.Sets, 'show']).as('sets.show')
        router.get('cards', [controllers.Cards, 'index']).as('cards.index')
        router.get('cards/filters', [controllers.Cards, 'filters']).as('cards.filters')
        router.get('cards/:id', [controllers.Cards, 'show']).as('cards.show')

        // Exemplaires physiques
        router.get('copies', [controllers.Copies, 'index']).as('copies.index')
        router.post('copies', [controllers.Copies, 'store']).as('copies.store')
        router.patch('copies', [controllers.Copies, 'bulkUpdate']).as('copies.bulk')
        router.patch('copies/:id', [controllers.Copies, 'update']).as('copies.update')
        router.put('copies/:id/slot', [controllers.Copies, 'placeInSlot']).as('copies.slot')
        router.delete('copies/:id', [controllers.Copies, 'destroy']).as('copies.destroy')

        // Rangements
        router
          .resource('storage-locations', controllers.StorageLocations)
          .apiOnly()
          .as('storage_locations')

        // Decklists
        router.resource('decklists', controllers.Decklists).apiOnly()
        router
          .put('decklists/:id/entries', [controllers.Decklists, 'setEntry'])
          .as('decklists.entry')
        router
          .post('decklists/:id/import', [controllers.Decklists, 'importText'])
          .as('decklists.import')
        router
          .get('decklists/:id/export', [controllers.Decklists, 'exportText'])
          .as('decklists.export')
        router
          .post('decklists/:id/auto-assign', [controllers.Decklists, 'autoAssign'])
          .as('decklists.auto_assign')
        router
          .post('decklists/:id/release', [controllers.Decklists, 'release'])
          .as('decklists.release')
      })
      .use(middleware.auth())
  })
  .prefix('/api/v1')
