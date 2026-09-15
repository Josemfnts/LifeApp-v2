// Inversiones: posiciones con lotes de compra, ventas FIFO, P&L y valoración.
// Dinero en céntimos (vía money.ts); cantidades de activo como number (acciones, cripto con decimales).
import { toCents, fromCents } from './money.ts'

export type HoldingKind = 'stock' | 'etf' | 'fund' | 'crypto' | 'bond' | 'other'

export interface Lot {
  id: string
  date: string
  quantity: number
  unitCost: number // EUR por unidad
  fees: number
  source?: 'buy' | 'dca' | 'staking' | 'airdrop' | 'split'
}

export interface Sale {
  id: string
  date: string
  quantity: number
  unitPrice: number
  fees: number
}

export interface DcaPlan {
  amount: number
  day: number // 1-28
  cuenta: string
  active: boolean
  lastRun?: string // YYYY-MM
}

export interface Holding {
  id: string
  kind: HoldingKind
  name: string
  symbol?: string
  isin?: string
  coingeckoId?: string
  image?: string
  manualPrice?: number // EUR
  priceAt?: string // YYYY-MM-DD del precio manual
  cuenta?: string
  includeInNw?: boolean
  lots: Lot[]
  sales: Sale[]
  dca?: DcaPlan
}

export interface PriceQuote {
  eur: number
  change24h?: number
  at: number // epoch ms
}
export type PriceCache = Record<string, PriceQuote>

export interface Position {
  quantity: number
  costBasis: number
  avgCost: number
  realized: number
}

const EPS = 1e-9
const roundQty = (q: number) => Math.round(q * 1e10) / 1e10

// Staking y airdrops no costaron dinero: su coste de adquisición es 0 (las comisiones sí cuentan).
function isFree(l: Lot): boolean {
  return l.source === 'staking' || l.source === 'airdrop'
}

