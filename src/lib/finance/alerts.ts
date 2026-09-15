// Avisos de Finanzas. Tres tipos, no más (es muy fácil pasarse y que se desactiven todos):
// cargo previsto en los próximos días, presupuesto al 80 %/superado, y resumen del mes el día 1.
import type { Presupuesto, Recurrente, Tx } from './types.ts'
import { budgetStatus, prevMonthKey } from './budgets.ts'
import { addDaysISO, occurrences } from './recurring.ts'
import { isFlow } from './flow.ts'
import { toCents } from './money.ts'

export interface FinanceAlert {
  id: string // estable: sirve para no repetir el aviso
  kind: 'upcoming' | 'budget' | 'summary'
  title: string
  body: string
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function eur(n: number): string {
  const [int, dec] = Math.abs(n).toFixed(2).split('.')
  return `${n < 0 ? '−' : ''}${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec} €`
}

export function computeFinanceAlerts(
  state: { txs: Tx[]; presupuestos: Presupuesto[]; recurrentes: Recurrente[] },
  todayISO: string,
): FinanceAlert[] {
  const alerts: FinanceAlert[] = []
  const month = todayISO.slice(0, 7)

  for (const r of state.recurrentes) {
    if (!r.active) continue
    const days = Math.max(1, r.notifyDaysBefore ?? 1)
    for (const d of occurrences(r, addDaysISO(todayISO, 1), addDaysISO(todayISO, days))) {
      alerts.push({
        id: `upcoming:${r.id}:${d}`,
        kind: 'upcoming',
        title: `${r.type === 'income' ? 'Ingreso' : 'Cargo'} previsto: ${r.concept}`,
        body: `${eur(r.amount)} el ${Number(d.slice(8, 10))} de ${MONTHS[Number(d.slice(5, 7)) - 1]}`,
      })
    }
  }

  for (const p of state.presupuestos) {
    const s = budgetStatus(p, state.txs, month)
    if (s.level === 'ok') continue
    alerts.push({
      id: `budget:${p.category}:${month}:${s.level}`,
      kind: 'budget',
      title: s.level === 'over' ? `Presupuesto superado: ${p.category}` : `Presupuesto al ${Math.floor(s.pct)} %: ${p.category}`,
      body: `${eur(s.spent)} gastados de ${eur(s.available)}`,
    })
  }

  if (todayISO.slice(8, 10) === '01') {
    const prev = prevMonthKey(month)
    const flow = state.txs.filter(t => isFlow(t) && t.date.startsWith(prev))
    const incomeC = flow.filter(t => t.type === 'income').reduce((s, t) => s + toCents(t.amount), 0)
    const expenseC = flow.filter(t => t.type === 'expense').reduce((s, t) => s + toCents(t.amount), 0)
    if (incomeC > 0 || expenseC > 0) {
      const rate = incomeC > 0 ? Math.round(((incomeC - expenseC) / incomeC) * 100) : null
      alerts.push({
        id: `summary:${prev}`,
        kind: 'summary',
        title: `Resumen de ${MONTHS[Number(prev.slice(5, 7)) - 1]}`,
        body: `Ingresos ${eur(incomeC / 100)} · Gastos ${eur(expenseC / 100)}${rate !== null ? ` · Ahorro ${rate} %` : ''}`,
      })
    }
  }

  return alerts
}
