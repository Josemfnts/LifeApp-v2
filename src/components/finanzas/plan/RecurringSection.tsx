import { useMemo, useState } from 'react'
import { useFinanceStore, CAT_META, fmt } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import { localISO } from '@/lib/finance/dates'
import { addDaysISO, detectRecurring, occurrences } from '@/lib/finance/recurring'
import { RecurrenteSheet } from './RecurrenteSheet'
import { freqLabel, shortDate } from './labels'

const FREQ_TEXT = { weekly: 'cada semana', monthly: 'cada mes', yearly: 'cada año' } as const

export function RecurringSection() {
  const { txs, recurrentes, recurringDismissed, addRecurrente, updateRecurrente, dismissSuggestion } = useFinanceStore()
  const toast = useToast()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetId, setSheetId] = useState<number | null>(null)
  const today = localISO()

  const suggestions = useMemo(() => detectRecurring(txs, recurrentes, recurringDismissed), [txs, recurrentes, recurringDismissed])

  function open(id: number | null) { setSheetId(id); setSheetOpen(true) }

  return (
    <div>
      {suggestions.map(s => (
        <div key={s.key} style={{ background: 'var(--color-s1)', border: '1px solid rgba(91,138,240,0.3)', borderRadius: 14, padding: 14, marginBottom: 8 }}>
          <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.45 }}>
            💡 Parece que {s.type === 'income' ? 'cobras' : 'pagas'} <strong>{s.concept}</strong> {FREQ_TEXT[s.freq]} ({fmt(s.amount)})
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn-primary" style={{ background: 'var(--color-acc-blue)', width: 'auto', padding: '7px 12px', fontSize: 12 }}
              onClick={() => {
                addRecurrente({
                  id: Date.now(), concept: s.concept, amount: s.amount, type: s.type, category: s.category, day: s.day,
                  active: true, freq: s.freq, startDate: today, lastRun: today, ...(s.cuenta ? { cuenta: s.cuenta } : {}), notifyDaysBefore: 1,
                })
                toast.show(`✓ ${s.concept} añadido a recurrentes`)
              }}>Crear recurrente</button>
            <button className="btn-ghost" style={{ width: 'auto', padding: '7px 12px', fontSize: 12 }} onClick={() => dismissSuggestion(s.key)}>Descartar</button>
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 0 10px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Recurrentes</div>
        <button onClick={() => open(null)}
          style={{ background: 'rgba(91,138,240,0.1)', color: 'var(--color-acc-blue)', border: '1px solid rgba(91,138,240,0.2)', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>+ Recurrente</button>
      </div>

      {recurrentes.length === 0 ? (
        <div className="empty-state">Sin recurrentes. Añade tus cargos fijos (alquiler, suscripciones, nómina…).</div>
      ) : (
        <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
          {recurrentes.map(r => {
            const next = r.active ? occurrences(r, addDaysISO(today, 1), addDaysISO(today, 800))[0] : undefined
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--color-border)', opacity: r.active ? 1 : 0.55 }}>
                <div onClick={() => open(r.id)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {CAT_META[r.category]?.icon || '📅'} {r.concept}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-dim)' }}>
                    {freqLabel(r)}{r.cuenta ? ` · ${r.cuenta}` : ''}{next ? ` · próximo ${shortDate(next)}` : r.active ? '' : ' · pausado'}
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: r.type === 'income' ? 'var(--color-acc-green)' : 'var(--color-red)', flexShrink: 0 }}>
                  {r.type === 'income' ? '+' : '−'}{fmt(r.amount)}
                </div>
                <input type="checkbox" checked={r.active} aria-label={r.active ? 'Pausar' : 'Activar'}
                  onChange={e => updateRecurrente(r.id, e.target.checked ? { active: true, lastRun: r.lastRun ?? today } : { active: false })} />
              </div>
            )
          })}
        </div>
      )}

      <RecurrenteSheet open={sheetOpen} recurrenteId={sheetId} onClose={() => setSheetOpen(false)} />
    </div>
  )
}
