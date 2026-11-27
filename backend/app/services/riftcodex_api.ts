import type { CardDTO, RiftboundContentDTO, SetDTO } from '#services/riftbound_api'

/**
 * Source communautaire : RiftCodex (https://riftcodex.com), API ouverte sans clé.
 * Les données sont converties au format de l'API Riot pour réutiliser le même import.
 */
const BASE_URL = 'https://api.riftcodex.com'

interface RiftcodexSet {
  id: string
  name: string
  set_id: string
  card_count: number
  published_on: string | null
}

interface RiftcodexCard {
  id: string
  name: string
  riftbound_id: string
  tcgplayer_id: string | null
  collector_number: number | null
  attributes: { energy: number | null; might: number | null; power: number | null }
  classification: {
    type: string | null
    supertype: string | null
    rarity: string | null
    domain: string[] | null
  }
  text: { rich: string | null; plain: string | null; flavour: string | null }
  set: { set_id: string; label: string }
  media: { image_url: string | null; artist: string | null; accessibility_text: string | null }
  tags: string[] | null
  orientation: string | null
  metadata: {
    clean_name: string | null
    updated_on: string | null
    alternate_art: boolean
    overnumbered: boolean
    signature: boolean
  }
}

interface Page<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

async function getJson<T>(path: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, { headers: { Accept: 'application/json' } })
  } catch (error) {
    throw new Error(`Impossible de joindre RiftCodex : ${(error as Error).message}`)
  }
  if (!response.ok) {
    throw new Error(`RiftCodex a répondu ${response.status} sur ${path}`)
  }
  return (await response.json()) as T
}

function cleanText(value: string | null | undefined) {
  if (!value || value.trim() === '[NO TEXT]') return null
  return value
}

/**
 * RiftCodex contient parfois deux fiches pour la même carte (ancienne et mise à jour) :
 * on garde la plus récente.
 */
function dedupe(cards: RiftcodexCard[]) {
  const byId = new Map<string, RiftcodexCard>()
  for (const card of cards) {
    const key = card.riftbound_id || card.id
    const current = byId.get(key)
    if (!current || (card.metadata?.updated_on ?? '') > (current.metadata?.updated_on ?? '')) {
      byId.set(key, card)
    }
  }
  return [...byId.values()]
}

export function toCardDTO(card: RiftcodexCard): CardDTO {
  const keywords = [card.classification?.supertype].filter((k): k is string => Boolean(k))
  return {
    id: (card.riftbound_id || card.id).toUpperCase(),
    collectorNumber: card.collector_number,
    set: card.set?.set_id,
    name: card.name,
    description: cleanText(card.text?.plain),
    type: card.classification?.type ?? null,
    rarity: card.classification?.rarity ?? null,
    faction: card.classification?.domain?.join(' / ') || null,
    stats: {
      energy: card.attributes?.energy ?? null,
      might: card.attributes?.might ?? null,
      power: card.attributes?.power ?? null,
    },
    keywords,
    art: {
      thumbnailURL: card.media?.image_url ?? null,
      fullURL: card.media?.image_url ?? null,
      artist: card.media?.artist ?? null,
    },
    flavorText: card.text?.flavour ?? null,
    tags: card.tags ?? [],
    raw: card,
  }
}

export default class RiftcodexApi {
  readonly url = BASE_URL

  async fetchContent(): Promise<RiftboundContentDTO> {
    const sets = await getJson<Page<RiftcodexSet>>('/sets?size=100')

    const cards: RiftcodexCard[] = []
    for (let page = 1; ; page++) {
      const result = await getJson<Page<RiftcodexCard>>(
        `/cards?size=100&page=${page}&sort=collector_number`
      )
      cards.push(...result.items)
      if (page >= result.pages || !result.items.length) break
    }

    const unique = dedupe(cards)
    const orderedSets = [...sets.items].sort((a, b) =>
      (a.published_on ?? '').localeCompare(b.published_on ?? '')
    )

    const setDTOs: SetDTO[] = orderedSets.map((set) => ({
      id: set.set_id,
      name: set.name,
      cards: unique.filter((c) => c.set?.set_id === set.set_id).map(toCardDTO),
    }))

    // Cartes dont l'extension n'est pas listée dans /sets
    const known = new Set(orderedSets.map((s) => s.set_id))
    for (const card of unique.filter((c) => !known.has(c.set?.set_id))) {
      let set = setDTOs.find((s) => s.id === card.set.set_id)
      if (!set) {
        set = { id: card.set.set_id, name: card.set.label ?? card.set.set_id, cards: [] }
        setDTOs.push(set)
      }
      set.cards.push(toCardDTO(card))
    }

    return {
      game: 'riftbound',
      version: 'riftcodex',
      lastUpdated: new Date().toISOString(),
      sets: setDTOs.filter((set) => set.cards.length > 0),
    }
  }
}
