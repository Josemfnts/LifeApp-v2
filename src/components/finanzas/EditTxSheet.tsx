import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useFinanceStore, CAT_META, fmt } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'

interface Props {
  open: boolean
  onClose: () => void
  txId: number | null
}

const INCOME_CATS = ['Nómina', 'Freelance', 'Otros ingresos']
const EXPENSE_CATS = ['Vivienda', 'Alimentación', 'Transporte', 'Salud', 'Ocio', 'Ropa', 'Suscripciones', 'Deporte', 'Restaurantes', 'Viajes', 'Educación', 'Ahorro', 'Otros gastos']

export function EditTxSheet({ open, onClose, txId }: Props) {
  const txs = useFinanceStore(s => s.txs)
  const cuentas = useFinanceStore(s => s.cuentas)
  const updateTxFull = useFinanceStore(s => s.updateTxFull)
  const removeTx = useFinanceStore(s => s.removeTx)
  const toast = useToast()
  const tx = txId != null ? txs.find(t => t.id === txId) : undefined

  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [concept, setConcept] = useState('')
  const [category, setCategory] = useState('Otros gastos')
  const [cuenta, setCuenta] = useState('')
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open || !tx) return
    setType(tx.type)
    setAmount(String(tx.amount))
    setConcept(tx.concept)
    setCategory(tx.category)
    setCuenta(tx.cuenta ?? '')
    setDate(tx.date)
    setNote(tx.note ?? '')
    setConfirmDelete(false)
  }, [open, txId, tx])

  if (!tx) return null

  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS

  function handleSave() {
    const a = parseFloat(amount.replace(',', '.'))
    if (!a || a <= 0) { toast.show('Importe inválido'); return }
    if (!concept.trim()) { toast.show('Introduce un concepto'); return }
    const partial = {
      type,
      amount: a,
      concept: concept.trim(),
      category,
      cuenta: cuenta || undefined,
      date,
      note: note ?? '',
    }
    if (txId == null) return
    updateTxFull(txId, partial)
    toast.show('✓ Movimiento actualizado')
    onClose()
  }

  function handleDelete() {
    if (txId == null) return
    removeTx(txId)
    toast.show('✓ Movimiento borrado')
    onClose()
  }

  const isTransfer = !!tx.linkId

  return (
    <>
      <Modal open={open} onClose={onClose} title={isTransfer ? 'Editar traspaso' : 'Editar movimiento'}>
        <div style={{ padding: '0 20px 8px' }}>
          {!isTransfer && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
              <button onClick={() => { setType('income'); if (!INCOME_CATS.includes(category)) setCategory('Otros ingresos') }}
                style={{ padding: 9, borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', textAlign: 'center', cursor: 'pointer', border: '1px solid',
                  background: type === 'income' ? 'rgba(82,183,136,0.12)' : 'var(--color-s2)',
                  color: type === 'income' ? 'var(--color-acc-green)' : 'var(--color-dim)',
                  borderColor: type === 'income' ? 'rgba(82,183,136,0.3)' : 'var(--color-border)' }}>↑ Ingreso</button>
              <button onClick={() => { setType('expense'); if (!EXPENSE_CATS.includes(category)) setCategory('Otros gastos') }}
                style={{ padding: 9, borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', textAlign: 'center', cursor: 'pointer', border: '1px solid',
                  background: type === 'expense' ? 'rgba(224,95,95,0.1)' : 'var(--color-s2)',
                  color: type === 'expense' ? 'var(--color-red)' : 'var(--color-dim)',
                  borderColor: type === 'expense' ? 'rgba(224,95,95,0.25)' : 'var(--color-border)' }}>↓ Gasto</button>
            </div>
          )}

          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4 }}>Importe (€)</div>
          <input className="inp" value={amount} onChange={e => setAmount(e.target.value)} type="number" step="0.01" />

          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4, marginTop: 8 }}>Concepto</div>
          <input className="inp" value={concept} onChange={e => setConcept(e.target.value)} type="text" />

          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4, marginTop: 8 }}>Categoría</div>
          {isTransfer ? (
            <div style={{ padding: 10, background: 'var(--color-s2)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 13, color: 'var(--color-sub)' }}>
              🔁 Traspaso (no editable)
            </div>
          ) : (
            <select className="inp" value={category} onChange={e => setCategory(e.target.value)}>
              {cats.map(c => <option key={c} value={c}>{CAT_META[c]?.icon || '•'} {c}</option>)}
            </select>
          )}

          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4, marginTop: 8 }}>Cuenta</div>
          {isTransfer ? (
            <div style={{ padding: 10, background: 'var(--color-s2)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 13, color: 'var(--color-sub)' }}>
              {tx.cuenta || '—'} (origen en la pata expense)
            </div>
          ) : (
            <select className="inp" value={cuenta} onChange={e => setCuenta(e.target.value)}>
              <option value="">Sin cuenta</option>
              {cuentas.map(cu => <option key={cu.name} value={cu.name}>{cu.name}</option>)}
            </select>
          )}

          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4, marginTop: 8 }}>Fecha</div>
          <input className="inp" value={date} onChange={e => setDate(e.target.value)} type="date" style={{ fontSize: 13 }} />

          {!isTransfer && (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4, marginTop: 8 }}>Nota</div>
              <input className="inp" value={note} onChange={e => setNote(e.target.value)} type="text" />
            </>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '12px 20px 0' }}>
          <button onClick={() => setConfirmDelete(true)}
            className="btn-ghost" style={{ width: '100%', background: 'rgba(224,95,95,0.08)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.2)' }}>
            Borrar
          </button>
          <button onClick={handleSave} className="btn-primary" style={{ background: 'var(--color-acc-blue)', width: 'auto' }}>
            Guardar
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title={isTransfer ? 'Borrar traspaso' : 'Borrar movimiento'}
        message={isTransfer
          ? `Se borrarán las dos patas del traspaso${tx.concept ? ` (${tx.concept})` : ''}. Los saldos de las cuentas se revierten.`
          : `Vas a borrar "${tx.concept}" por ${fmt(tx.amount)}. Esta acción no se puede deshacer.`
        }
        confirmLabel="Borrar"
        danger
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  )
}
