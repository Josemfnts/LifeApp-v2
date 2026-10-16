import { useState } from 'react'
import { BudgetsSection } from './plan/BudgetsSection'
import { RecurringSection } from './plan/RecurringSection'
import { CashflowCalendar } from './plan/CashflowCalendar'
import { useFinanceStore, fmt } from '@/stores/financeStore'

type Sub = 'objetivos' | 'presupuestos' | 'recurrentes' | 'calendario'

// Pestaña Plan: Presupuestos · Recurrentes · Calendario.
export function BudgetsTab({ onGoGoals }: { onGoGoals: () => void }) {
  const [sub, setSub] = useState<Sub>('objetivos')
  const huchas = useFinanceStore(s => s.huchas)
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12, paddingBottom: 4 }}>
        {([
          { k: 'objetivos' as const, l: 'Objetivos' },
          { k: 'presupuestos' as const, l: '🎯 Presupuestos' },
          { k: 'recurrentes' as const, l: '🔁 Recurrentes' },
          { k: 'calendario' as const, l: '📅 Calendario' },
        ]).map(s => (
          <button key={s.k} onClick={() => setSub(s.k)}
            style={{ flex: '0 0 auto', whiteSpace: 'nowrap', padding: '10px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700,
              fontFamily: 'var(--font-sans)', cursor: 'pointer', border: '1px solid',
              background: sub === s.k ? 'var(--color-primary)' : 'var(--color-s1)',
              color: sub === s.k ? 'var(--color-on-primary)' : 'var(--color-text)',
              borderColor: sub === s.k ? 'var(--color-primary)' : 'var(--color-border)' }}>{s.l}</button>
        ))}
      </div>
      {sub === 'objetivos' && (
        <section className="finance-categories">
          <div className="sec-label" style={{ marginBottom: 12 }}>Objetivos de ahorro</div>
          {huchas.length === 0 ? <p style={{ color: 'var(--color-sub)', fontSize: 14 }}>Aún no tienes objetivos de ahorro.</p> : huchas.map((h, i) => (
            <div className="finance-goal" key={`${h.name}-${i}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <strong>{h.emoji} {h.name}</strong><strong>{h.goal > 0 ? Math.round(Math.min(100, h.current / h.goal * 100)) : 0}%</strong>
              </div>
              <div style={{ color: 'var(--color-sub)', fontSize: 13 }}>{fmt(h.current)} de {fmt(h.goal)}{h.deadline ? ` · ${h.deadline}` : ''}</div>
              <div className="finance-categories__track"><div className="finance-categories__fill" style={{ width: `${h.goal > 0 ? Math.max(0, Math.min(100, h.current / h.goal * 100)) : 0}%`, background: 'var(--color-teal)' }} /></div>
            </div>
          ))}
          <button className="btn-primary" onClick={onGoGoals} style={{ marginTop: 16 }}>{huchas.length ? 'Gestionar objetivos' : 'Crear objetivo'}</button>
        </section>
      )}
      {sub === 'presupuestos' && <BudgetsSection />}
      {sub === 'recurrentes' && <RecurringSection />}
      {sub === 'calendario' && <CashflowCalendar />}
    </div>
  )
}
