import { useEffect, useRef, useState } from 'react'
import { Modal, ConfirmDialog } from '@/components/ui'
import { useFinanceStore, fmt } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import { localISO, monthKeyOf } from '@/lib/finance/dates'
import { parseEuroInput, roundEuros } from '@/lib/finance/money'
import { projectLabel, selectActiveProjects } from '@/lib/finance/projects'
import type { Quota } from '@/lib/finance/quotas'

interface Props {
  open: boolean
  quotaId: number | null
  defaultProject?: string
  onClose: () => void
}

// F7: alta y edición de una cuota mensual de proyecto. El alta propone el proyecto del
// filtro activo, día 1 y "desde" el mes en curso (lo pide el encargo; el componente solo
// acepta la propuesta como prop). El motor puro (quotas.ts) decide las ocurrencias; aquí
// solo se valida y guarda.
export function QuotaSheet({ open, quotaId, defaultProject, onClose }: Props) {
  const quotas = useFinanceStore(s => s.quotas)
  const projects = useFinanceStore(s => s.projects)
  const { addQuota, updateQuota, removeQuota } = useFinanceStore()
  const toast = useToast()
  const existing = quotaId != null ? quotas.find(q => q.id === quotaId) : undefined

  // Fecha por defecto del alta: día 1 del mes en curso (encargo).
  const today = localISO()
  const startDefault = `${monthKeyOf(today)}-01`

  const [project, setProject] = useState('')
  const [amount, setAmount] = useState('')
  const [freq, setFreq] = useState<'monthly' | 'yearly'>('monthly')
  const [day, setDay] = useState('1')
  const [startDate, setStartDate] = useState(startDefault)
  const [concept, setConcept] = useState('')
  const [active, setActive] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Mismo patrón que RecurrenteSheet: solo al ABRIR se siembra el estado, así el espejo
  // vivo no pisa lo que Josema está tecleando.
  const wasOpen = useRef(false)
  useEffect(() => {
    const opening = open && !wasOpen.current
    wasOpen.current = open
    if (!opening) return
    const r = existing
    if (r) {
      setProject(r.project)
      setAmount(String(r.amount))
      setFreq(r.freq ?? 'monthly')
      setDay(String(r.day))
      setStartDate(r.startDate)
      setConcept(r.concept ?? '')
      setActive(r.active)
    } else {
      setProject(defaultProject ?? '')
      setAmount('')
      setFreq('monthly')
      setDay('1')
      setStartDate(startDefault)
      setConcept('')
      setActive(true)
    }
    setConfirmDelete(false)
  }, [open, defaultProject, existing, startDefault])

  const projectOptions = selectActiveProjects(projects)

  function save() {
    if (!project) { toast.show('Elige el proyecto de la cuota'); return }
    const a = parseEuroInput(amount)
    if (!(a > 0)) { toast.show('Importe tiene que ser mayor que 0'); return }
    const d = Math.min(31, Math.max(1, parseInt(day, 10) || 1))
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) { toast.show('Fecha de inicio no válida'); return }
    const payload: Omit<Quota, 'id' | 'lastRun'> & { id?: number } = {
      ...(existing?.id != null ? { id: existing.id } : {}),
      project,
      amount: roundEuros(a),
      freq,
      day: d,
      startDate,
      active,
      ...(concept.trim() ? { concept: concept.trim() } : {}),
    }
    if (existing) updateQuota(existing.id, payload)
    else addQuota(payload)
    toast.show(existing ? '✓ Cuota actualizada' : `✓ Cuota de ${fmt(payload.amount)} añadida`)
    onClose()
  }

  const label = { fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4 } as const

  return (
    <>
      <Modal open={open} onClose={onClose} title={existing ? 'Editar cuota' : 'Nueva cuota'}>
        <div style={{ padding: '0 20px 8px' }}>
          <div style={label}>Proyecto</div>
          <select className="inp" value={project} onChange={e => setProject(e.target.value)}>
            <option value="">— elige proyecto —</option>
            {projectOptions.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ ...label, marginTop: 10 }}>Importe (€)</div>
              <input className="inp" value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="0,00" />
            </div>
            <div>
              <div style={{ ...label, marginTop: 10 }}>Periodicidad</div>
              <select className="inp" value={freq} onChange={e => setFreq(e.target.value as 'monthly' | 'yearly')}>
                <option value="monthly">Mensual</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
            <div>
              <div style={{ ...label, marginTop: 10 }}>Día del mes</div>
              <input className="inp" value={day} onChange={e => setDay(e.target.value)} inputMode="numeric" />
              <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 4 }}>
                31 en meses cortos cae en el último día
              </div>
            </div>
            <div>
              <div style={{ ...label, marginTop: 10 }}>Desde</div>
              <input className="inp" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ fontSize: 13 }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ ...label, marginTop: 10 }}>Concepto (opcional)</div>
              <input className="inp" value={concept} onChange={e => setConcept(e.target.value)}
                placeholder={project ? `Cuota ${projectLabel(project)}` : 'Cuota'} />
            </div>
          </div>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--color-sub)', marginTop: 10 }}>
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Activa
          </label>
          <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 6 }}>
            Al abrir Finanzas se generan los pendientes que tocan (con su fecha) hasta hoy.
            Cobrar luego crea el ingreso y mueve la cuenta.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: existing ? '1fr 1fr 1fr' : '1fr 1fr', gap: 8, marginTop: 14 }}>
            {existing && <button className="btn-ghost" style={{ width: '100%', color: 'var(--color-red)' }} onClick={() => setConfirmDelete(true)}>Borrar</button>}
            <button className="btn-ghost" style={{ width: '100%' }} onClick={onClose}>Cancelar</button>
            <button className="btn-primary" style={{ background: 'var(--color-primary)', width: 'auto' }} onClick={save}>Guardar</button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmDelete && !!existing}
        title="Borrar cuota"
        message={existing ? `Se borra la cuota de ${projectLabel(existing.project)} (${fmt(existing.amount)} ${existing.freq === 'yearly' ? 'al año' : `el día ${existing.day}`}). Los pendientes ya generados se mantienen.` : ''}
        confirmLabel="Borrar"
        danger
        onConfirm={() => {
          if (!existing) return
          removeQuota(existing.id)
          toast.show('Cuota borrada')
          onClose()
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  )
}
