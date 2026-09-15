// Recurrentes: ocurrencias semanales/mensuales/anuales, cuotas pendientes de generar, detección
// automática de cargos repetidos y proyección de saldo día a día ("¿llego a fin de mes?").
import type { Recurrente, Tx } from './types.ts'
import { daysBetween } from './dates.ts'
import { isFlow } from './flow.ts'
import { normalizeConcept } from './merchants.ts'
import { toCents, fromCents } from './money.ts'

const pad = (n: number) => String(n).padStart(2, '0')

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + days))
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}

function dayInMonth(y: number, m: number, day: number): string {
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return `${y}-${pad(m)}-${pad(Math.min(Math.max(1, day), last))}`
}

// Fechas de la recurrencia dentro de [from, to]. Mensual/anual en el día `day` (recortado a fin de
// mes); semanal cada 7·interval días desde startDate. Nunca antes de startDate.
export function occurrences(r: Recurrente, fromISO: string, toISO: string): string[] {
  const out: string[] = []
  if (fromISO > toISO) return out
  const freq = r.freq ?? 'monthly'
  const interval = Math.max(1, Math.floor(r.interval ?? 1))

  if (freq === 'weekly') {
    const start = r.startDate ?? fromISO
    const step = 7 * interval
    const gap = daysBetween(start, fromISO)
    let k = gap > 0 ? Math.ceil(gap / step) : 0
    for (;; k++) {
      const d = addDaysISO(start, k * step)
      if (d > toISO) break
      if (d >= fromISO) out.push(d)
    }
    return out
  }

  const stepMonths = freq === 'yearly' ? 12 * interval : interval
  const anchor = r.startDate ?? fromISO
  const [ay, am] = anchor.split('-').map(Number)
  const [fy, fm] = fromISO.split('-').map(Number)
  const anchorIdx = ay * 12 + (am - 1)
  const fromIdx = fy * 12 + (fm - 1)
  // Primer índice de mes alineado con la recurrencia que no quede antes del mes de `from`.
  let idx = anchorIdx + Math.max(0, Math.ceil((fromIdx - anchorIdx) / stepMonths)) * stepMonths
  for (let guard = 0; guard < 5000; guard++, idx += stepMonths) {
    const d = dayInMonth(Math.floor(idx / 12), (idx % 12) + 1, r.day)
    if (d > toISO) break
    if (d >= fromISO && (!r.startDate || d >= r.startDate)) out.push(d)
  }
  return out
}

// Ocurrencias que toca generar hoy: posteriores a lastRun; sin lastRun, SOLO las del mes actual
// hasta hoy (no se rellenan años hacia atrás al migrar un recurrente antiguo).
export function dueOccurrences(r: Recurrente, todayISO: string): string[] {
  if (!r.active) return []
  const from = r.lastRun ? addDaysISO(r.lastRun, 1) : `${todayISO.slice(0, 7)}-01`
  return occurrences(r, from, todayISO)
}

export interface RecurringSuggestion {
  key: string
  concept: string
  amount: number
  type: 'income' | 'expense'
  category: string
  day: number
  freq: 'weekly' | 'monthly' | 'yearly'
  cuenta?: string
}

function classifyGaps(gaps: number[]): RecurringSuggestion['freq'] | null {
  if (gaps.length === 0) return null
  if (gaps.every(g => g >= 26 && g <= 35)) return 'monthly'
  if (gaps.every(g => g >= 6 && g <= 8)) return 'weekly'
  if (gaps.every(g => g >= 355 && g <= 375)) return 'yearly'
  return null
}

// Propone (no crea) recurrentes: 3+ movimientos del mismo comercio o concepto, importes a ±10 % de la
// mediana y separaciones regulares.
export function detectRecurring(txs: Tx[], recurrentes: Recurrente[], dismissed: string[]): RecurringSuggestion[] {
  const groups = new Map<string, Tx[]>()
  for (const t of txs) {
    if (!isFlow(t)) continue
    const norm = normalizeConcept(t.concept)
    if (!t.merchantId && !norm) continue
    const key = `${t.merchantId ?? `c:${norm}`}|${t.type}`
    const list = groups.get(key)
    if (list) list.push(t)
    else groups.set(key, [t])
  }

  const covered = new Set(recurrentes.map(r => `${normalizeConcept(r.concept)}|${r.type}`))
  const out: RecurringSuggestion[] = []
  for (const [key, list] of groups) {
    if (list.length < 3 || dismissed.includes(key)) continue
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date))
    const last = sorted[sorted.length - 1]
    if (covered.has(`${normalizeConcept(last.concept)}|${last.type}`)) continue
    const cents = sorted.map(t => toCents(t.amount)).sort((a, b) => a - b)
    const mid = Math.floor(cents.length / 2)
    const median = cents.length % 2 ? cents[mid] : Math.round((cents[mid - 1] + cents[mid]) / 2)
    if (!cents.every(c => Math.abs(c - median) <= median * 0.1)) continue
    const gaps = sorted.slice(1).map((t, i) => daysBetween(sorted[i].date, t.date))
    const freq = classifyGaps(gaps)
    if (!freq) continue
    const counts = new Map<string, number>()
    for (const t of sorted) if (t.cuenta) counts.set(t.cuenta, (counts.get(t.cuenta) ?? 0) + 1)
    const cuenta = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    out.push({
      key,
      concept: last.concept,
      amount: fromCents(median),
      type: last.type,
      category: last.category,
      day: Number(last.date.slice(8, 10)),
      freq,
      ...(cuenta ? { cuenta } : {}),
    })
  }
  return out
}

export interface CashflowDay {
  date: string
  events: { concept: string; amount: number }[]
  balance: number
}

export function projectCashflow(startBalance: number, recurrentes: Recurrente[], fromISO: string, toISO: string): CashflowDay[] {
  const active = recurrentes.filter(r => r.active)
  const days: CashflowDay[] = []
  let balC = toCents(startBalance)
  for (let d = fromISO; d <= toISO; d = addDaysISO(d, 1)) {
    const events = active
      .filter(r => occurrences(r, d, d).length > 0)
      .map(r => ({ concept: r.concept, amount: r.type === 'income' ? r.amount : -r.amount }))
    for (const e of events) balC += toCents(e.amount)
    days.push({ date: d, events, balance: fromCents(balC) })
  }
  return days
}
