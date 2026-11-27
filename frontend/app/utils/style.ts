/**
 * Couleurs associées aux raretés et aux domaines Riftbound
 */
const RARITY: Record<string, string> = {
  common: 'common',
  uncommon: 'uncommon',
  rare: 'rare',
  epic: 'epic',
  showcase: 'showcase',
  promo: 'promo',
}

export function rarityClass(rarity: string | null | undefined) {
  return `rarity-${RARITY[(rarity ?? '').toLowerCase()] ?? 'common'}`
}

const DOMAINS: Record<string, string> = {
  fury: '#ef5b4c',
  calm: '#4cc38a',
  mind: '#4c8ff0',
  body: '#f39a3c',
  chaos: '#b067f0',
  order: '#f0d24c',
}

export function domainColors(faction: string | null | undefined): string[] {
  if (!faction) return []
  return faction
    .split('/')
    .map((d) => DOMAINS[d.trim().toLowerCase()])
    .filter((c): c is string => Boolean(c))
}

export function domainColor(faction: string | null | undefined, fallback = '#d9ab52') {
  return domainColors(faction)[0] ?? fallback
}

export function domainList(faction: string | null | undefined) {
  return (faction ?? '')
    .split('/')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((name) => ({ name, color: DOMAINS[name.toLowerCase()] ?? '#9aa3b8' }))
}
