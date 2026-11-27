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
  price?: CardPrice | null
}

export interface CardPrice {
  trend: number | null
  low: number | null
  avg30: number | null
  trendFoil: number | null
  lowFoil: number | null
  value: number | null
  url: string
}

export function formatEuro(value: number | null | undefined) {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

export interface HistoryEvent {
  id: number
  action: 'added' | 'removed'
  quantity: number
  createdAt: string
  details: {
    foil?: boolean
    condition?: string
    language?: string
    storage?: string | null
    decklist?: string | null
  } | null
  card: Pick<Card, 'id' | 'name' | 'setId' | 'collectorNumber' | 'thumbnailUrl' | 'rarity'> | null
}

export interface HistoryPage {
  meta: { total: number; perPage: number; currentPage: number; lastPage: number }
  totals: { added: number; removed: number }
  data: HistoryEvent[]
}

export interface ShoppingLine {
  key: string
  name: string
  card: Card
  needed: number
  available: number
  missing: number
  decklists: { id: number; name: string; quantity: number }[]
  price: CardPrice | null
  total: number | null
}

export interface ShoppingList {
  decklists: { id: number; name: string; selected: boolean }[]
  totalNeeded: number
  totalMissing: number
  lines: ShoppingLine[]
  totalCost: number
  unpriced: number
  text: string
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
  binderPage?: number | null
  binderSlot?: number | null
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
  kind: StorageKind
  pocketsPerPage: number | null
  pageCount: number | null
  copies: number
  decklists: { id: number; name: string }[]
  preview: { name: string; imageUrl: string }[]
}

export type StorageKind = 'box' | 'deck_box' | 'binder'

export const STORAGE_KINDS: Record<StorageKind, { label: string; icon: string }> = {
  box: { label: 'Boîte', icon: '📦' },
  deck_box: { label: 'Deck box', icon: '🎴' },
  binder: { label: 'Classeur', icon: '📖' },
}

export const POCKET_LAYOUTS = [4, 9, 12, 16, 18] as const

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
  legality: { legal: boolean; issues: number }
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
  value: number
  missingValue: number
  entries: {
    section: DeckSection
    card: Card
    quantity: number
    assigned: Copy[]
    missing: number
    available: number
  }[]
  sections: { section: DeckSection; count: number }[]
  legality: {
    legal: boolean
    sections: { section: DeckSection; count: number; min: number; max: number; ok: boolean }[]
    issues: string[]
  }
  extraCopies: Copy[]
}

export interface Paginated<T> {
  meta: { total: number; perPage: number; currentPage: number; lastPage: number }
  data: T[]
}

export const CONDITIONS = ['M', 'NM', 'EX', 'GD', 'LP', 'PL', 'PO'] as const
