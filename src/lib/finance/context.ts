// Contexto compacto de Finanzas para el asistente (CompAI / futuro Agente personal): no se le pasa la base
// de datos, sino ~1-3 KB precalculados. Todo en euros redondeados.
import type { Cuenta, Presupuesto, Pufo, Recurrente, Tx } from './types.ts'
import { computeNetWorth, type NetWorthBreakdown } from './networth.ts'
import { variation, type NwSnapshot } from './snapshots.ts'
import { portfolio, type Holding, type PriceCache } from './investments.ts'
import { nextPaymentSplit, type Debt } from './debts.ts'
import { currentValue, type Property } from './properties.ts'
import { budgetStatus, prevMonthKey } from './budgets.ts'
import { addDaysISO, occurrences } from './recurring.ts'
import { flowAmount } from './split.ts'
import { isFlow } from './flow.ts'
import { roundEuros, sumEuros, toCents, fromCents } from './money.ts'
import { DISCLAIMER } from './simulators.ts'

export interface FinanceState {
  txs: Tx[]
  cuentas: Cuenta[]
  holdings: Holding[]
  priceCache: PriceCache
  debts: Debt[]
  properties: Property[]
  presupuestos: Presupuesto[]
  recurrentes: Recurrente[]
  pufos: Pufo[]
  snapshots: NwSnapshot[]
}

export interface FinanceContext {
  generatedAt: string
  disclaimer: string
  netWorth: { now: number; breakdown: NetWorthBreakdown; var1M: number | null; var3M: number | null; var1A: number | null }
  month: { key: string; income: number; expense: number; savingsRate: number | null }
  topCategories: { category: string; amount: number; avg6m: number; deltaPct: number | null }[]
  budgets: { category: string; pct: number; level: 'warn' | 'over' }[]
  upcoming: { date: string; concept: string; amount: number }[]
  portfolio: { value: number; unrealized: number; byKind: Partial<Record<string, number>> }
  debts: { total: number; monthlyPayments: number }
  receivables: { meDeben: number; lesDebo: number }
}

function flowSums(txs: Tx[], monthKey: string) {
  let incomeC = 0
  let expenseC = 0
  const byCat = new Map<string, number>()
  for (const t of txs) {
    if (!isFlow(t) || !t.date.startsWith(monthKey)) continue
    const c = toCents(flowAmount(t))
    if (t.type === 'income') incomeC += c
    else {
      expenseC += c
      byCat.set(t.category, (byCat.get(t.category) ?? 0) + c)
    }
  }
  return { incomeC, expenseC, byCat }
}

export function buildFinanceContext(s: FinanceState, todayISO: string, now = Date.now()): FinanceContext {
  const pf = portfolio(s.holdings, s.priceCache, now)
  const extras = {
    investments: pf.value,
    debt: sumEuros(s.debts.filter(d => d.includeInNw !== false).map(d => d.balance)),
    property: sumEuros(s.properties.filter(p => p.includeInNw !== false).map(p => currentValue(p, todayISO))),
  }
  const breakdown = computeNetWorth(s.cuentas, extras)
  const varOf = (p: '1M' | '3M' | '1A') => {
    const v = variation(s.snapshots, breakdown.net, todayISO, p)
    return v.fromDate ? roundEuros(v.abs) : null
  }

  const month = todayISO.slice(0, 7)
  const cur = flowSums(s.txs, month)
  const past: Map<string, number>[] = []
  let mk = month
  for (let i = 0; i < 6; i++) { mk = prevMonthKey(mk); past.push(flowSums(s.txs, mk).byCat) }
  const topCategories = [...cur.byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, c]) => {
      const avgC = Math.round(past.reduce((sum, m) => sum + (m.get(category) ?? 0), 0) / 6)
      return { category, amount: fromCents(c), avg6m: fromCents(avgC), deltaPct: avgC > 0 ? Math.round(((c - avgC) / avgC) * 100) : null }
    })

  const budgets = s.presupuestos
    .map(p => ({ p, st: budgetStatus(p, s.txs, month) }))
    .filter(({ st }) => st.level !== 'ok')
    .map(({ p, st }) => ({ category: p.category, pct: Math.round(st.pct), level: st.level as 'warn' | 'over' }))

  const upcoming = s.recurrentes
    .filter(r => r.active)
    .flatMap(r => occurrences(r, addDaysISO(todayISO, 1), addDaysISO(todayISO, 14))
      .map(date => ({ date, concept: r.concept, amount: r.type === 'income' ? r.amount : -r.amount })))
    .sort((a, b) => a.date.localeCompare(b.date))

  const active = s.pufos.filter(p => !p.settled)
  return {
    generatedAt: new Date(now).toISOString(),
    disclaimer: DISCLAIMER,
    netWorth: { now: breakdown.net, breakdown, var1M: varOf('1M'), var3M: varOf('3M'), var1A: varOf('1A') },
    month: {
      key: month,
      income: fromCents(cur.incomeC),
      expense: fromCents(cur.expenseC),
      savingsRate: cur.incomeC > 0 ? Math.round(((cur.incomeC - cur.expenseC) / cur.incomeC) * 100) : null,
    },
    topCategories,
    budgets,
    upcoming,
    portfolio: { value: pf.value, unrealized: pf.unrealized, byKind: pf.byKind },
    debts: { total: extras.debt, monthlyPayments: sumEuros(s.debts.map(d => nextPaymentSplit(d, todayISO).total)) },
    receivables: {
      meDeben: sumEuros(active.filter(p => p.dir === 'me_debe').map(p => p.amount)),
      lesDebo: sumEuros(active.filter(p => p.dir === 'le_debo').map(p => p.amount)),
    },
  }
}
