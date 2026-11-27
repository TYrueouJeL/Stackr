import type { CardDTO, RiftboundContentDTO, SetDTO } from '#services/riftbound_api'

/**
 * Galerie de cartes publique de Riot : le flux qui alimente la galerie officielle
 * (playriftbound.com/card-gallery). Pas de clé. Contient les extensions dès leur sortie
 * (Radiance comprise), mais pas les cartes promo.
 */
const CHANNEL =
  'https://content.publishing.riotgames.com/publishing-content/v2.0/public/channel/riftbound_website/list'
const PAGE_SIZE = 200

type Labelled = {
  label?: string | null
  value?: { id?: string | number | null; label?: string | null } | null
}
type LabelledList = { values?: { id?: string | null; label?: string | null }[] | null }

export interface GallerySet {
  id: string
  name: string
  collectorNumberMax?: number | null
}

export interface GalleryCard {
  id: string
  publicCode?: string | null
  name: string
  subtitle?: string | null
  collectorNumber?: number | null
  set?: Labelled | null
  cardType?: {
    type?: { id?: string; label?: string }[] | null
    superType?: { id?: string; label?: string }[] | null
  } | null
  rarity?: Labelled | null
  domain?: LabelledList | null
  energy?: Labelled | null
  might?: Labelled | null
  power?: Labelled | null
  tags?: { tags?: string[] | null } | null
  illustrator?: LabelledList | null
  orientation?: string | null
  text?: { richText?: { body?: string | null } | null } | null
  effect?: { richText?: { body?: string | null } | null } | null
  cardImage?: { url?: string | null } | null
}

interface ListResponse<T> {
  data: T[]
  metadata?: { totalItems?: number }
}

async function getList<T extends { id?: string }>(name: string): Promise<T[]> {
  const seen = new Map<string, T>()
  let from = 0
  let total = Number.POSITIVE_INFINITY
  while (from < total) {
    const url = `${CHANNEL}/${name}?locale=en_US&from=${from}&limit=${PAGE_SIZE}`
    let response: Response
    try {
      response = await fetch(url, { headers: { Accept: 'application/json' } })
    } catch (error) {
      throw new Error(`Impossible de joindre la galerie Riot : ${(error as Error).message}`)
    }
    if (!response.ok) throw new Error(`La galerie Riot a répondu ${response.status} (${name})`)
    const page = (await response.json()) as ListResponse<T>
    total = page.metadata?.totalItems ?? page.data.length
    if (!page.data?.length) break
    // Le flux pagine une liste qui peut bouger entre deux pages : on dédoublonne sur l'id
    for (const item of page.data) seen.set(String(item.id ?? JSON.stringify(item)), item)
    from += PAGE_SIZE
  }
  return [...seen.values()]
}

/** Texte riche HTML de Riot → texte brut */
export function plainText(html: string | null | undefined) {
  if (!html) return null
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
  return text && text !== '[NO TEXT]' ? text : null
}

const numberOf = (field: Labelled | null | undefined) => {
  const v = field?.value?.id ?? field?.value?.label
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * Même convention de nom que RiftCodex (« Nom - Titre ») pour que les deux sources
 * se ressemblent. Chez Riot, une Légende ne porte que son titre (« Agony's Embrace »),
 * le champion est dans ses tags : on reconstruit « Evelynn - Agony's Embrace ».
 */
export function galleryName(card: GalleryCard, type: string | null) {
  const supers = (card.cardType?.superType ?? []).map((s) => (s.label ?? '').toLowerCase())
  const subtitle = card.subtitle?.trim()
  if (subtitle && !supers.includes('signature')) return `${card.name} - ${subtitle}`
  const tags = card.tags?.tags ?? []
  const champion = tags[tags.length - 1]
  if (type === 'Legend' && champion && !card.name.toLowerCase().includes(champion.toLowerCase())) {
    return `${champion} - ${card.name}`
  }
  return card.name
}

export function galleryCardToDTO(card: GalleryCard): CardDTO {
  const typeLabel = card.cardType?.type?.[0]?.label ?? null
  const type = typeLabel ? typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1) : null
  const domains = (card.domain?.values ?? [])
    .map((d) => d.label)
    .filter((d): d is string => !!d && d.toLowerCase() !== 'colorless')
  const supertype = card.cardType?.superType?.[0]?.label
  const image = card.cardImage?.url ?? null
  return {
    id: card.id.toUpperCase(),
    collectorNumber: card.collectorNumber ?? null,
    set: (card.set?.value?.id as string | undefined) ?? null,
    name: galleryName(card, type),
    description: plainText(card.text?.richText?.body) ?? plainText(card.effect?.richText?.body),
    type,
    rarity: card.rarity?.value?.label ?? card.rarity?.label ?? null,
    faction: domains.join(' / ') || null,
    stats: {
      energy: numberOf(card.energy),
      might: numberOf(card.might),
      power: numberOf(card.power),
    },
    keywords: supertype ? [supertype.charAt(0).toUpperCase() + supertype.slice(1)] : [],
    art: {
      thumbnailURL: image,
      fullURL: image,
      artist:
        (card.illustrator?.values ?? [])
          .map((v) => v.label)
          .filter(Boolean)
          .join(', ') || null,
    },
    flavorText: null,
    tags: card.tags?.tags ?? [],
    raw: card,
  }
}

export function galleryToContent(sets: GallerySet[], cards: GalleryCard[]): RiftboundContentDTO {
  const dtos = cards.map(galleryCardToDTO)
  const setDTOs: SetDTO[] = sets.map((s) => ({
    id: s.id,
    name: s.name,
    cards: dtos.filter((c) => c.set === s.id),
  }))
  return {
    game: 'riftbound',
    version: 'riot-gallery',
    lastUpdated: new Date().toISOString(),
    sets: setDTOs,
  }
}

export default class RiotGalleryApi {
  readonly url = CHANNEL

  async fetchContent(): Promise<RiftboundContentDTO> {
    const [sets, cards] = await Promise.all([
      getList<GallerySet>('riftbound_gallery_sets'),
      getList<GalleryCard>('riftbound_gallery_cards'),
    ])
    return galleryToContent(sets, cards)
  }
}
