import { useEffect, useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useFinanceStore, CAT_META } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import { localISO } from '@/lib/finance/dates'
import { parseEuroInput, roundEuros } from '@/lib/finance/money'
import type { Recurrente } from '@/lib/finance/types'
import { catsOf } from './labels'

interface Props {
  open: boolean
  recurrenteId: number | null
  onClose: () => void
}

const label = { fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4, marginTop: 8 } as const

export function RecurrenteSheet({ open, recurrenteId, onClose }: Props) {
  const recurrentes = useFinanceStore(s => s.recurrentes)
  const cuentas = useFinanceStore(s => s.cuentas)
  const { addRecurrente, updateRecurrente, removeRecurrente } = useFinanceStore()
  const toast = useToast()
  const existing = recurrenteId != null ? recurrentes.find(r => r.id === recurrenteId) : undefined

  const [concept, setConcept] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [category, setCategory] = useState('Suscripciones')
  const [freq, setFreq] = useState<'weekly' | 'monthly' | 'yearly'>('monthly')
  const [interval, setIntervalN] = useState('1')
  const [day, setDay] = useState('1')
  const [startDate, setStartDate] = useState(localISO())
  const [cuenta, setCuenta] = useState('')
  const [notify, setNotify] = useState('1')
  const [active, setActive] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const wasOpen = useRef(false)
  useEffect(() => {
    const opening = open && !wasOpen.current
    wasOpen.current = open
    if (!opening) return
    const r = existing
    setConcept(r?.concept ?? ''); setAmount(r ? String(r.amount) : ''); setType(r?.type ?? 'expense')
    setCategory(r?.category ?? 'Suscripciones'); setFreq(r?.freq ?? 'monthly'); setIntervalN(String(r?.interval ?? 1))
    setDay(String(r?.day ?? Number(localISO().slice(8, 10)))); setStartDate(r?.startDate ?? localISO())
    setCuenta(r?.cuenta ?? ''); setNotify(String(r?.notifyDaysBefore ?? 1)); setActive(r?.active ?? true)
  }, [open, existing])

  const cats = catsOf(type)

  function save() {
    const a = parseEuroInput(amount)
    const n = Math.max(1, parseInt(interval, 10) || 1)
    const d = Math.min(31, Math.max(1, parseInt(day, 10) || 1))
    if (!concept.trim() || !(a > 0)) { toast.show('Pon concepto e importe'); return }
    const r: Recurrente = {
      id: existing?.id ?? Date.now(),
      concept: concept.trim(),
      amount: roundEuros(a),
      type,
      category: cats.includes(category) ? category : cats[0],
      day: freq === 'weekly' ? Number(startDate.slice(8, 10)) : d,
      active,
      freq,
      ...(n > 1 ? { interval: n } : {}),
      startDate,
      ...(cuenta ? { cuenta } : {}),
      notifyDaysBefore: Math.max(0, parseInt(notify, 10) || 0),
      // Un recurrente nuevo empieza a generar a partir de mañana: lo de días anteriores ya está apuntado.
      lastRun: existing?.lastRun ?? localISO(),
    }
    if (existing) updateRecurrente(existing.id, r)
    else addRecurrente(r)
    toast.show(`✓ ${r.concept} guardado`)
    onClose()
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={existing ? 'Editar recurrente' : 'Nuevo recurrente'}>
        <div style={{ padding: '0 20px 8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {(['expense', 'income'] as const).map(t => (
              <button key={t} type="button" onClick={() => { setType(t); setCategory(catsOf(t)[0]) }}
                style={{ padding: 9, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                  background: type === t ? 'var(--color-s2)' : 'transparent',
                  color: type === t ? (t === 'income' ? 'var(--color-acc-green)' : 'var(--color-red)') : 'var(--color-dim)',
                  borderColor: type === t ? 'var(--color-border2)' : 'var(--color-border)' }}>
                {t === 'income' ? '↑ Ingreso' : '↓ Gasto'}
              </button>
            ))}
          </div>
          <div style={label}>Concepto</div>
          <input className="inp" value={concept} onChange={e => setConcept(e.target.value)} placeholder="Netflix, alquiler, nómina…" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div><div style={label}>Importe (€)</div><input className="inp" value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" /></div>
            <div>
              <div style={label}>Categoría</div>
              <select className="inp" value={category} onChange={e => setCategory(e.target.value)}>
                {cats.map(c => <option key={c} value={c}>{CAT_META[c]?.icon || '•'} {c}</option>)}
              </select>
            </div>
            <div>
              <div style={label}>Frecuencia</div>
              <select className="inp" value={freq} onChange={e => setFreq(e.target.value as 'weekly' | 'monthly' | 'yearly')}>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
            <div><div style={label}>Cada (N)</div><input className="inp" value={interval} onChange={e => setIntervalN(e.target.value)} inputMode="numeric" /></div>
            {freq !== 'weekly' && (
              <div><div style={label}>Día del mes</div><input className="inp" value={day} onChange={e => setDay(e.target.value)} inputMode="numeric" /></div>
            )}
            <div><div style={label}>{freq === 'monthly' ? 'Desde' : 'Primera fecha'}</div><input className="inp" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ fontSize: 13 }} /></div>
            <div>
              <div style={label}>Cuenta</div>
              <select className="inp" value={cuenta} onChange={e => setCuenta(e.target.value)}>
                <option value="">Ninguna</option>
                {cuentas.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div><div style={label}>Avisar días antes</div><input className="inp" value={notify} onChange={e => setNotify(e.target.value)} inputMode="numeric" /></div>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--color-sub)', marginTop: 10 }}>
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Activo
          </label>
          <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 6 }}>
            Al abrir Finanzas se apuntan solos los cargos que ya han tocado (con su fecha) y mueven la cuenta.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: existing ? '1fr 1fr 1fr' : '1fr 1fr', gap: 8, marginTop: 14 }}>
            {existing && <button className="btn-ghost" style={{ width: '100%', color: 'var(--color-red)' }} onClick={() => setConfirmDelete(true)}>Borrar</button>}
            <button className="btn-ghost" style={{ width: '100%' }} onClick={onClose}>Cancelar</button>
            <button className="btn-primary" style={{ background: 'var(--color-acc-blue)', width: 'auto' }} onClick={save}>Guardar</button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmDelete && !!existing}
        title="Borrar recurrente"
        message={existing ? `Se borra «${existing.concept}». Los movimientos que ya generó se mantienen.` : ''}
        confirmLabel="Borrar"
        danger
        onConfirm={() => { if (existing) { removeRecurrente(existing.id); toast.show('Recurrente borrado'); onClose() } }}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  )
}
