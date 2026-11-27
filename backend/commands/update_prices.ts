import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { updatePrices } from '#services/cardmarket_prices'

export default class UpdatePrices extends BaseCommand {
  static commandName = 'prices:update'
  static description = 'Met à jour les prix Cardmarket (guide des prix quotidien public)'
  static options: CommandOptions = { startApp: true }

  async run() {
    try {
      const r = await updatePrices()
      this.logger.success(
        `${r.priced} cartes avec un prix (${r.byOpenrift} via OpenRift, ${r.byName} par nom), guide du ${r.guideDate ?? '?'}`
      )
    } catch (error) {
      this.logger.error(`Mise à jour des prix impossible : ${(error as Error).message}`)
      this.exitCode = 1
    }
  }
}
