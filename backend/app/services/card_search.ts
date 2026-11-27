/**
 * Recherche de cartes tolérante : nom sans casse, ou code d'extension et numéro.
 * « Cull the Weak » (OGN 209) est trouvée par « cull the weak », « OGN 209 », « ogn-209 »,
 * « ogn209 », « OGN », « 209 », « 20 », « 09 », « 9 »…
 */
export interface CardQuery {
  text: string
  setCode: string | null
  number: string | null
}

export function parseCardQuery(raw: string): CardQuery | null {
  const text = raw.trim()
  if (!text) return null
  const compact = text.replace(/[\s\-_#/·.]+/g, ' ').trim()
  const match = compact.match(/^([a-z]{2,6})?\s*(\d{1,4})?$/i)
  if (!match || (!match[1] && !match[2])) return { text, setCode: null, number: null }
  return { text, setCode: match[1]?.toUpperCase() ?? null, number: match[2] ?? null }
}

type Where = {
  orWhereRaw(sql: string, bindings: unknown[]): Where
  orWhere(callback: (q: any) => void): Where
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`)
const PADDED = "printf('%03d', collector_number)"

/** Ajoute à une requête sur `cards` la condition de recherche (à placer dans un where groupé) */
export function cardSearchConditions(q: Where, parsed: CardQuery) {
  const like = `%${escapeLike(parsed.text.toLowerCase())}%`
  q.orWhereRaw("lower(name) like ? escape '\\'", [like])
  q.orWhereRaw("lower(id) like ? escape '\\'", [
    `%${escapeLike(parsed.text.toLowerCase().replace(/\s+/g, '-'))}%`,
  ])
  const { setCode, number } = parsed
  if (setCode && number) {
    q.orWhere((sub) =>
      sub
        .whereRaw('upper(set_id) like ?', [`${setCode}%`])
        .whereRaw(`(${PADDED} like ? or cast(collector_number as text) like ?)`, [
          `%${number}%`,
          `%${number}%`,
        ])
    )
  } else if (setCode) {
    q.orWhereRaw('upper(set_id) like ?', [`${setCode}%`])
  } else if (number) {
    q.orWhereRaw(`(${PADDED} like ? or cast(collector_number as text) like ?)`, [
      `%${number}%`,
      `%${number}%`,
    ])
  }
  return q
}
