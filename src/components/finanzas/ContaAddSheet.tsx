import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ChipTabs } from '@/components/ui/ChipTabs'
import { useFinanceStore, fmt, CAT_META } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import { parseEuroInput } from '@/lib/finance/money'
import { selectActiveProjects, type ProjectId } from '@/lib/finance/projects'
import { localISO } from '@/lib/finance/dates'
import {
  buildContaEntry,
  defaultCategory,
  draftError,
  emptyDraft,
  nextDraft,
  type ContaDraft,
  type ContaKind,
} from '@/lib/finance/conta-draft'

interface Props {
  open: boolean
  onClose: () => void
  activeProject: ProjectId | null
  defaultDate: string
}

// Categorías por defecto: mismo catálogo que QuickAddSheet. Un borrador de proyecto
// deja `category: ''` para que `defaultCategory` decida; la lista de chips pinta la
// opción por defecto ya elegida para que Josema la vea sin teclear.
const INCOME_CATS = ['Nómina', 'Freelance', 'Dividendos', 'Otros ingresos']
const EXPENSE_CATS = ['Vivienda', 'Alimentación', 'Transporte', 'Salud', 'Ocio', 'Ropa', 'Suscripciones', 'Deporte', 'Restaurantes', 'Viajes', 'Educación', 'Ahorro', 'Intereses', 'Otros gastos']

const KIND_ITEMS = [
  { key: 'cobro' as const, label: 'Cobro' },
  { key: 'pendiente' as const, label: 'Pendiente' },
  { key: 'gasto' as const, label: 'Gasto' },
] as const

