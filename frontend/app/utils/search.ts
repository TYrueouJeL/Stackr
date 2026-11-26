import type { Card } from '~/utils/types'

/**
 * Même recherche que l'API : nom sans casse, ou code d'extension et numéro
 * (« OGN 209 », « ogn209 », « OGN », « 209 », « 09 »…).
 */
export function matchesCard(card: Pick<Card, 'id' | 'name' | 'setId' | 'collectorNumber'>, raw: string) {
  const text = raw.trim().toLowerCase()
  if (!text) return true
  if (card.name.toLowerCase().includes(text)) return true
  if (card.id.toLowerCase().includes(text.replace(/\s+/g, '-'))) return true
  const match = text.replace(/[\s\-_#/·.]+/g, ' ').trim().match(/^([a-z]{2,6})?\s*(\d{1,4})?$/)
  if (!match || (!match[1] && !match[2])) return false
  const [, setCode, number] = match
  const setOk = !setCode || card.setId.toLowerCase().startsWith(setCode)
  const n = card.collectorNumber
  const numberOk = !number || (n !== null && (String(n).padStart(3, '0').includes(number) || String(n).includes(number)))
  return setOk && numberOk
}