// Reproduce compras y ventas en orden cronológico (compras antes que ventas el mismo día) y consume
// los lotes por FIFO. Lanza si una venta supera lo que había en cartera en esa fecha.
export function position(h: Holding): Position {
  type Event = { date: string; order: number; lot?: Lot; sale?: Sale }
  const events: Event[] = [
    ...h.lots.map(lot => ({ date: lot.date, order: 0, lot })),
    ...h.sales.map(sale => ({ date: sale.date, order: 1, sale })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order)

  const open: { qty: number; costCents: number }[] = []
  let realizedCents = 0

  for (const e of events) {
    if (e.lot) {
      const l = e.lot
      open.push({ qty: l.quantity, costCents: (isFree(l) ? 0 : toCents(l.quantity * l.unitCost)) + toCents(l.fees) })
      continue
    }
    const s = e.sale as Sale
    const available = roundQty(open.reduce((sum, l) => sum + l.qty, 0))
    if (s.quantity > available + EPS) {
      throw new Error(`La venta del ${s.date} (${s.quantity}) supera lo que había en cartera (${available}) en ${h.name}`)
    }
    let remaining = s.quantity
    let consumedCents = 0
    while (remaining > EPS && open.length > 0) {
      const lot = open[0]
      const take = Math.min(lot.qty, remaining)
      const portion = lot.qty - take <= EPS ? lot.costCents : Math.round((lot.costCents * take) / lot.qty)
      lot.costCents -= portion
      lot.qty = roundQty(lot.qty - take)
      consumedCents += portion
      remaining = roundQty(remaining - take)
      if (lot.qty <= EPS) open.shift()
    }
    const proceedsCents = toCents(s.quantity * s.unitPrice) - toCents(s.fees)
    realizedCents += proceedsCents - consumedCents
  }

  const quantity = roundQty(open.reduce((sum, l) => sum + l.qty, 0))
  const costCents = open.reduce((sum, l) => sum + l.costCents, 0)
  return {
    quantity,
    costBasis: fromCents(costCents),
    avgCost: quantity > EPS ? costCents / 100 / quantity : 0,
    realized: fromCents(realizedCents),
  }
}

export interface ResolvedPrice {
  price: number
  source: 'live' | 'manual' | 'cost'
  asOf: string | null
  stale: boolean
}

const LIVE_MAX_MS = 15 * 60 * 1000

// Nunca devuelve 0 por falta de precio: en vivo reciente → manual → último en vivo (marcado viejo) → coste.
export function resolvePrice(h: Holding, cache: PriceCache, now: number): ResolvedPrice {
  const quote = h.coingeckoId ? cache[h.coingeckoId] : undefined
  if (quote && now - quote.at <= LIVE_MAX_MS) {
    return { price: quote.eur, source: 'live', asOf: new Date(quote.at).toISOString(), stale: false }
  }
  if (h.manualPrice !== undefined && h.manualPrice > 0) {
    const maxDays = h.kind === 'fund' ? 3 : 7
    const at = h.priceAt ? Date.parse(`${h.priceAt}T12:00:00`) : NaN
    const stale = Number.isNaN(at) || (now - at) / 86_400_000 > maxDays
    return { price: h.manualPrice, source: 'manual', asOf: h.priceAt ?? null, stale }
  }
  if (quote) {
    return { price: quote.eur, source: 'live', asOf: new Date(quote.at).toISOString(), stale: true }
  }
  let avg = 0
  try { avg = position(h).avgCost } catch { avg = 0 }
  return { price: avg, source: 'cost', asOf: null, stale: false }
}

export interface Valuation {
  value: number
  unrealized: number
  unrealizedPct: number | null
}

export function valuation(h: Holding, price: number): Valuation {
  const pos = position(h)
  const valueCents = toCents(pos.quantity * price)
  const costCents = toCents(pos.costBasis)
  return {
    value: fromCents(valueCents),
    unrealized: fromCents(valueCents - costCents),
    unrealizedPct: costCents > 0 ? ((valueCents - costCents) / costCents) * 100 : null,
  }
}

export interface Portfolio {
  value: number
  cost: number
  unrealized: number
  realized: number
  byKind: Partial<Record<HoldingKind, number>>
  invalid: string[] // posiciones con ventas imposibles: se excluyen en vez de romper la pantalla
}

export function portfolio(holdings: Holding[], cache: PriceCache, now: number): Portfolio {
  let valueC = 0
  let costC = 0
  let realizedC = 0
  const byKindC: Partial<Record<HoldingKind, number>> = {}
  const invalid: string[] = []
  for (const h of holdings) {
    if (h.includeInNw === false) continue
    let pos: Position
    try { pos = position(h) } catch { invalid.push(h.name); continue }
    const { price } = resolvePrice(h, cache, now)
    const v = toCents(pos.quantity * price)
    valueC += v
    costC += toCents(pos.costBasis)
    realizedC += toCents(pos.realized)
    byKindC[h.kind] = (byKindC[h.kind] ?? 0) + v
  }
  const byKind: Partial<Record<HoldingKind, number>> = {}
  for (const [k, c] of Object.entries(byKindC)) byKind[k as HoldingKind] = fromCents(c as number)
  return {
    value: fromCents(valueC),
    cost: fromCents(costC),
    unrealized: fromCents(valueC - costC),
    realized: fromCents(realizedC),
    byKind,
    invalid,
  }
}

// Split N:1 (ratio = N): multiplica cantidades y divide precios; el coste total no cambia.
export function applySplit(h: Holding, ratio: number): Holding {
  if (!(ratio > 0)) throw new Error('El ratio del split debe ser mayor que 0')
  return {
    ...h,
    manualPrice: h.manualPrice !== undefined ? h.manualPrice / ratio : undefined,
    lots: h.lots.map(l => ({ ...l, quantity: roundQty(l.quantity * ratio), unitCost: l.unitCost / ratio })),
    sales: h.sales.map(s => ({ ...s, quantity: roundQty(s.quantity * ratio), unitPrice: s.unitPrice / ratio })),
  }
}

export function dcaDue(h: Holding, todayISO: string): boolean {
  const d = h.dca
  if (!d || !d.active || !(d.amount > 0)) return false
  return d.day <= Number(todayISO.slice(8, 10)) && d.lastRun !== todayISO.slice(0, 7)
}
