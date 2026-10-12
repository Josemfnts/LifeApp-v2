import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useFinanceStore, fmt } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import { localISO } from '@/lib/finance/dates'
import { projectLabel } from '@/lib/finance/projects'
import { settleError } from '@/lib/finance/conta-settle'
import type { Pufo } from '@/lib/finance/types'

interface Props {
  open: boolean
  onClose: () => void
  pufo: Pufo | null
  onCobrar: (date: string, cuenta: string) => void
}

// F4 de Contabilidad por proyecto: hoja tonta para fechar un cobro de un pendiente. Solo
// pide la fecha en la que entró el dinero y la cuenta donde entra; el importe y el concepto
// se heredan del pendiente (el motor puro decide en src/lib/finance/conta-settle.ts). Aquí
// se reutiliza `settleError` para validar — no se duplica la regla: si devuelve mensaje,
// toast.show y se sale sin escribir.
export function CobrarPufoSheet({ open, onClose, pufo, onCobrar }: Props) {
  const cuentas = useFinanceStore(s => s.cuentas)
  const toast = useToast()

  const [date, setDate] = useState(() => localISO())
  const [cuenta, setCuenta] = useState('')

  // Reinicia al abrir, no en cada render (mismo patrón que ContaAddSheet): si dependiera
  // del store, una escritura del espejo vivo podría pisar lo que Josema está tecleando.
  const wasOpen = useRef(false)
  useEffect(() => {
    const opening = open && !wasOpen.current
    wasOpen.current = open
    if (opening) {
      setDate(localISO())
      const last = useFinanceStore.getState().txs.find(t => t.cuenta)
      setCuenta(last?.cuenta ?? '')
    }
  }, [open])

  const showCuentaSelect = useMemo(() => cuentas.length > 0, [cuentas.length])

  function handleConfirm() {
    if (!pufo) return
    const err = settleError({ pufo, date, cuenta })
    if (err) {
      toast.show(err)
      return
    }
    onCobrar(date, cuenta)
  }

  if (!pufo) return null

  return (
    <Modal open={open} onClose={onClose} title="Cobrar pendiente">
      <div style={{ padding: '0 20px 8px' }}>
        <div style={{ background: 'var(--color-s2)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                {pufo.project ? projectLabel(pufo.project) : (pufo.who || 'Pendiente')}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pufo.concept || pufo.reason || 'Sin concepto'}
              </div>
            </div>
            <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, color: 'var(--color-acc-green)', flexShrink: 0 }}>
              {fmt(pufo.amount)}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4 }}>Fecha del cobro</div>
        <input
          className="inp"
          value={date}
          onChange={e => setDate(e.target.value)}
          type="date"
          style={{ fontSize: 13 }}
        />

        {showCuentaSelect && (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4, marginTop: 10 }}>Cuenta</div>
            <select className="inp" value={cuenta} onChange={e => setCuenta(e.target.value)}>
              <option value="">Sin cuenta</option>
              {cuentas.map(cu => <option key={cu.name} value={cu.name}>{cu.name}</option>)}
            </select>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '12px 20px 0' }}>
        <button onClick={onClose} className="btn-ghost" style={{ width: '100%' }}>Cancelar</button>
        <button onClick={handleConfirm} className="btn-primary" style={{ width: '100%', background: 'var(--color-acc-gold)', color: '#111' }}>Cobrado</button>
      </div>
    </Modal>
  )
}