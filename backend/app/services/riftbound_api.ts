import env from '#start/env'

/**
 * Types de l'endpoint riftbound-content-v1 :
 * GET https://{region}.api.riotgames.com/riftbound/content/v1/contents?locale=xx
 */
export interface CardStatsDTO {
  energy?: number | null
  might?: number | null
  cost?: number | null
  power?: number | null
}

export interface CardArtDTO {
  thumbnailURL?: string | null
  fullURL?: string | null
  artist?: string | null
}

export interface CardDTO {
  id: string
  collectorNumber?: number | null
  set?: string | null
  name: string
  description?: string | null
  type?: string | null
  rarity?: string | null
  faction?: string | null
  stats?: CardStatsDTO | null
  keywords?: string[] | null
  art?: CardArtDTO | null
  flavorText?: string | null
  tags?: string[] | null
}

export interface SetDTO {
  id: string
  name: string
  cards: CardDTO[]
}

export interface RiftboundContentDTO {
  game: string
  version: string
  lastUpdated: string
  sets: SetDTO[]
}

export class RiftboundApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message)
  }
}

export default class RiftboundApi {
  constructor(
    private apiKey = env.get('RIOT_API_KEY'),
    private region = env.get('RIOT_REGION', 'americas')
  ) {}

  get url() {
    return `https://${this.region}.api.riotgames.com/riftbound/content/v1/contents`
  }

  async fetchContent(locale = 'en'): Promise<RiftboundContentDTO> {
    if (!this.apiKey) {
      throw new RiftboundApiError(
        'RIOT_API_KEY manquante : ajoute ta clé Riot dans backend/.env (voir developer.riotgames.com)'
      )
    }

    const url = `${this.url}?locale=${encodeURIComponent(locale)}`
    let response: Response
    try {
      response = await fetch(url, {
        headers: { 'X-Riot-Token': this.apiKey, 'Accept': 'application/json' },
      })
    } catch (error) {
      throw new RiftboundApiError(
        `Impossible de joindre ${this.region}.api.riotgames.com : ${(error as Error).message}`
      )
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      const hints: Record<number, string> = {
        401: 'clé absente ou invalide',
        403: 'clé expirée ou sans accès à Riftbound',
        429: 'limite de requêtes atteinte, réessaie dans un moment',
      }
      throw new RiftboundApiError(
        `L'API Riot a répondu ${response.status}${hints[response.status] ? ` (${hints[response.status]})` : ''}: ${body.slice(0, 300)}`,
        response.status
      )
    }

    return (await response.json()) as RiftboundContentDTO
  }
}
