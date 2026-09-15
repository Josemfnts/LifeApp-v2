import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useFinanceStore, CAT_META, fmt } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import { budgetStatus } from '@/lib/finance/budgets'
import { localISO } from '@/lib/finance/dates'
import { parseEuroInput, roundEuros } from '@/lib/finance/money'
import type { Presupuesto } from '@/lib/finance/types'
import { catsOf } from './labels'

const label = { fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4, marginTop: 8 } as const
const LEVEL_COLOR = { ok: 'var(--color-acc-green)', warn: 'var(--color-acc-gold)', over: 'var(--color-red)' } as const

export function BudgetsSection() {
  const { txs, presupuestos, setPresupuesto, removePresupuesto } = useFinanceStore()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [cat, setCat] = useState('Alimentación')
  const [limit, setLimit] = useState('')
  const [rollover, setRollover] = useState(false)
  const [confirmCat, setConfirmCat] = useState<string | null>(null)
  const month = localISO().slice(0, 7)

  function openForm(p?: Presupuesto) {
    setEditing(p?.category ?? null)
    setCat(p?.category ?? catsOf('expense').find(c => !presupuestos.some(x => x.category === c)) ?? 'Alimentación')
    setLimit(p ? String(p.limit) : '')
    setRollover(p?.rollover ?? false)
    setOpen(true)
  }

  function save() {
    const l = parseEuroInput(limit)
    if (!(l > 0)) { toast.show('Pon un límite mayor que 0'); return }
    if (editing && editing !== cat) removePresupuesto(editing)
    setPresupuesto(cat, roundEuros(l), rollover)
    toast.show(`✓ Presupuesto de ${cat}: ${fmt(roundEuros(l))}`)
    setOpen(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Presupuestos del mes</div>
        <button onClick={() => openForm()}
          style={{ background: 'rgba(91,138,240,0.1)', color: 'var(--color-acc-blue)', border: '1px solid rgba(91,138,240,0.2)', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>+ Presupuesto</button>
      </div>

      {presupuestos.length === 0 ? (
        <div className="empty-state">Sin presupuestos. Define un límite mensual por categoría.</div>
      ) : presupuestos.map(p => {
        const s = budgetStatus(p, txs, month)
        const color = LEVEL_COLOR[s.level]
        return (
          <div key={p.category} onClick={() => openForm(p)}
            style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, marginBottom: 8, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{CAT_META[p.category]?.icon || '•'} {p.category}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color }}>{Math.round(s.pct)}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--color-s2)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ height: '100%', borderRadius: 99, transition: 'width 0.5s ease', width: `${Math.min(100, s.pct)}%`, background: color }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-sub)' }}>
              <span>{fmt(s.spent)} de {fmt(s.available)}</span>
              <span style={{ color: s.level === 'over' ? 'var(--color-red)' : 'var(--color-dim)' }}>
                {s.level === 'over' ? `Te pasas ${fmt(s.spent - s.available)}` : `Quedan ${fmt(s.available - s.spent)}`}
              </span>
            </div>
            {p.rollover && s.carry !== 0 && (
              <div style={{ fontSize: 11, color: s.carry > 0 ? 'var(--color-acc-green)' : 'var(--color-red)', marginTop: 4 }}>
                {s.carry > 0 ? '+' : ''}{fmt(s.carry)} arrastrado de meses anteriores
              </div>
            )}
          </div>
        )
      })}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar presupuesto' : 'Nuevo presupuesto'}>
        <div style={{ padding: '0 20px 8px' }}>
          <div style={label}>Categoría</div>
          <select className="inp" value={cat} onChange={e => setCat(e.target.value)}>
            {catsOf('expense').map(c => <option key={c} value={c}>{CAT_META[c]?.icon || '•'} {c}</option>)}
          </select>
          <div style={label}>Límite mensual (€)</div>
          <input className="inp" value={limit} onChange={e => setLimit(e.target.value)} inputMode="decimal" placeholder="300" />
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--color-sub)', marginTop: 10 }}>
            <input type="checkbox" checked={rollover} onChange={e => setRollover(e.target.checked)} />
            <span>El sobrante (o el exceso) pasa al mes siguiente</span>
          </label>
          <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 6 }}>Aviso al llegar al 80 % y al superarlo. Los traspasos, ajustes, inversiones y capital de deudas no cuentan.</div>
          <div style={{ display: 'grid', gridTemplateColumns: editing ? '1fr 1fr 1fr' : '1fr 1fr', gap: 8, marginTop: 14 }}>
            {editing && (
              <button className="btn-ghost" style={{ width: '100%', color: 'var(--color-red)' }} onClick={() => { setConfirmCat(editing); setOpen(false) }}>Borrar</button>
            )}
            <button className="btn-ghost" style={{ width: '100%' }} onClick={() => setOpen(false)}>Cancelar</button>
            <button className="btn-primary" style={{ background: 'var(--color-acc-blue)', width: 'auto' }} onClick={save}>Guardar</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmCat}
        title="Borrar presupuesto"
        message={confirmCat ? `Se borra el presupuesto de ${confirmCat}. Tus movimientos no cambian.` : ''}
        confirmLabel="Borrar"
        danger
        onConfirm={() => { if (confirmCat) { removePresupuesto(confirmCat); toast.show('Presupuesto borrado') } }}
        onClose={() => setConfirmCat(null)}
      />
    </div>
  )
}
