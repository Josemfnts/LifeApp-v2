import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useFinanceStore, fmt } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import { localISO } from '@/lib/finance/dates'
import { subEuros } from '@/lib/finance/money'

interface Props {
  open: boolean
  onClose: () => void
  cuentaName: string
}

export function AdjustSheet({ open, onClose, cuentaName }: Props) {
  const cuentas = useFinanceStore(s => s.cuentas)
  const adjustBalance = useFinanceStore(s => s.adjustBalance)
  const toast = useToast()
  const cuenta = cuentas.find(c => c.name === cuentaName)
  const [newBalance, setNewBalance] = useState('')
  const [date, setDate] = useState(localISO())

  useEffect(() => {
    if (open && cuenta) setNewBalance(String(cuenta.balance))
  }, [open, cuenta])

  function handleConfirm() {
    if (!cuenta) return
    const nb = parseFloat(newBalance)
    if (!Number.isFinite(nb)) { toast.show('Introduce un saldo válido'); return }
    adjustBalance(cuenta.name, nb, date)
    toast.show(`✓ Saldo ajustado a ${fmt(nb)}`)
    onClose()
  }

  if (!cuenta) return null

  const nb = parseFloat(newBalance)
  const diff = Number.isFinite(nb) ? subEuros(nb, cuenta.balance) : 0
  const diffLabel = diff === 0
    ? 'Sin cambios'
    : `${diff > 0 ? '+' : ''}${fmt(diff)}`
  const diffColor = diff === 0 ? 'var(--color-dim)' : diff > 0 ? 'var(--color-acc-green)' : 'var(--color-red)'

  return (
    <Modal open={open} onClose={onClose} title="⚖️ Ajustar saldo">
      <div style={{ padding: '0 20px 8px' }}>
        <div style={{ fontSize: 13, color: 'var(--color-sub)', marginBottom: 16 }}>
          Cuenta: <strong style={{ color: 'var(--color-text)' }}>{cuenta.name}</strong> · saldo actual: <strong style={{ color: 'var(--color-text)' }}>{fmt(cuenta.balance)}</strong>
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4 }}>Saldo real (€)</div>
        <input className="inp" value={newBalance} onChange={e => setNewBalance(e.target.value)} type="number" step="0.01" />
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4, marginTop: 8 }}>Fecha del apunte</div>
        <input className="inp" value={date} onChange={e => setDate(e.target.value)} type="date" style={{ fontSize: 13 }} />
        <div style={{ marginTop: 14, padding: 12, background: 'var(--color-s2)', border: '1px solid var(--color-border)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--color-sub)' }}>Diferencia apuntada</span>
          <span style={{ fontFamily: 'DM Serif Display,serif', fontSize: 18, color: diffColor }}>{diffLabel}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '12px 20px 0' }}>
        <button onClick={onClose} className="btn-ghost" style={{ width: '100%' }}>Cancelar</button>
        <button onClick={handleConfirm} className="btn-primary" style={{ background: 'var(--color-acc-blue)', width: 'auto' }} disabled={diff === 0}>
          {diff === 0 ? 'Sin cambios' : 'Confirmar'}
        </button>
      </div>
    </Modal>
  )
}
