import type { Cuenta, Tx } from './types.ts'
import type { NetWorthBreakdown } from './networth.ts'
import { computeNetWorth } from './networth.ts'
import { toCents, fromCents, subEuros } from './money.ts'

export interface NwSnapshot extends NetWorthBreakdown {
  date: string
  estimated?: boolean
}

function sameNumbers(a: NwSnapshot, b: NetWorthBreakdown): boolean {
  return (
    a.liquid === b.liquid &&
    a.investments === b.investments &&
    a.property === b.property &&
    a.debt === b.debt &&
    a.net === b.net
  )
}

export function upsertTodaySnapshot(
  snaps: NwSnapshot[],
  today: string,
  breakdown: NetWorthBreakdown
): { snaps: NwSnapshot[]; changed: boolean } {
  for (const s of snaps) {
    if (s.date > today) return { snaps, changed: false }
  }
  const idx = snaps.findIndex(s => s.date === today)
  if (idx >= 0) {
    if (sameNumbers(snaps[idx], breakdown)) return { snaps, changed: false }
    const next = [...snaps]
    next[idx] = { ...snaps[idx], ...breakdown }
    next.sort((a, b) => a.date.localeCompare(b.date))
    return { snaps: next, changed: true }
  }
  const next = [...snaps, { ...breakdown, date: today }]
  next.sort((a, b) => a.date.localeCompare(b.date))
  return { snaps: next, changed: true }
}

function endOfMonthISO(year: number, month: number): string {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

function effectAfter(txs: Tx[], cuenta: string, afterDate: string): number {
  let cents = 0
  for (const t of txs) {
    if (t.cuenta !== cuenta) continue
    if (t.date <= afterDate) continue
    cents += t.type === 'income' ? toCents(t.amount) : -toCents(t.amount)
  }
  return fromCents(cents)
}

export function backfillEstimated(
  cuentas: Cuenta[],
  txs: Tx[],
  today: string,
  months = 12
): NwSnapshot[] {
  const out: NwSnapshot[] = []
  if (cuentas.length === 0 || txs.length === 0) return out
  const [y, m] = today.split('-').map(Number)
  const oldestTxDate = txs.reduce((min, t) => (t.date < min ? t.date : min), txs[0].date)
  for (let i = months; i >= 1; i--) {
    const target = new Date(y, m - i, 1)
    const ty = target.getFullYear()
    const tm = target.getMonth()
    const iso = endOfMonthISO(ty, tm)
    if (iso >= today) continue
    if (iso < oldestTxDate) continue
    const cuentasAt = cuentas.map(c => ({
      ...c,
      balance: subEuros(c.balance, effectAfter(txs, c.name, iso)),
    }))
    const b = computeNetWorth(cuentasAt)
    out.push({ ...b, date: iso, estimated: true })
  }
  return out
}

function periodStart(today: string, period: '1M' | '3M' | '1A' | 'Todo'): string {
  if (period === 'Todo') return '0000-01-01'
  const [y, m, d] = today.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (period === '1M') dt.setUTCMonth(dt.getUTCMonth() - 1)
  else if (period === '3M') dt.setUTCMonth(dt.getUTCMonth() - 3)
  else dt.setUTCFullYear(dt.getUTCFullYear() - 1)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

export function variation(
  snaps: NwSnapshot[],
  currentNet: number,
  today: string,
  period: '1M' | '3M' | '1A' | 'Todo'
): { abs: number; pct: number | null; fromDate: string | null } {
  const target = periodStart(today, period)
  const base = period === 'Todo'
    ? (snaps.length ? snaps[0] : null)
    : (snaps.filter(s => s.date <= target).pop() ?? snaps[0] ?? null)
  if (!base) return { abs: currentNet - 0, pct: null, fromDate: null }
  const abs = currentNet - base.net
  const pct = base.net === 0 ? null : (abs / base.net) * 100
  return { abs, pct, fromDate: base.date }
}
