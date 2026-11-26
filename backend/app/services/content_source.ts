import env from '#start/env'
import RiftboundApi, { type RiftboundContentDTO } from '#services/riftbound_api'
import RiftcodexApi from '#services/riftcodex_api'

export const SOURCES = ['riftcodex', 'riot'] as const
export type ContentSource = (typeof SOURCES)[number]

/**
 * Source par défaut : IMPORT_SOURCE dans .env, sinon RiftCodex (communautaire, sans clé).
 * L'API officielle Riot sera utilisable dès que la clé aura l'accès Riftbound.
 */
export function defaultSource(): ContentSource {
  return env.get('IMPORT_SOURCE', 'riftcodex') as ContentSource
}

export function describeSource(source: ContentSource) {
  return source === 'riot' ? new RiftboundApi().url : new RiftcodexApi().url
}

export async function fetchContent(
  source: ContentSource = defaultSource(),
  locale = 'en'
): Promise<RiftboundContentDTO> {
  if (source === 'riot') return new RiftboundApi().fetchContent(locale)
  return new RiftcodexApi().fetchContent()
}
