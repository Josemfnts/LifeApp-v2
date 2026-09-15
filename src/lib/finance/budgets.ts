// Presupuestos por categoría y mes, con rollover opcional (lo no gastado —o el exceso— se arrastra).
import type { Presupuesto, Tx } from './types.ts'
import { isFlow } from './flow.ts'
import { toCents, fromCents } from './money.ts'
import { flowAmount } from './split.ts'

export interface BudgetStatus {
  spent: number
  carry: number
  available: number
  pct: number
  level: 'ok' | 'warn' | 'over'
}

export function nextMonthKey(mk: string): string {
  const [y, m] = mk.split('-').map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

export function prevMonthKey(mk: string): string {
  const [y, m] = mk.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

function spentCents(p: Presupuesto, txs: Tx[], monthKey: string): number {
  return txs
    .filter(t => t.type === 'expense' && isFlow(t) && t.category === p.category && t.date.startsWith(monthKey))
    .reduce((s, t) => s + toCents(flowAmount(t)), 0) // en gastos compartidos solo cuenta mi parte
}

export function budgetStatus(p: Presupuesto, txs: Tx[], monthKey: string): BudgetStatus {
  const limitC = toCents(p.limit)
  let carryC = 0
  if (p.rollover) {
    for (let mk = p.since ?? monthKey; mk < monthKey; mk = nextMonthKey(mk)) {
      carryC += limitC - spentCents(p, txs, mk)
    }
  }
  const spentC = spentCents(p, txs, monthKey)
  const availC = limitC + carryC
  const pct = availC > 0 ? (spentC / availC) * 100 : spentC > 0 ? 100 : 0
  const level: BudgetStatus['level'] = (availC <= 0 && spentC > 0) || pct > 100 ? 'over' : pct >= 80 ? 'warn' : 'ok'
  return { spent: fromCents(spentC), carry: fromCents(carryC), available: fromCents(availC), pct, level }
}
