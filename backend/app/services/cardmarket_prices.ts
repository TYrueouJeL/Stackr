import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { normalizeName } from '#services/decklist_text'

/**
 * Prix Cardmarket : guide des prix quotidien, public et gratuit, que Cardmarket publie
 * pour Riftbound (jeu n°22). Sans compte ni clé. Le lien produit Cardmarket ↔ carte vient
 * d'OpenRift (base communautaire ouverte) ; à défaut, d'une correspondance par nom.
 */
const CARDMARKET = 'https://downloads.s3.cardmarket.com/productCatalog'
const GAME_ID = 22
const OPENRIFT = 'https://openrift.app/api/v1'

export interface PriceGuideRow {
  'idProduct': number
  'trend'?: number | null
  'low'?: number | null
  'avg7'?: number | null
  'avg30'?: number | null
  'trend-foil'?: number | null
  'low-foil'?: number | null
  'avg7-foil'?: number | null
}

export interface CardmarketProduct {
  idProduct: number
  name: string
  idExpansion?: number | null
  categoryName?: string | null
}

export interface OpenriftCatalog {
  printings?: Record<string, { publicCode?: string | null; shortCode?: string | null }>
}

export interface OpenriftLinks {
  links?: Record<string, { cardmarket?: { productId?: number | null } | null }>
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'stackr-collection/1.0 (daily price snapshot)',
    },
  })
  if (!response.ok) throw new Error(`${response.status} sur ${url}`)
  return (await response.json()) as T
}

/** « OGN-066a/298 » → « OGN-066A-298 » (format des identifiants de cartes du site) */
export function codeToCardId(code: string) {
  return code.trim().replace('/', '-').toUpperCase()
}

/** Produit Cardmarket → carte, via les impressions OpenRift */
export function mapFromOpenrift(catalog: OpenriftCatalog, links: OpenriftLinks) {
  const map = new Map<string, number>()
  for (const [printingId, link] of Object.entries(links.links ?? {})) {
    const productId = link?.cardmarket?.productId
    const printing = catalog.printings?.[printingId]
    const code = printing?.publicCode ?? printing?.shortCode
    if (!productId || !code) continue
    const cardId = codeToCardId(code)
    if (!map.has(cardId)) map.set(cardId, productId)
  }
  return map
}

const num = (v: unknown) => {
  const n = Number(v)
  return v === null || v === undefined || v === '' || !Number.isFinite(n) || n <= 0 ? null : n
}

export interface PriceUpdateResult {
  priced: number
  byOpenrift: number
  byName: number
  guideDate: string | null
}

/**
 * Calcule et enregistre les prix. Les données sont passées en paramètre pour pouvoir
 * tester sans réseau ; `updatePrices()` les télécharge.
 */
