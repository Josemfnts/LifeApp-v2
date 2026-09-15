import { useMemo, useState } from 'react'
import { useFinanceStore, fmt, netWorthExtras, CAT_META } from '@/stores/financeStore'
import { DISCLAIMER } from '@/lib/finance/simulators'
import { computeNetWorth, type NetWorthBreakdown } from '@/lib/finance/networth'
import { budgetStatus, nextMonthKey, prevMonthKey } from '@/lib/finance/budgets'
import { portfolio } from '@/lib/finance/investments'
import { isFlow } from '@/lib/finance/flow'
import { flowAmount } from '@/lib/finance/split'
import { localISO } from '@/lib/finance/dates'
import { toCents, fromCents, sumEuros } from '@/lib/finance/money'
import type { Tx } from '@/lib/finance/types'
import { MONTHS } from '../plan/labels'
import { MiniLineChart, type LineSeries } from './MiniLineChart'

const h2 = { fontSize: 13, fontWeight: 700, color: 'var(--color-text)', margin: '16px 0 6px' } as const
const row = { display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', color: 'var(--color-sub)' } as const

function monthFlow(txs: Tx[], mk: string) {
  let incomeC = 0
  let expenseC = 0
  const byCat = new Map<string, number>()
  for (const t of txs) {
    if (!isFlow(t) || !t.date.startsWith(mk)) continue
    const c = toCents(flowAmount(t))
    if (t.type === 'income') incomeC += c
    else { expenseC += c; byCat.set(t.category, (byCat.get(t.category) ?? 0) + c) }
  }
  return { incomeC, expenseC, byCat }
}

// Informe mensual imprimible (window.print → "Guardar como PDF"). Los estilos de impresión en globals.css
// ocultan todo menos .fin-report.
export function MonthlyReport() {
  const store = useFinanceStore()
  const today = localISO()
  const [mk, setMk] = useState(today.slice(0, 7))
  const [y, m] = mk.split('-').map(Number)
  const isCurrent = mk === today.slice(0, 7)

  const data = useMemo(() => {
    const endOfMonth = (key: string) => `${key}-31`
    const lastSnapIn = (key: string) => [...store.snapshots].filter(s => s.date <= endOfMonth(key)).pop()
    const nowBreakdown = computeNetWorth(store.cuentas, netWorthExtras(store))
    const nw: NetWorthBreakdown | undefined = isCurrent ? nowBreakdown : lastSnapIn(mk)
    const prevNw = lastSnapIn(prevMonthKey(mk))

    const labels: string[] = []
    const values: number[] = []
    let k = mk
    const keys: string[] = []
    for (let i = 0; i < 12; i++) { keys.unshift(k); k = prevMonthKey(k) }
    for (const key of keys) {
      const s = key === today.slice(0, 7) ? nowBreakdown : lastSnapIn(key)
      if (!s) continue
      labels.push(MONTHS[Number(key.slice(5, 7)) - 1].slice(0, 3))
      values.push(s.net)
    }

    const cur = monthFlow(store.txs, mk)
    const past: Map<string, number>[] = []
    let pk = mk
    for (let i = 0; i < 6; i++) { pk = prevMonthKey(pk); past.push(monthFlow(store.txs, pk).byCat) }
    const top = [...cur.byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([category, c]) => {
      const avg = Math.round(past.reduce((s, mp) => s + (mp.get(category) ?? 0), 0) / 6)
      return { category, amount: fromCents(c), avg: fromCents(avg) }
    })

    return {
      nw,
      variation: nw && prevNw ? fromCents(toCents(nw.net) - toCents(prevNw.net)) : null,
      chart: { labels, values },
      income: fromCents(cur.incomeC),
      expense: fromCents(cur.expenseC),
      savingsRate: cur.incomeC > 0 ? Math.round(((cur.incomeC - cur.expenseC) / cur.incomeC) * 100) : null,
      top,
      budgets: store.presupuestos.map(p => ({ p, s: budgetStatus(p, store.txs, mk) })),
      pf: portfolio(store.holdings, store.priceCache, Date.now()),
      debtTotal: sumEuros(store.debts.map(d => d.balance)),
    }
  }, [store, mk, isCurrent, today])

  const series = useMemo<LineSeries[]>(() => [{ label: 'Patrimonio neto', data: data.chart.values, colorVar: '--color-acc-blue', fill: true }], [data.chart.values])

  return (
    <div>
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button className="btn-ghost" style={{ width: 36, padding: 6 }} onClick={() => setMk(prevMonthKey(mk))}>‹</button>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', textTransform: 'capitalize' }}>{MONTHS[m - 1]} {y}</div>
        <button className="btn-ghost" style={{ width: 36, padding: 6 }} disabled={isCurrent} onClick={() => setMk(nextMonthKey(mk))}>›</button>
      </div>
      <button className="btn-primary no-print" style={{ background: 'var(--color-acc-blue)', width: '100%', marginBottom: 12 }} onClick={() => window.print()}>
        🖨️ Imprimir / guardar PDF
      </button>

      <div className="fin-report" style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', textTransform: 'capitalize' }}>Informe de {MONTHS[m - 1]} {y}</div>
        <div style={{ fontSize: 11, color: 'var(--color-dim)' }}>Life OS · generado el {today}</div>

        <div style={h2}>Patrimonio neto {isCurrent ? '(hoy)' : 'a fin de mes'}</div>
        {data.nw ? (
          <>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text)' }}>{fmt(data.nw.net)}</div>
            {data.variation !== null && (
              <div style={{ fontSize: 12, color: data.variation >= 0 ? 'var(--color-acc-green)' : 'var(--color-red)' }}>
                {data.variation >= 0 ? '+' : ''}{fmt(data.variation)} respecto al mes anterior (variación, no rentabilidad)
              </div>
            )}
            <div style={row}><span>Líquido</span><span>{fmt(data.nw.liquid)}</span></div>
            <div style={row}><span>Inversiones</span><span>{fmt(data.nw.investments)}</span></div>
            <div style={row}><span>Inmuebles</span><span>{fmt(data.nw.property)}</span></div>
            <div style={row}><span>Deudas</span><span>−{fmt(data.nw.debt)}</span></div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--color-dim)' }}>No hay foto del patrimonio para ese mes.</div>
        )}
        {data.chart.values.length > 1 && <div style={{ marginTop: 8 }}><MiniLineChart labels={data.chart.labels} series={series} height={130} format={fmt} /></div>}

        <div style={h2}>Flujo del mes</div>
        <div style={row}><span>Ingresos</span><span>{fmt(data.income)}</span></div>
        <div style={row}><span>Gastos</span><span>{fmt(data.expense)}</span></div>
        <div style={row}><span>Tasa de ahorro</span><span>{data.savingsRate === null ? '—' : `${data.savingsRate} %`}</span></div>

        {data.top.length > 0 && (
          <>
            <div style={h2}>Gasto por categoría (vs media de 6 meses)</div>
            {data.top.map(t => (
              <div key={t.category} style={row}>
                <span>{CAT_META[t.category]?.icon || '•'} {t.category}</span>
                <span>{fmt(t.amount)} <span style={{ color: 'var(--color-dim)', fontSize: 11 }}>· media {fmt(t.avg)}</span></span>
              </div>
            ))}
          </>
        )}

        {data.budgets.length > 0 && (
          <>
            <div style={h2}>Presupuestos</div>
            {data.budgets.map(({ p, s }) => (
              <div key={p.category} style={row}>
                <span>{p.category}</span>
                <span style={{ color: s.level === 'over' ? 'var(--color-red)' : s.level === 'warn' ? 'var(--color-acc-gold)' : 'var(--color-sub)' }}>
                  {fmt(s.spent)} de {fmt(s.available)} ({Math.round(s.pct)} %)
                </span>
              </div>
            ))}
          </>
        )}

        <div style={h2}>Situación a día de hoy</div>
        <div style={row}><span>Cartera de inversión</span><span>{fmt(data.pf.value)} (latente {data.pf.unrealized >= 0 ? '+' : ''}{fmt(data.pf.unrealized)})</span></div>
        <div style={row}><span>Deudas pendientes</span><span>{fmt(data.debtTotal)}</span></div>

        <div style={{ fontSize: 10, color: 'var(--color-dim)', marginTop: 16, lineHeight: 1.5 }}>{DISCLAIMER}</div>
      </div>
    </div>
  )
}
