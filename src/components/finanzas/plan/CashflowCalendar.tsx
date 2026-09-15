import { useMemo, useState } from 'react'
import { useFinanceStore, fmt } from '@/stores/financeStore'
import { localISO } from '@/lib/finance/dates'
import { sumEuros } from '@/lib/finance/money'
import { CUENTA_GROUP } from '@/lib/finance/networth'
import { nextMonthKey, prevMonthKey } from '@/lib/finance/budgets'
import { addDaysISO, occurrences, projectCashflow } from '@/lib/finance/recurring'
import { MONTHS, shortDate } from './labels'

const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const pad = (n: number) => String(n).padStart(2, '0')

// "¿Llego a fin de mes?": cargos previstos de los recurrentes y saldo líquido proyectado día a día.
export function CashflowCalendar() {
  const cuentas = useFinanceStore(s => s.cuentas)
  const recurrentes = useFinanceStore(s => s.recurrentes)
  const today = localISO()
  const [view, setView] = useState(today.slice(0, 7))
  const [selected, setSelected] = useState<string | null>(null)

  const [y, m] = view.split('-').map(Number)
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const last = `${view}-${pad(lastDay)}`
  const firstDow = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7

  const liquidNow = sumEuros(cuentas.filter(c => c.includeInNw !== false && (CUENTA_GROUP[c.type] ?? 'liquid') === 'liquid').map(c => c.balance))
  const projection = useMemo(
    () => (last > today ? projectCashflow(liquidNow, recurrentes, addDaysISO(today, 1), last) : []),
    [liquidNow, recurrentes, today, last],
  )
  const byDate = useMemo(() => new Map(projection.map(p => [p.date, p])), [projection])
  const eventsOf = (date: string) => byDate.get(date)?.events
    ?? recurrentes.filter(r => r.active && occurrences(r, date, date).length > 0).map(r => ({ concept: r.concept, amount: r.type === 'income' ? r.amount : -r.amount }))

  const monthDays = projection.filter(p => p.date.startsWith(view))
  const endBalance = monthDays.at(-1)?.balance
  const firstNegative = projection.find(p => p.date.startsWith(view) && p.balance < 0)
  const selectedEvents = selected ? eventsOf(selected) : []

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button className="btn-ghost" style={{ width: 36, padding: 6 }} onClick={() => { setView(prevMonthKey(view)); setSelected(null) }}>‹</button>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', textTransform: 'capitalize' }}>{MONTHS[m - 1]} {y}</div>
        <button className="btn-ghost" style={{ width: 36, padding: 6 }} onClick={() => { setView(nextMonthKey(view)); setSelected(null) }}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {DOW.map(d => <div key={d} style={{ fontSize: 10, color: 'var(--color-dim)', textAlign: 'center', paddingBottom: 2 }}>{d}</div>)}
        {Array.from({ length: firstDow }, (_, i) => <div key={`b${i}`} />)}
        {Array.from({ length: lastDay }, (_, i) => {
          const date = `${view}-${pad(i + 1)}`
          const ev = eventsOf(date)
          const hasIn = ev.some(e => e.amount > 0)
          const hasOut = ev.some(e => e.amount < 0)
          const neg = (byDate.get(date)?.balance ?? 0) < 0
          const isToday = date === today
          return (
            <button key={date} type="button" onClick={() => setSelected(date === selected ? null : date)}
              style={{ aspectRatio: '1', maxWidth: '100%', borderRadius: 8, fontSize: 12, cursor: 'pointer', padding: 0,
                border: `1px solid ${selected === date ? 'var(--color-acc-blue)' : isToday ? 'var(--color-border2)' : 'var(--color-border)'}`,
                background: neg ? 'rgba(224,95,95,0.1)' : 'var(--color-s1)', color: date < today ? 'var(--color-dim)' : 'var(--color-text)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <span>{i + 1}</span>
              <span style={{ display: 'flex', gap: 2, height: 5 }}>
                {hasIn && <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--color-acc-green)' }} />}
                {hasOut && <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--color-red)' }} />}
              </span>
            </button>
          )
        })}
      </div>

      {selected && (
        <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 12, marginTop: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-sub)', marginBottom: 6 }}>{shortDate(selected)}</div>
          {selectedEvents.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--color-dim)' }}>Sin cargos previstos.</div>
          ) : selectedEvents.map((e, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
              <span style={{ color: 'var(--color-text)' }}>{e.concept}</span>
              <span style={{ color: e.amount >= 0 ? 'var(--color-acc-green)' : 'var(--color-red)', fontWeight: 600 }}>{e.amount >= 0 ? '+' : ''}{fmt(e.amount)}</span>
            </div>
          ))}
          {byDate.get(selected) && (
            <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 6 }}>Saldo previsto ese día: {fmt(byDate.get(selected)!.balance)}</div>
          )}
        </div>
      )}

      {endBalance !== undefined ? (
        <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 12, marginTop: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--color-sub)' }}>
            Saldo líquido previsto a fin de mes: <strong style={{ color: endBalance >= 0 ? 'var(--color-text)' : 'var(--color-red)' }}>{fmt(endBalance)}</strong>
          </div>
          {liquidNow < 0 ? (
            <div style={{ fontSize: 12, color: 'var(--color-red)', fontWeight: 600, marginTop: 6 }}>
              ⚠️ Tu saldo líquido ya está en negativo ({fmt(liquidNow)})
            </div>
          ) : firstNegative && (
            <div style={{ fontSize: 12, color: 'var(--color-red)', fontWeight: 600, marginTop: 6 }}>
              ⚠️ El {Number(firstNegative.date.slice(8, 10))} bajarías a {fmt(firstNegative.balance)}
            </div>
          )}
          <div style={{ fontSize: 10, color: 'var(--color-dim)', marginTop: 6 }}>Parte de tu saldo líquido de hoy ({fmt(liquidNow)}) y solo suma los recurrentes activos.</div>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 10 }}>Mes pasado: solo se muestran los cargos programados.</div>
      )}
    </div>
  )
}