export async function savePrices(input: {
  guide: { createdAt?: string; priceGuides: PriceGuideRow[] }
  products: CardmarketProduct[]
  openrift: Map<string, number>
}): Promise<PriceUpdateResult> {
  const guide = new Map(input.guide.priceGuides.map((g) => [g.idProduct, g]))
  const cards = await db
    .from('cards as c')
    .join('card_sets as s', 's.id', 'c.set_id')
    .select('c.id', 'c.name', 'c.set_id', 'c.collector_number')

  // Correspondance par nom : un produit dont le nom désigne une seule carte de base
  const byName = new Map<string, number[]>()
  for (const p of input.products) {
    const key = normalizeName(p.name)
    byName.set(key, [...(byName.get(key) ?? []), p.idProduct])
  }
  const cardsByName = new Map<string, typeof cards>()
  for (const c of cards) {
    const key = normalizeName(c.name)
    cardsByName.set(key, [...(cardsByName.get(key) ?? []), c])
  }

  const now = DateTime.utc().toSQL({ includeOffset: false })
  const rows: Record<string, unknown>[] = []
  let viaOpenrift = 0
  let viaName = 0
  for (const card of cards) {
    let productId = input.openrift.get(card.id)
    let matchedBy = 'openrift'
    if (!productId) {
      const key = normalizeName(card.name)
      const products = byName.get(key) ?? []
      const prints = cardsByName.get(key) ?? []
      // Sans ambiguïté seulement : un seul produit et une seule impression de ce nom
      if (products.length === 1 && prints.length === 1) {
        productId = products[0]
        matchedBy = 'name'
      }
    }
    const price = productId ? guide.get(productId) : undefined
    if (!productId || !price) continue
    if (matchedBy === 'openrift') viaOpenrift++
    else viaName++
    rows.push({
      card_id: card.id,
      cardmarket_id: productId,
      trend: num(price.trend),
      low: num(price.low),
      avg7: num(price.avg7),
      avg30: num(price.avg30),
      trend_foil: num(price['trend-foil']),
      low_foil: num(price['low-foil']),
      avg7_foil: num(price['avg7-foil']),
      matched_by: matchedBy,
      updated_at: now,
    })
  }

  await db.transaction(async (trx) => {
    await trx.from('card_prices').delete()
    for (let i = 0; i < rows.length; i += 200) {
      await trx.table('card_prices').multiInsert(rows.slice(i, i + 200))
    }
  })
  return {
    priced: rows.length,
    byOpenrift: viaOpenrift,
    byName: viaName,
    guideDate: input.guide.createdAt ?? null,
  }
}

export async function updatePrices(): Promise<PriceUpdateResult> {
  const [guide, singles] = await Promise.all([
    getJson<{ createdAt?: string; priceGuides: PriceGuideRow[] }>(
      `${CARDMARKET}/priceGuide/price_guide_${GAME_ID}.json`
    ),
    getJson<{ products: CardmarketProduct[] }>(
      `${CARDMARKET}/productList/products_singles_${GAME_ID}.json`
    ).catch(() => ({ products: [] as CardmarketProduct[] })),
  ])
  let openrift = new Map<string, number>()
  try {
    const [catalog, links] = await Promise.all([
      getJson<OpenriftCatalog>(`${OPENRIFT}/catalog?langs=EN`),
      getJson<OpenriftLinks>(`${OPENRIFT}/prices/links`),
    ])
    openrift = mapFromOpenrift(catalog, links)
  } catch {
    // OpenRift indisponible : correspondance par nom uniquement
  }
  return savePrices({ guide, products: singles.products ?? [], openrift })
}

/** Date de la dernière mise à jour des prix */
export async function lastPriceUpdate(): Promise<string | null> {
  const row = await db.from('card_prices').max('updated_at as last').first()
  return row?.last ?? null
}

/** Prix affiché d'une carte : tendance normale, sinon tendance foil */
export function displayPrice(p: { trend?: unknown; trend_foil?: unknown } | null | undefined) {
  if (!p) return null
  return num(p.trend) ?? num(p.trend_foil)
}

export interface CardPrice {
  trend: number | null
  low: number | null
  avg30: number | null
  trendFoil: number | null
  lowFoil: number | null
  /** Prix retenu : tendance normale, sinon tendance foil */
  value: number | null
  url: string
}

/** Prix des cartes demandées, par identifiant de carte */
export async function pricesFor(cardIds: string[]): Promise<Map<string, CardPrice>> {
  const map = new Map<string, CardPrice>()
  const ids = [...new Set(cardIds)]
  for (let i = 0; i < ids.length; i += 500) {
    const rows = await db.from('card_prices').whereIn('card_id', ids.slice(i, i + 500))
    for (const r of rows) {
      map.set(r.card_id, {
        trend: num(r.trend),
        low: num(r.low),
        avg30: num(r.avg30),
        trendFoil: num(r.trend_foil),
        lowFoil: num(r.low_foil),
        value: displayPrice(r),
        url: `https://www.cardmarket.com/en/Riftbound/Products?idProduct=${r.cardmarket_id}`,
      })
    }
  }
  return map
}
