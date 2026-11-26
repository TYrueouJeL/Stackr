import { readFile } from 'node:fs/promises'
import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import RiftboundApi, { type RiftboundContentDTO } from '#services/riftbound_api'
import importContent from '#services/card_importer'

export default class ImportCards extends BaseCommand {
  static commandName = 'riftbound:import'
  static description = "Importe toutes les cartes Riftbound depuis l'API Riot Games"
  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'Langue des cartes (ex: en, fr)', default: 'en' })
  declare locale: string

  @flags.string({ description: "Importer depuis un fichier JSON local au lieu de l'API" })
  declare file?: string

  async run() {
    try {
      let content: RiftboundContentDTO
      if (this.file) {
        this.logger.info(`Lecture de ${this.file}`)
        content = JSON.parse(await readFile(this.file, 'utf8'))
      } else {
        const api = new RiftboundApi()
        this.logger.info(`Appel de ${api.url} (locale=${this.locale})`)
        content = await api.fetchContent(this.locale)
      }
      const result = await importContent(content)
      this.logger.success(
        `${result.cards} cartes importées dans ${result.sets} extensions (version ${result.version ?? '?'})`
      )
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : String(error))
      this.exitCode = 1
    }
  }
}
