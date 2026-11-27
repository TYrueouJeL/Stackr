import { readFile } from 'node:fs/promises'
import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import type { RiftboundContentDTO } from '#services/riftbound_api'
import importContent from '#services/card_importer'
import {
  type ContentSource,
  SOURCES,
  defaultSource,
  describeSource,
  fetchContent,
} from '#services/content_source'

export default class ImportCards extends BaseCommand {
  static commandName = 'riftbound:import'
  static description =
    'Importe toutes les cartes Riftbound (RiftCodex, galerie Riot ou API Riot Games)'
  static options: CommandOptions = { startApp: true }

  @flags.string({
    description:
      'Source : all (RiftCodex + galerie Riot, défaut), riftcodex, gallery ou riot (API avec clé)',
  })
  declare source?: string

  @flags.string({
    description: 'Langue des cartes pour la source riot (ex: en, fr)',
    default: 'en',
  })
  declare locale: string

  @flags.string({ description: "Importer depuis un fichier JSON local au format de l'API Riot" })
  declare file?: string

  async run() {
    try {
      let content: RiftboundContentDTO
      if (this.file) {
        this.logger.info(`Lecture de ${this.file}`)
        content = JSON.parse(await readFile(this.file, 'utf8'))
      } else {
        const source = (this.source ?? defaultSource()) as ContentSource
        if (!SOURCES.includes(source)) {
          throw new Error(`Source inconnue "${source}" (valeurs possibles : ${SOURCES.join(', ')})`)
        }
        this.logger.info(`Import depuis ${source} (${describeSource(source)})`)
        content = await fetchContent(source, this.locale)
      }
      const result = await importContent(content)
      this.logger.success(`${result.cards} cartes importées dans ${result.sets} extensions`)
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : String(error))
      this.exitCode = 1
    }
  }
}
