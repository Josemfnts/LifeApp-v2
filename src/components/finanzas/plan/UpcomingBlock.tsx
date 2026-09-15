import { useMemo } from 'react'
import { useFinanceStore, fmt } from '@/stores/financeStore'
import { localISO } from '@/lib/finance/dates'
import { addDaysISO, occurrences } from '@/lib/finance/recurring'
import { computeFinanceAlerts } from '@/lib/finance/alerts'
import { shortDate } from './labels'

// Bloque de Inicio: cargos previstos en los próximos 7 días y presupuestos en aviso (máx. 3).
export function UpcomingBlock() {
  const txs = useFinanceStore(s => s.txs)
  const presupuestos = useFinanceStore(s => s.presupuestos)
  const recurrentes = useFinanceStore(s => s.recurrentes)
  const today = localISO()

  const upcoming = useMemo(
    () => recurrentes
      .filter(r => r.active)
      .flatMap(r => occurrences(r, addDaysISO(today, 1), addDaysISO(today, 7)).map(date => ({ date, r })))
      .sort((a, b) => a.date.localeCompare(b.date)),
    [recurrentes, today],
  )
  const budgetAlerts = useMemo(
    () => computeFinanceAlerts({ txs, presupuestos, recurrentes: [] }, today).filter(a => a.kind === 'budget').slice(0, 3),
    [txs, presupuestos, today],
  )

  if (upcoming.length === 0 && budgetAlerts.length === 0) return null

  return (
    <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 14, marginBottom: 12 }}>
      {budgetAlerts.map(a => (
        <div key={a.id} style={{ fontSize: 12, color: a.id.endsWith(':over') ? 'var(--color-red)' : 'var(--color-acc-gold)', marginBottom: 6 }}>
          ⚠️ {a.title} · {a.body}
        </div>
      ))}
      {upcoming.length > 0 && (
        <>
          <div className="sec-label" style={{ marginBottom: 6, marginTop: budgetAlerts.length ? 8 : 0 }}>Próximos 7 días</div>
          {upcoming.map(({ date, r }) => (
            <div key={`${r.id}-${date}`} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, padding: '4px 0' }}>
              <span style={{ width: 48, color: 'var(--color-dim)', fontSize: 12, flexShrink: 0 }}>{shortDate(date)}</span>
              <span style={{ flex: 1, minWidth: 0, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.concept}</span>
              <span style={{ color: r.type === 'income' ? 'var(--color-acc-green)' : 'var(--color-red)', fontWeight: 600, flexShrink: 0 }}>
                {r.type === 'income' ? '+' : '−'}{fmt(r.amount)}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
