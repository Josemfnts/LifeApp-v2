import { useState } from 'react'
import { BudgetsSection } from './plan/BudgetsSection'
import { RecurringSection } from './plan/RecurringSection'
import { CashflowCalendar } from './plan/CashflowCalendar'

type Sub = 'presupuestos' | 'recurrentes' | 'calendario'

// Pestaña Plan: Presupuestos · Recurrentes · Calendario.
export function BudgetsTab() {
  const [sub, setSub] = useState<Sub>('presupuestos')
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12, paddingBottom: 4 }}>
        {([
          { k: 'presupuestos' as const, l: '🎯 Presupuestos' },
          { k: 'recurrentes' as const, l: '🔁 Recurrentes' },
          { k: 'calendario' as const, l: '📅 Calendario' },
        ]).map(s => (
          <button key={s.k} onClick={() => setSub(s.k)}
            style={{ flex: '0 0 auto', whiteSpace: 'nowrap', padding: '10px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700,
              fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid',
              background: sub === s.k ? 'rgba(91,138,240,0.12)' : 'transparent',
              color: sub === s.k ? 'var(--color-acc-blue)' : 'var(--color-dim)',
              borderColor: sub === s.k ? 'rgba(91,138,240,0.3)' : 'var(--color-border)' }}>{s.l}</button>
        ))}
      </div>
      {sub === 'presupuestos' && <BudgetsSection />}
      {sub === 'recurrentes' && <RecurringSection />}
      {sub === 'calendario' && <CashflowCalendar />}
    </div>
  )
}
