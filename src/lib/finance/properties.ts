// Inmuebles: valor manual o revalorización por % anual desde la última tasación manual (o la compra).
// Es una ESTIMACIÓN: la UI debe decirlo ("valor estimado por índice, no tasación").
import { toCents, fromCents } from './money.ts'
import { addMonthsISO, daysBetween } from './dates.ts'
import type { Debt } from './debts.ts'

export interface Valuation {
  date: string
  value: number
  source: 'manual' | 'index'
}

export interface Property {
  id: string
  name: string
  kind: 'home' | 'rental' | 'garage' | 'land' | 'other'
  purchasePrice: number
  purchaseDate: string
  surface?: number
  postalCode?: string
  cadastralRef?: string
  valuationMode: 'manual' | 'annual_pct'
  annualPct?: number // 0.04 = 4 %/año
  valuations: Valuation[]
  includeInNw?: boolean
}

function lastValuation(p: Property, todayISO: string, onlyManual: boolean): { date: string; value: number } {
  const past = p.valuations
    .filter(v => v.date <= todayISO && (!onlyManual || v.source === 'manual'))
    .sort((a, b) => a.date.localeCompare(b.date))
  const last = past.at(-1)
  return last ? { date: last.date, value: last.value } : { date: p.purchaseDate, value: p.purchasePrice }
}

export function currentValue(p: Property, todayISO: string): number {
  if (p.valuationMode === 'manual') return lastValuation(p, todayISO, false).value
  const base = lastValuation(p, todayISO, true)
  const years = daysBetween(base.date, todayISO) / 365.25
  if (years <= 0) return base.value
  return fromCents(Math.round(toCents(base.value) * Math.pow(1 + (p.annualPct ?? 0), years)))
}

// Un punto por aniversario de la compra y el de hoy, para dibujar la evolución.
export function valueSeries(p: Property, todayISO: string): { date: string; value: number }[] {
  const points: { date: string; value: number }[] = []
  for (let k = 0; k < 200; k++) {
    const date = addMonthsISO(p.purchaseDate, 12 * k)
    if (date >= todayISO) break
    points.push({ date, value: currentValue(p, date) })
  }
  points.push({ date: todayISO, value: currentValue(p, todayISO) })
  return points
}

// Lo que es tuyo de verdad: valor menos las deudas ligadas a este inmueble.
export function equity(p: Property, debts: Debt[], todayISO: string): number {
  const linkedC = debts
    .filter(d => d.propertyId === p.id && d.includeInNw !== false)
    .reduce((s, d) => s + toCents(d.balance), 0)
  return fromCents(toCents(currentValue(p, todayISO)) - linkedC)
}
