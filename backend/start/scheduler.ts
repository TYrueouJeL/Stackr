/*
|--------------------------------------------------------------------------
| Tâches planifiées
|--------------------------------------------------------------------------
| Prix Cardmarket : mis à jour au démarrage s'ils datent de plus de 20 h, puis
| vérifiés toutes les heures (Cardmarket publie un nouveau guide une fois par jour).
| Désactivable avec PRICE_UPDATES=false.
*/
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import { lastPriceUpdate, updatePrices } from '#services/cardmarket_prices'

const MAX_AGE_MS = 20 * 60 * 60 * 1000
let running = false

async function refreshIfStale() {
  if (running) return
  running = true
  try {
    const last = await lastPriceUpdate()
    const age = last
      ? Date.now() - new Date(`${String(last).replace(' ', 'T')}Z`).getTime()
      : Infinity
    if (age < MAX_AGE_MS) return
    const r = await updatePrices()
    logger.info(`Prix Cardmarket mis à jour : ${r.priced} cartes (guide du ${r.guideDate ?? '?'})`)
  } catch (error) {
    logger.warn(`Prix Cardmarket non mis à jour : ${(error as Error).message}`)
  } finally {
    running = false
  }
}

if (app.getEnvironment() === 'web' && !app.inTest && env.get('PRICE_UPDATES', true) !== false) {
  setTimeout(refreshIfStale, 30_000)
  setInterval(refreshIfStale, 60 * 60 * 1000).unref()
}
