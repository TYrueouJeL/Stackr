export interface Card {
  id: string
  setId: string
  collectorNumber: number | null
  name: string
  description: string | null
  type: string | null
  rarity: string | null
  faction: string | null
  stats: { energy: number | null; might: number | null; cost: number | null; power: number | null }
  keywords: string[]
  tags: string[]
  flavorText: string | null
  thumbnailUrl: string | null
  fullUrl: string | null
  artist: string | null
  owned?: number
}

export interface SetSummary {
  id: string
  name: string
  totalCards: number
  ownedCards: number
  totalCopies: number
  completion: number
}

export interface SetDetail extends SetSummary {
  byRarity: Record<string, { total: number; owned: number }>
  cards: (Card & { owned: number })[]
}

export interface NamedRef {
  id: number
  name: string
}

export interface Copy {
  id: number
  cardId: string
  storageLocationId: number | null
  decklistId: number | null
  foil: boolean
  condition: string
  language: string
  notes: string | null
  createdAt: string
  card?: Card
  storageLocation?: NamedRef | null
  decklist?: NamedRef | null
}

export interface CardDetail extends Card {
  set: { id: string; name: string }
  owned: number
  copies: Copy[]
  decklists: { id: number; name: string; quantity: number; assigned: number }[]
}

export interface StorageLocation {
  id: number
  name: string
  description: string | null
  copies: number
  decklists: { id: number; name: string }[]
}

export interface DecklistSummary {
  id: number
  name: string
  description: string | null
  totalCards: number
  assignedCopies: number
  complete: boolean
  storageLocation: { id: number; name: string } | null
  legend: { id: string; name: string; thumbnailUrl: string | null } | null
  domains: string[]
  images: string[]
}

export type DeckSection = 'legend' | 'champion' | 'main' | 'battlefield' | 'rune' | 'sideboard'

export const SECTION_LABELS: Record<DeckSection, string> = {
  legend: 'Légende',
  champion: 'Champion choisi',
  main: 'Deck principal',
  battlefield: 'Champs de bataille',
  rune: 'Runes',
  sideboard: 'Sideboard',
}

export interface DecklistDetail {
  id: number
  name: string
  description: string | null
  storageLocation: { id: number; name: string } | null
  totalCards: number
  assignedCopies: number
  missingCards: number
  entries: {
    section: DeckSection
    card: Card
    quantity: number
    assigned: Copy[]
    missing: number
    available: number
  }[]
  sections: { section: DeckSection; count: number }[]
  extraCopies: Copy[]
}

export interface Paginated<T> {
  meta: { total: number; perPage: number; currentPage: number; lastPage: number }
  data: T[]
}

export const CONDITIONS = ['M', 'NM', 'EX', 'GD', 'LP', 'PL', 'PO'] as const
