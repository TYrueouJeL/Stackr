import db from '@adonisjs/lucid/services/db'

/**
 * Sections d'une decklist Riftbound, dans l'ordre d'affichage et d'export
 */
export const SECTIONS = ['legend', 'champion', 'main', 'battlefield', 'rune', 'sideboard'] as const
export type Section = (typeof SECTIONS)[number]

/** Titres utilisés à l'export (même format que les deckbuilders Riftbound) */
const EXPORT_HEADERS: Record<Section, string> = {
  legend: 'Legend',
  champion: 'Champion',
  main: 'MainDeck',
  battlefield: 'Battlefields',
  rune: 'Runes',
  sideboard: 'Sideboard',
}

/** Titres reconnus à l'import (anglais et français) */
const HEADER_ALIASES: Record<string, Section> = {
  legend: 'legend',
  legends: 'legend',
  legende: 'legend',
  champion: 'champion',
  champions: 'champion',
  chosenchampion: 'champion',
  maindeck: 'main',
  main: 'main',
  deck: 'main',
  deckprincipal: 'main',
  battlefield: 'battlefield',
  battlefields: 'battlefield',
  champsdebataille: 'battlefield',
  champdebataille: 'battlefield',
  rune: 'rune',
  runes: 'rune',
  runedeck: 'rune',
  sideboard: 'sideboard',
  side: 'sideboard',
  reserve: 'sideboard',
}

export function sectionForType(type: string | null | undefined): Section {
  if (type === 'Legend') return 'legend'
  if (type === 'Rune') return 'rune'
  if (type === 'Battlefield') return 'battlefield'
  return 'main'
}

function stripAccents(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * Normalise un nom de carte : "Rek'Sai, Void Burrower" et "Rek'sai - Void Burrower"
 * donnent la même clé. Les mentions entre parenthèses (Alternate Art…) sont ignorées.
 */
export function normalizeName(name: string) {
  return stripAccents(name)
    .toLowerCase()
    .replace(/[’`´]/g, "'")
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+-\s+|,/g, ' ')
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface ParsedLine {
  section: Section | null
  quantity: number
  label: string
  raw: string
}

export function parseDecklist(text: string): ParsedLine[] {
  const lines: ParsedLine[] = []
  let section: Section | null = null
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || line.startsWith('//')) continue

    const header = stripAccents(line)
      .toLowerCase()
      .replace(/[:\s_-]/g, '')
      .replace(/\(\d+\)$/, '')
    if (!/^\d/.test(line) && HEADER_ALIASES[header]) {
      section = HEADER_ALIASES[header]
      continue
    }

    const match = line.match(/^(\d+)\s*x?\s+(.+)$/i)
    lines.push({
      section,
      quantity: match ? Number(match[1]) : 1,
      label: (match ? match[2] : line).trim(),
      raw: line,
    })
  }
  return lines
}

interface CardRef {
  id: string
  name: string
  type: string | null
}

/**
 * Retrouve les cartes par identifiant ou par nom. Pour un nom imprimé plusieurs fois,
 * on garde l'impression de base (ni variante, ni promo) de l'extension la plus ancienne.
 */
export async function buildCardResolver() {
  const cards = await db
    .from('cards as c')
    .join('card_sets as s', 's.id', 'c.set_id')
    .select('c.id', 'c.name', 'c.type', 'c.rarity', 'c.collector_number', 's.position')

  const score = (c: (typeof cards)[number]) =>
    (/\(/.test(c.name) ? 1_000_000 : 0) +
    (c.rarity === 'Promo' ? 100_000 : 0) +
    Number(c.position ?? 0) * 1000 +
    Number(c.collector_number ?? 0)

  const byName = new Map<string, { card: CardRef; score: number }>()
  const byId = new Map<string, CardRef>()
  for (const c of cards) {
    const ref = { id: c.id, name: c.name, type: c.type }
    byId.set(String(c.id).toLowerCase(), ref)
    const key = normalizeName(c.name)
    const s = score(c)
    const current = byName.get(key)
    if (!current || s < current.score) byName.set(key, { card: ref, score: s })
  }

  return (label: string): CardRef | null =>
    byId.get(label.toLowerCase()) ?? byName.get(normalizeName(label))?.card ?? null
}

/** "Rek'sai - Void Burrower" → "Rek'sai, Void Burrower" */
export function displayName(name: string) {
  return name.replace(/\s+-\s+/, ', ')
}

export function formatDecklist(entries: { section: string; quantity: number; name: string }[]) {
  const blocks: string[] = []
  for (const section of SECTIONS) {
    const lines = entries
      .filter((e) => e.section === section)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((e) => `${e.quantity} ${displayName(e.name)}`)
    if (lines.length) blocks.push(`${EXPORT_HEADERS[section]}:\n${lines.join('\n')}`)
  }
  return blocks.join('\n\n')
}
