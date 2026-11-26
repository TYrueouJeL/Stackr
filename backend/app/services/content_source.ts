import env from '#start/env'
import RiftboundApi, { type RiftboundContentDTO } from '#services/riftbound_api'
import RiftcodexApi from '#services/riftcodex_api'
import RiotGalleryApi from '#services/riot_gallery'

export const SOURCES = ['all', 'riftcodex', 'gallery', 'riot'] as const
export type ContentSource = (typeof SOURCES)[number]

/**
 * Source par défaut : IMPORT_SOURCE dans .env, sinon « all ».
 * - all : RiftCodex (toutes les extensions et les promos), complété par la galerie
 *   officielle de Riot pour les extensions que RiftCodex n'a pas encore (ex. Radiance)
 * - riftcodex : RiftCodex seul
 * - gallery : galerie publique de Riot seule (sans les promos)
 * - riot : API développeur Riot (clé avec accès Riftbound nécessaire)
 */
export function defaultSource(): ContentSource {
  return env.get('IMPORT_SOURCE', 'all') as ContentSource
}

export function describeSource(source: ContentSource) {
  if (source === 'riot') return new RiftboundApi().url
  if (source === 'gallery') return new RiotGalleryApi().url
  if (source === 'riftcodex') return new RiftcodexApi().url
  return `${new RiftcodexApi().url} + galerie Riot`
}

/**
 * Fusion : les extensions de la galerie absentes de RiftCodex sont ajoutées à la suite.
 * Les identifiants des deux sources sont les mêmes (« RAD-001-167 »), donc quand RiftCodex
 * ajoutera l'extension, le prochain import mettra simplement les mêmes cartes à jour.
 */
export function mergeContent(
  primary: RiftboundContentDTO | null,
  extra: RiftboundContentDTO | null
): RiftboundContentDTO {
  if (!primary && !extra) throw new Error('Aucune source disponible')
  if (!primary) return extra!
  if (!extra) return primary
  const known = new Set(primary.sets.filter((s) => s.cards.length).map((s) => s.id))
  const added = extra.sets.filter((s) => s.cards.length && !known.has(s.id))
  return {
    ...primary,
    version: added.length
      ? `${primary.version}+${added.map((s) => s.id).join(',')}`
      : primary.version,
    sets: [...primary.sets.filter((s) => !added.some((a) => a.id === s.id)), ...added],
  }
}

export async function fetchContent(
  source: ContentSource = defaultSource(),
  locale = 'en'
): Promise<RiftboundContentDTO> {
  if (source === 'riot') return new RiftboundApi().fetchContent(locale)
  if (source === 'gallery') return new RiotGalleryApi().fetchContent()
  if (source === 'riftcodex') return new RiftcodexApi().fetchContent()

  const [codex, gallery] = await Promise.allSettled([
    new RiftcodexApi().fetchContent(),
    new RiotGalleryApi().fetchContent(),
  ])
  if (codex.status === 'rejected' && gallery.status === 'rejected') {
    throw new Error(
      `${codex.reason?.message ?? codex.reason} ; ${gallery.reason?.message ?? gallery.reason}`
    )
  }
  return mergeContent(
    codex.status === 'fulfilled' ? codex.value : null,
    gallery.status === 'fulfilled' ? gallery.value : null
  )
}
