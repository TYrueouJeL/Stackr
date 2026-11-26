import { type Section, normalizeName } from '#services/decklist_text'

/**
 * Règles de construction officielles Riftbound (Tournament Rules 402.1, 403.3, 601.1) :
 * 1 Légende, un Champion choisi qui correspond à la Légende, un Main Deck d'exactement
 * 40 cartes champion compris (donc 39 + 1), 12 runes, exactement 3 champs de bataille
 * aux noms distincts, sideboard de 10 cartes au plus, 3 exemplaires max d'un même nom
 * (Main Deck + champion + sideboard), et uniquement des cartes des domaines de la Légende.
 */
export const RULES = {
  legend: { min: 1, max: 1 },
  champion: { min: 1, max: 1 },
  main: { min: 39, max: 39 },
  battlefield: { min: 3, max: 3 },
  rune: { min: 12, max: 12 },
  sideboard: { min: 0, max: 10 },
} as const satisfies Record<Section, { min: number; max: number }>

export const MAX_COPIES = 3

export interface LegalityEntry {
  section: string
  quantity: number
  card: { name: string; type: string | null; faction: string | null; keywords?: unknown }
}

export interface Legality {
  legal: boolean
  sections: { section: Section; count: number; min: number; max: number; ok: boolean }[]
  issues: string[]
}

const LABELS: Record<Section, string> = {
  legend: 'Légende',
  champion: 'Champion choisi',
  main: 'Main deck',
  battlefield: 'Champs de bataille',
  rune: 'Runes',
  sideboard: 'Sideboard',
}

const domainsOf = (faction: string | null) =>
  (faction ?? '')
    .split('/')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)

/** "Rek'Sai - Breacher" et "Rek'sai, Void Burrower" → "reksai" */
const championName = (name: string) => normalizeName(name.split(/\s+-\s+|,/)[0])

function keywordsOf(card: LegalityEntry['card']): string[] {
  const raw = card.keywords
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
      return []
    }
  }
  return []
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`

function expected(min: number, max: number) {
  if (min === max) return `exactement ${min}`
  if (min === 0) return `${max} au plus`
  return `entre ${min} et ${max}`
}

export function checkLegality(entries: LegalityEntry[]): Legality {
  const issues: string[] = []
  const inSection = (s: Section) => entries.filter((e) => e.section === s)
  const count = (s: Section) => inSection(s).reduce((sum, e) => sum + e.quantity, 0)

  const sections = (Object.keys(RULES) as Section[]).map((section) => {
    const { min, max } = RULES[section]
    const n = count(section)
    const ok = n >= min && n <= max
    if (!ok) {
      issues.push(`${LABELS[section]} : ${plural(n, 'carte')}, il en faut ${expected(min, max)}.`)
    }
    return { section, count: n, min, max, ok }
  })

  // Bon type de carte dans chaque section
  const typeRules: [Section, (type: string) => boolean, string][] = [
    ['legend', (t) => t === 'legend', 'doit être une Légende'],
    ['champion', (t) => t === 'unit', 'doit être une unité champion'],
    ['battlefield', (t) => t === 'battlefield', 'doit être un champ de bataille'],
    ['rune', (t) => t === 'rune', 'doit être une rune'],
  ]
  for (const [section, accepts, message] of typeRules) {
    for (const e of inSection(section)) {
      if (!accepts((e.card.type ?? '').toLowerCase())) {
        issues.push(`${e.card.name} (${LABELS[section]}) ${message}.`)
      }
    }
  }
  for (const section of ['main', 'sideboard'] as const) {
    for (const e of inSection(section)) {
      const type = (e.card.type ?? '').toLowerCase()
      if (['legend', 'rune', 'battlefield'].includes(type)) {
        issues.push(`${e.card.name} (${e.card.type}) n'a pas sa place dans « ${LABELS[section]} ».`)
      }
    }
  }

  // Le champion choisi correspond à la Légende (et n'est pas une carte Signature)
  const legend = inSection('legend')[0]?.card
  const champion = inSection('champion')[0]?.card
  if (legend && champion) {
    if (championName(legend.name) !== championName(champion.name)) {
      issues.push(
        `Le champion choisi (${champion.name}) ne correspond pas à la Légende (${legend.name}).`
      )
    } else if (keywordsOf(champion).some((k) => k.toLowerCase() === 'signature')) {
      issues.push(
        `${champion.name} est une carte Signature, elle ne peut pas être le champion choisi.`
      )
    }
  }

  // 3 exemplaires max d'un même nom, main deck + champion + sideboard
  const byName = new Map<string, { name: string; total: number }>()
  for (const e of entries) {
    if (!['champion', 'main', 'sideboard'].includes(e.section)) continue
    const key = normalizeName(e.card.name)
    const current = byName.get(key) ?? { name: e.card.name, total: 0 }
    current.total += e.quantity
    byName.set(key, current)
  }
  for (const { name, total } of byName.values()) {
    if (total > MAX_COPIES) {
      issues.push(`${name} : ${total} exemplaires (deck + sideboard), ${MAX_COPIES} au maximum.`)
    }
  }

  // Champs de bataille aux noms distincts
  const battlefieldNames = inSection('battlefield').map((e) => normalizeName(e.card.name))
  if (
    new Set(battlefieldNames).size !== battlefieldNames.length ||
    inSection('battlefield').some((e) => e.quantity > 1)
  ) {
    issues.push('Les 3 champs de bataille doivent avoir des noms différents.')
  }

  // Domaines : toutes les cartes doivent appartenir aux domaines de la Légende
  if (legend) {
    const allowed = new Set(domainsOf(legend.faction))
    if (allowed.size) {
      const offDomain = new Set<string>()
      for (const e of entries) {
        if (e.section === 'legend' || e.section === 'battlefield') continue
        const domains = domainsOf(e.card.faction)
        if (domains.some((d) => !allowed.has(d))) offDomain.add(e.card.name)
      }
      for (const name of offDomain) {
        issues.push(`${name} n'est pas dans les domaines de la Légende (${legend.faction}).`)
      }
    }
  }

  return { legal: issues.length === 0, sections, issues }
}
