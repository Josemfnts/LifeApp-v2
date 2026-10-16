import { useMemo, useState } from 'react'
import { useFinanceStore, fmt } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import { ConfirmDialog } from '@/components/ui'
import { CobrarPufoSheet } from './CobrarPufoSheet'
import { QuotaSheet } from './QuotaSheet'
import { localISO, monthKeyOf } from '@/lib/finance/dates'
import { quotaMonthlyTotal, type Quota } from '@/lib/finance/quotas'
import { projectLabel, PROJECT_FILTER_ALL, type ProjectFilter } from '@/lib/finance/projects'
import type { Pufo } from '@/lib/finance/types'

interface Props {
  // Mes que está mirando Josema (YYYY-MM). Si no se pasa, se usa el mes de hoy.
  month?: string
  // Filtro de proyecto activo de la pestaña. Si es un proyecto concreto, el alta de cuota
  // lo propone por defecto. 'all' no propone nada.
  projectFilter: ProjectFilter
}

// F7: la cuota mensual de cada proyecto. Una línea por cuota con alta / edición / pausa /
// baja, el total mensual previsto arriba, lo pendiente del mes con su botón "Cobrar" (reusa
// CobrarPufoSheet, no duplica la lógica) y el atajo "dar por cobrado lo anterior a este mes"
// (manda los ingresos con la fecha REAL de cada mes, no con la de hoy).
export function QuotasSection({ month, projectFilter }: Props) {
  const quotas = useFinanceStore(s => s.quotas)
  const pufos = useFinanceStore(s => s.pufos)
  const cobrarPufo = useFinanceStore(s => s.cobrarPufo)
  const toast = useToast()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [cobrarPufoId, setCobrarPufoId] = useState<number | null>(null)
  const [confirmBulkId, setConfirmBulkId] = useState<null | { count: number; total: number }>(null)

  const today = useMemo(() => localISO(), [])
  const mes = month ?? monthKeyOf(today)

  // Total previsto: solo cuotas activas (el motor ya filtra). Es el número que Josema ve
  // arriba como "lo que debería entrar este mes".
  const totalMensual = useMemo(() => quotaMonthlyTotal(quotas), [quotas])

  // Pendiente del mes de la sección actual: cualquier pufo vivo de este mes cuyo mes
  // coincida. Lo restringimos por mes visible (no por filtro de proyecto: una cuota de
  // Anantara debe verse aunque el filtro esté en Clocks; lo concreto va dentro del Mes).
  const pendientesMes = useMemo(() => {
    return pufos
      .filter(p => !p.settled && p.dir === 'me_debe' && p.date.startsWith(mes) && typeof p.quotaId === 'number')
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [pufos, mes])

  // Para el atajo de meses anteriores: pufos vivos de MES ANTERIOR al visible con quotaId,
  // independiente del filtro (si Josema está en 'all' tiene que verlos todos).
  const anteriores = useMemo(() => {
    if (confirmBulkId !== null) return []  // congelamos mientras confirmamos
    return pufos
      .filter(p => !p.settled && p.dir === 'me_debe' && typeof p.quotaId === 'number')
      .filter(p => p.date.slice(0, 7) < mes)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [pufos, mes, confirmBulkId])

  function openBulkConfirm() {
    // Calculamos el resumen AHORA (los pufos de meses anteriores) y se lo enseñamos al
    // usuario en el ConfirmDialog. Si la lista cambia mientras confirma (espejo vivo),
    // al ejecutar usamos la lista fresca del estado (no la capturada).
    const list = pufos
      .filter(p => !p.settled && p.dir === 'me_debe' && typeof p.quotaId === 'number')
      .filter(p => p.date.slice(0, 7) < mes)
    if (list.length === 0) {
      toast.show('No hay pendientes de meses anteriores')
      return
    }
    const total = list.reduce((s, p) => s + p.amount, 0)
    setConfirmBulkId({ count: list.length, total })
  }

  function ejecutarBulkCobro() {
    // El espejo vivo puede recargar `pufos` mientras se ejecuta el bucle (no debería,
    // porque solo se ejecuta dentro de un ConfirmDialog, pero por si acaso): siempre
    // resolvemos el índice FRESCO sobre `useFinanceStore.getState().pufos`, igual que
    // hace ContabilidadTab.onCobrar. Si un pufo ya no está (cambió la cuota, p.ej.),
    // lo saltamos.
    let count = 0
    let totalCobrado = 0
    let fallidos = 0
    // Tomamos snapshot en una lista de IDs para no entrar en bucle si el array cambia.
    const ids = pufos
      .filter(p => !p.settled && p.dir === 'me_debe' && typeof p.quotaId === 'number')
      .filter(p => p.date.slice(0, 7) < mes)
      .map(p => p.id)
    for (const pid of ids) {
      const idx = useFinanceStore.getState().pufos.findIndex(p => p.id === pid)
      if (idx < 0) { fallidos++; continue }
      const target = useFinanceStore.getState().pufos[idx]
      cobrarPufo(idx, { date: target.date })
      count++
      totalCobrado += target.amount
    }
    if (count > 0) toast.show(`✓ ${count} cobro${count === 1 ? '' : 's'} de meses anteriores hecho${count === 1 ? '' : 's'} (${fmt(totalCobrado)})`)
    if (fallidos > 0) toast.show(`⚠️ ${fallidos} pendiente${fallidos === 1 ? '' : 's'} ya no estaba`)
    setConfirmBulkId(null)
  }

  const defaultNewProject: string | undefined = projectFilter !== PROJECT_FILTER_ALL ? projectFilter : undefined

  // Pufo target para el cobro de un pendiente del mes (reusa el sheet de F4).
  const cobrarTarget: Pufo | null = cobrarPufoId !== null
    ? pufos.find(p => p.id === cobrarPufoId) ?? null
    : null

  return (
    <section style={{ marginTop: 24 }}>
      <div className="sec-label" style={{ marginBottom: 8 }}>Cuotas</div>

      <div style={{
        background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14,
        padding: '14px 16px', marginBottom: 12, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total mensual previsto</div>
          <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 4 }}>Suma de las cuotas activas (anuales /12)</div>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--color-acc-green)' }}>
          {fmt(totalMensual)}
        </div>
      </div>

      {quotas.length === 0 ? (
        <div style={{ padding: '12px 4px', fontSize: 12, color: 'var(--color-dim)', textAlign: 'center', marginBottom: 8 }}>
          Aún no tienes cuotas. Añade la del primer cliente.
        </div>
      ) : (
        <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          {quotas.map(q => (
            <QuotaRow key={q.id} quota={q} onEdit={() => setEditingId(q.id)} />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => setAdding(true)} type="button"
          style={{ background: 'rgba(82,183,136,0.1)', color: 'var(--color-acc-green)', border: '1px solid rgba(82,183,136,0.2)', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
          + Cuota
        </button>
        {anteriores.length > 0 && (
          <button onClick={openBulkConfirm} type="button"
            style={{ background: 'rgba(201,168,76,0.1)', color: 'var(--color-acc-gold)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
            Dar por cobrado lo anterior a este mes ({anteriores.length})
          </button>
        )}
      </div>

      {pendientesMes.length > 0 && (
        <div style={{ marginTop: 8, marginBottom: 4 }}>
          <div className="sec-label" style={{ marginBottom: 8 }}>Pendiente este mes</div>
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
            {pendientesMes.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.concept || `Cuota ${projectLabel(p.project ?? '')}`}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 2 }}>
                    {projectLabel(p.project ?? '')} · {shortDate(p.date)}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--color-acc-green)', flexShrink: 0 }}>
                  {fmt(p.amount)}
                </div>
                <button onClick={() => setCobrarPufoId(p.id)} type="button"
                  style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(82,183,136,0.12)', color: 'var(--color-acc-green)', border: '1px solid rgba(82,183,136,0.25)', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', flexShrink: 0 }}>
                  Cobrar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <QuotaSheet open={adding} quotaId={null} defaultProject={defaultNewProject} onClose={() => setAdding(false)} />
      <QuotaSheet open={editingId !== null} quotaId={editingId} onClose={() => setEditingId(null)} />
      <CobrarPufoSheet
        open={cobrarTarget !== null}
        onClose={() => setCobrarPufoId(null)}
        pufo={cobrarTarget}
        onCobrar={(date, cuenta) => {
          if (cobrarPufoId === null) return
          // Mismo patrón que ContabilidadTab.onCobrar: índice fresco, no cacheado. El
          // espejo vivo puede recargar `pufos` mientras el sheet estaba abierto.
          const idx = useFinanceStore.getState().pufos.findIndex(p => p.id === cobrarPufoId)
          if (idx < 0) { toast.show('Ese pendiente ya no está'); setCobrarPufoId(null); return }
          cobrarPufo(idx, { date, cuenta })
          const target = useFinanceStore.getState().pufos[idx]
          toast.show(`✓ Cobro de ${fmt(target.amount)} añadido`)
          setCobrarPufoId(null)
        }}
      />
      <ConfirmDialog
        open={confirmBulkId !== null}
        title="Dar por cobrado lo anterior a este mes"
        message={confirmBulkId
          ? `Vas a marcar como cobrados ${confirmBulkId.count} pendiente${confirmBulkId.count === 1 ? '' : 's'} de cuotas, por un total de ${fmt(confirmBulkId.total)}. Cada ingreso se crea con la fecha real de su mes. No se puede deshacer.`
          : ''
        }
        confirmLabel="Cobrar todo"
        cancelLabel="Cancelar"
        danger
        onConfirm={ejecutarBulkCobro}
        onClose={() => setConfirmBulkId(null)}
      />
    </section>
  )
}

interface QuotaRowProps {
  quota: Quota
  onEdit: () => void
}

function QuotaRow({ quota: q, onEdit }: QuotaRowProps) {
  const toggleQuotaActive = useFinanceStore(s => s.toggleQuotaActive)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px',
      borderBottom: '1px solid var(--color-border)', opacity: q.active ? 1 : 0.55,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {projectLabel(q.project)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 2 }}>
          {q.freq === 'yearly' ? 'Anual' : 'Mensual'} · día {q.day} · desde {shortDate(q.startDate)}{q.active ? '' : ' · pausada'}
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', flexShrink: 0 }}>
        {fmt(q.amount)}
      </div>
      <input type="checkbox" checked={q.active} aria-label={q.active ? 'Pausar cuota' : 'Activar cuota'}
        onChange={e => toggleQuotaActive(q.id, e.target.checked)} />
      <button onClick={onEdit} aria-label="Editar cuota" type="button"
        style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-sub)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        ✎
      </button>
    </div>
  )
}

const SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
function shortDate(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${SHORT[Number(iso.slice(5, 7)) - 1]}`
}
