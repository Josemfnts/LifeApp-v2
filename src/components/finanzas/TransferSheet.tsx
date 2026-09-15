import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useFinanceStore } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import { localISO } from '@/lib/finance/dates'

interface Props {
  open: boolean
  onClose: () => void
}

export function TransferSheet({ open, onClose }: Props) {
  const cuentas = useFinanceStore(s => s.cuentas)
  const addTransfer = useFinanceStore(s => s.addTransfer)
  const toast = useToast()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(localISO())
  const [concept, setConcept] = useState('')

  function reset() {
    setFrom(''); setTo(''); setAmount(''); setDate(localISO()); setConcept('')
  }

  function handleConfirm() {
    const a = parseFloat(amount)
    if (!from || !to || !(a > 0)) { toast.show('Rellena origen, destino e importe'); return }
    if (from === to) { toast.show('Origen y destino no pueden ser iguales'); return }
    try {
      addTransfer(from, to, a, date, concept.trim() || undefined)
      toast.show(`✓ Traspaso de ${a.toFixed(2)}€ registrado`)
      reset()
      onClose()
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Error al registrar traspaso')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="🔁 Traspaso entre cuentas">
      <div style={{ padding: '0 20px 8px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4 }}>Origen</div>
        <select className="inp" value={from} onChange={e => setFrom(e.target.value)}>
          <option value="">Selecciona cuenta de origen…</option>
          {cuentas.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4, marginTop: 8 }}>Destino</div>
        <select className="inp" value={to} onChange={e => setTo(e.target.value)}>
          <option value="">Selecciona cuenta de destino…</option>
          {cuentas.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4, marginTop: 8 }}>Importe (€)</div>
        <input className="inp" value={amount} onChange={e => setAmount(e.target.value)} type="number" step="0.01" placeholder="0.00" />
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4, marginTop: 8 }}>Fecha</div>
        <input className="inp" value={date} onChange={e => setDate(e.target.value)} type="date" style={{ fontSize: 13 }} />
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4, marginTop: 8 }}>Concepto (opcional)</div>
        <input className="inp" value={concept} onChange={e => setConcept(e.target.value)} type="text" placeholder="Traspaso entre cuentas" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '12px 20px 0' }}>
        <button onClick={onClose} className="btn-ghost" style={{ width: '100%' }}>Cancelar</button>
        <button onClick={handleConfirm} className="btn-primary" style={{ background: 'var(--color-acc-blue)', width: 'auto' }}>Confirmar</button>
      </div>
    </Modal>
  )
}