export function ContaAddSheet({ open, onClose, activeProject, defaultDate }: Props) {
  const cuentas = useFinanceStore(s => s.cuentas)
  const projects = useFinanceStore(s => s.projects)
  const addTx = useFinanceStore(s => s.addTx)
  const addPufo = useFinanceStore(s => s.addPufo)
  const toast = useToast()
  const projectOptions = useMemo(() => selectActiveProjects(projects), [projects])

  const [draft, setDraft] = useState<ContaDraft>(() =>
    emptyDraft({ kind: 'cobro', project: activeProject, today: defaultDate }),
  )
  const [showMore, setShowMore] = useState(false)

  const amountRef = useRef<HTMLInputElement>(null)
  const conceptRef = useRef<HTMLInputElement>(null)

  // Reinicia solo al ABRIR (mismo patrón que QuickAddSheet): si dependiera de txs,
  // una escritura del espejo vivo borraría lo que Josema está tecleando.
  const wasOpen = useRef(false)
  useEffect(() => {
    const opening = open && !wasOpen.current
    wasOpen.current = open
    if (opening) {
      const last = useFinanceStore.getState().txs.find(t => t.cuenta)
      setDraft({
        ...emptyDraft({ kind: 'cobro', project: activeProject, today: defaultDate }),
        cuenta: last?.cuenta ?? '',
      })
      setShowMore(false)
      setTimeout(() => amountRef.current?.focus(), 50)
    }
  }, [open, activeProject, defaultDate])

  // Si cambia el proyecto activo mientras la hoja está abierta (poco habitual, pero
  // posible si reabre con un filtro distinto), lo refleja.
  useEffect(() => {
    if (!open) return
    setDraft(d => (d.project === activeProject ? d : { ...d, project: activeProject }))
  }, [open, activeProject])

  function patch(p: Partial<ContaDraft>) {
    setDraft(d => ({ ...d, ...p }))
  }

  function setKind(kind: ContaKind) {
    // Al cambiar de pestaña resetea category a '': así defaultCategory(kind) manda
    // y los chips muestran la de por defecto ya puesta.
    setDraft(d => ({ ...d, kind, category: '' }))
  }

  function save(andAnother: boolean) {
    const err = draftError(draft)
    if (err) {
      toast.show(err)
      return
    }
    const entry = buildContaEntry(draft)
    if (!entry) {
      toast.show('Borrador inválido')
      return
    }
    if (entry.kind === 'tx') {
      addTx(entry.tx)
    } else {
      addPufo({ id: Date.now(), ...entry.pufo })
    }
    const amount = parseEuroInput(draft.amount)
    const labelMap: Record<ContaKind, string> = { cobro: 'Cobro', pendiente: 'Pendiente', gasto: 'Gasto' }
    toast.show(`✓ ${labelMap[draft.kind]} de ${fmt(amount)} añadido`)
    if (andAnother) {
      setDraft(d => nextDraft(d))
      setShowMore(false)
      setTimeout(() => amountRef.current?.focus(), 0)
    } else {
      onClose()
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      save(false)
    }
  }

  const cats = draft.kind === 'cobro' ? INCOME_CATS : draft.kind === 'gasto' ? EXPENSE_CATS : []
  const currentCategory = draft.category.trim() || defaultCategory(draft.kind)

  // F3.2: la forma de la hoja se decide al abrir y NO cambia con cada tecleo.
  // Si dependiera del borrador, los campos saltarían de sitio bajo el dedo justo
  // cuando Josema está eligiéndolos (peor con "Guardar y añadir otro", que conserva
  // el proyecto y la fecha). Las dos banderas salen de los props, que son estables
  // mientras la hoja está abierta.
  //
  // F3.1 original: con el filtro en "Todos" no hay proyecto elegido y la validación
  // exige uno; enseñamos el selector arriba para no esconder la salida.
  // Cuando sí hay proyecto activo, el selector vive en "Más opciones" (poder cambiarlo).
  const showProjectAbove = activeProject === null

  // F3.1 original: si la fecha por defecto no es hoy (mes visible ≠ mes actual) se
  // enseña arriba para que Josema la vea y la corrija de un toque. Cuando es hoy,
  // queda escondida — es el caso normal y no estorba.
  const showDateAbove = defaultDate !== localISO()

  const projectSelector = useMemo(() => (
    <select className="inp" value={draft.project ?? ''} onChange={e => {
      const v = e.target.value
      patch({ project: (v ? v as ProjectId : null) })
    }}>
      <option value="">Sin proyecto</option>
      {projectOptions.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
    </select>
  ), [draft.project, projectOptions])

  return (
    <Modal open={open} onClose={onClose} title="Apuntar al proyecto">
      <div style={{ padding: '0 20px 8px' }}>
        <ChipItems />

        {showProjectAbove && (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4 }}>Proyecto</div>
            {projectSelector}
          </>
        )}

        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4, marginTop: showProjectAbove ? 10 : 4 }}>Importe (€)</div>
        <input
          ref={amountRef}
          className="inp"
          value={draft.amount}
          onChange={e => patch({ amount: e.target.value })}
          onKeyDown={handleKey}
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          autoFocus
          style={{ fontFamily: 'var(--font-display)', fontSize: 28, padding: '12px 14px' }}
        />

        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4, marginTop: 10 }}>Concepto</div>
        <input
          ref={conceptRef}
          className="inp"
          value={draft.concept}
          onChange={e => patch({ concept: e.target.value })}
          onKeyDown={handleKey}
          type="text"
          placeholder="Ej: Factura octubre, Servidor…"
          autoComplete="off"
        />

        {showDateAbove && (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4, marginTop: 10 }}>Fecha</div>
            <input
              className="inp"
              value={draft.date}
              onChange={e => patch({ date: e.target.value })}
              type="date"
              style={{ fontSize: 13 }}
            />
            <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 4 }}>Se apunta en el mes que estás viendo</div>
          </>
        )}

        {draft.kind !== 'pendiente' && (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 6, marginTop: 12 }}>Categoría</div>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
              {cats.map(c => {
                const active = currentCategory === c
                return (
                  <button key={c} onClick={() => patch({ category: c })} type="button"
                    style={{ flex: '0 0 auto', padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', whiteSpace: 'nowrap',
                      background: active ? 'rgba(201,168,76,0.1)' : 'var(--color-s1)',
                      color: active ? 'var(--color-acc-gold)' : 'var(--color-sub)',
                      borderColor: active ? 'rgba(201,168,76,0.3)' : 'var(--color-border)' }}>
                    {CAT_META[c]?.icon || '•'} {c}
                  </button>
                )
              })}
            </div>
          </>
        )}

        <button onClick={() => setShowMore(v => !v)} type="button"
          style={{ marginTop: 14, width: '100%', padding: '8px 10px', borderRadius: 10, background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-dim)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
          {showMore ? '▾ Menos opciones' : '▸ Más opciones'}
        </button>

        {showMore && (
          <div style={{ marginTop: 10 }}>
            {draft.kind !== 'pendiente' && (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4 }}>Cuenta</div>
                <select className="inp" value={draft.cuenta} onChange={e => patch({ cuenta: e.target.value })}>
                  <option value="">Sin cuenta</option>
                  {cuentas.map(cu => <option key={cu.name} value={cu.name}>{cu.name}</option>)}
                </select>
              </>
            )}
            {!showProjectAbove && (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4, marginTop: 8 }}>Proyecto</div>
                {projectSelector}
              </>
            )}
            {!showDateAbove && (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4, marginTop: 8 }}>Fecha</div>
                <input className="inp" value={draft.date} onChange={e => patch({ date: e.target.value })} type="date" style={{ fontSize: 13 }} />
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '12px 20px 0' }}>
        <button onClick={onClose} className="btn-ghost" style={{ width: '100%' }}>Cancelar</button>
        <button onClick={() => save(true)} className="btn-ghost" style={{ width: '100%' }}>Guardar y añadir otro</button>
        <button onClick={() => save(false)} className="btn-primary" style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)', width: 'auto' }}>Guardar</button>
      </div>
    </Modal>
  )

  function ChipItems() {
    return (
      <div style={{ marginBottom: 14 }}>
        <ChipTabs items={KIND_ITEMS} value={draft.kind} onChange={k => setKind(k)} variant="line" />
      </div>
    )
  }
}