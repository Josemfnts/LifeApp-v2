import { useState } from 'react'
import { useFinanceStore, CAT_META, fmt } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import { isFlow } from '@/lib/finance/flow'
import { sumEuros } from '@/lib/finance/money'
import { monthKey } from './shared'

export function BudgetsTab() {
  const { txs, presupuestos, setPresupuesto, removePresupuesto, recurrentes, addRecurrente, removeRecurrente } = useFinanceStore()
  const toast = useToast()
  const [cat, setCat] = useState('Alimentación')
  const [limit, setLimit] = useState('')
  const [rConcept, setRConcept] = useState('')
  const [rAmount, setRAmount] = useState('')
  const [rType, setRType] = useState<'income' | 'expense'>('expense')
  const [rCategory, setRCategory] = useState('Alimentación')
  const [rDay, setRDay] = useState('1')

  const now = new Date()
  const keyM = monthKey(now.getFullYear(), now.getMonth())

  return (
    <div>
      <div className="sec-label">Presupuestos mensuales</div>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'stretch' }}>
          <select className="inp" value={cat} onChange={e => setCat(e.target.value)} style={{ flex: 2, minWidth: 0, marginBottom: 0 }}>
            {['Vivienda','Alimentación','Transporte','Salud','Ocio','Ropa','Suscripciones','Deporte','Restaurantes','Viajes','Educación','Otros gastos'].map(c => (
              <option key={c} value={c}>{CAT_META[c]?.icon || '•'} {c}</option>
            ))}
          </select>
          <input className="inp" value={limit} onChange={e => setLimit(e.target.value)} type="number" placeholder="Límite €" style={{ width: 82, flexShrink: 0, marginBottom: 0 }} />
          <button onClick={() => { const l = parseFloat(limit); if (l > 0) { setPresupuesto(cat, l); setLimit(''); toast.show(`✓ Presupuesto para ${cat}: ${fmt(l)}`) } }}
            style={{ padding: '0 14px', flexShrink: 0, borderRadius: 10, background: 'var(--color-acc-gold)', color: '#111', border: 'none', fontSize: 13, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', whiteSpace: 'nowrap' }}>Añadir</button>
        </div>
      </div>

      {presupuestos.length === 0 ? (
        <div className="empty-state">Sin presupuestos. Define límites por categoría.</div>
      ) : presupuestos.map(p => {
        const gastado = sumEuros(txs.filter(t => t.type === 'expense' && isFlow(t) && t.category === p.category && t.date.startsWith(keyM)).map(t => t.amount))
        const pct = Math.min(100, Math.round(gastado / p.limit * 100))
        const over = gastado > p.limit
        return (
          <div key={p.category} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{CAT_META[p.category]?.icon || '•'} {p.category}</span>
                <span style={{ fontSize: 11, color: 'var(--color-dim)', marginLeft: 8 }}>Límite: {fmt(p.limit)}</span>
              </div>
              <button onClick={() => { removePresupuesto(p.category); toast.show('Presupuesto eliminado') }}
                style={{ background: 'rgba(224,95,95,0.08)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.15)', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ height: '100%', borderRadius: 99, transition: 'width 0.5s ease', width: `${pct}%`, background: over ? 'var(--color-red)' : 'var(--color-acc-green)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: over ? 'var(--color-red)' : 'var(--color-sub)' }}>{fmt(gastado)} gastado</span>
              <span style={{ color: over ? 'var(--color-red)' : 'var(--color-dim)', fontWeight: 700 }}>{pct}%</span>
            </div>
            {over && <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-red)', fontWeight: 600 }}>⚠️ Has superado el presupuesto en {fmt(sumEuros([gastado, -p.limit]))}</div>}
          </div>
        )
      })}

      <div className="sec-label" style={{ marginTop: 24 }}>Transacciones recurrentes</div>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <input className="inp" value={rConcept} onChange={e => setRConcept(e.target.value)} type="text" placeholder="Concepto (ej: Suscripción Netflix)" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <input className="inp" value={rAmount} onChange={e => setRAmount(e.target.value)} type="number" step="0.01" placeholder="Importe €" style={{ marginBottom: 0 }} />
          <select className="inp" value={rDay} onChange={e => setRDay(e.target.value)} style={{ marginBottom: 0 }}>
            {Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>Día {i + 1}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button onClick={() => setRType('income')}
            style={{ flex: 1, padding: 9, borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid',
              background: rType === 'income' ? 'rgba(82,183,136,0.12)' : 'var(--color-s2)',
              color: rType === 'income' ? 'var(--color-acc-green)' : 'var(--color-dim)',
              borderColor: rType === 'income' ? 'rgba(82,183,136,0.3)' : 'var(--color-border)' }}>Ingreso</button>
          <button onClick={() => setRType('expense')}
            style={{ flex: 1, padding: 9, borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid',
              background: rType === 'expense' ? 'rgba(224,95,95,0.1)' : 'var(--color-s2)',
              color: rType === 'expense' ? 'var(--color-red)' : 'var(--color-dim)',
              borderColor: rType === 'expense' ? 'rgba(224,95,95,0.25)' : 'var(--color-border)' }}>Gasto</button>
        </div>
        <select className="inp" value={rCategory} onChange={e => setRCategory(e.target.value)}>
          {['Vivienda','Alimentación','Transporte','Salud','Ocio','Ropa','Suscripciones','Deporte','Restaurantes','Viajes','Educación','Otros gastos'].map(c => <option key={c} value={c}>{CAT_META[c]?.icon || '•'} {c}</option>)}
          <option value="Nómina">💼 Nómina</option>
        </select>
        <button onClick={() => {
          const a = parseFloat(rAmount)
          if (!rConcept.trim() || !a || a <= 0) { toast.show('Introduce concepto e importe'); return }
          addRecurrente({ id: Date.now(), concept: rConcept.trim(), amount: a, type: rType, category: rCategory, day: parseInt(rDay), active: true })
          toast.show('✓ Transacción recurrente añadida')
          setRConcept(''); setRAmount('')
        }}
          style={{ width: '100%', padding: 12, borderRadius: 12, background: 'var(--color-acc-blue)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>Añadir recurrente</button>
      </div>

      {recurrentes.length === 0 ? (
        <div className="empty-state">Sin transacciones recurrentes.</div>
      ) : recurrentes.map(r => (
        <div key={r.id} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 12, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 18 }}>{r.type === 'income' ? '💼' : '📅'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{r.concept}</div>
            <div style={{ fontSize: 11, color: 'var(--color-dim)' }}>{r.category} · Día {r.day} · {fmt(r.amount)}</div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: r.type === 'income' ? 'var(--color-acc-green)' : 'var(--color-red)' }}>
            {r.type === 'income' ? '+' : '−'}{fmt(r.amount)}
          </div>
          <button onClick={() => { removeRecurrente(r.id); toast.show('Recurrente eliminado') }}
            style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(224,95,95,0.06)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.12)', cursor: 'pointer', fontSize: 11 }}>✕</button>
        </div>
      ))}
    </div>
  )
}
