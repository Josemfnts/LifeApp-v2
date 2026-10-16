import { useState, useEffect } from 'react'
import { useFinanceStore } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import { SummaryTab } from '@/components/finanzas/SummaryTab'
import { MovesTab } from '@/components/finanzas/MovesTab'
import { UtilesTab } from '@/components/finanzas/utiles/UtilesTab'
import { PatrimonioTab } from '@/components/finanzas/PatrimonioTab'
import { BudgetsTab } from '@/components/finanzas/BudgetsTab'
import { ContabilidadTab } from '@/components/finanzas/ContabilidadTab'
import '@/components/finanzas/finanzas.css'

type Tab = 'inicio' | 'moves' | 'patrimonio' | 'plan' | 'utiles' | 'conta'

export default function Finanzas() {
  const [tab, setTab] = useState<Tab>('inicio')
  const [patrimonioInitial, setPatrimonioInitial] = useState<'cuentas' | 'huchas'>('cuentas')
  const processRecurrentes = useFinanceStore(s => s.processRecurrentes)
  const recordSnapshot = useFinanceStore(s => s.recordSnapshot)
  const runDueDca = useFinanceStore(s => s.runDueDca)
  const refreshPrices = useFinanceStore(s => s.refreshPrices)
  const generateDueQuotas = useFinanceStore(s => s.generateDueQuotas)
  const toastShow = useToast(s => s.show)

  useEffect(() => {
    recordSnapshot()
    const newTxs = processRecurrentes()
    if (newTxs.length > 0) toastShow(`✓ ${newTxs.length} transacciones recurrentes añadidas`)
    // Cuotas: lo que le TIENEN que pagar a Josema cada mes. Genera los pendientes que faltan
    // hasta hoy (F7). El motor decide; el store crea pufos y actualiza lastRun.
    const newPufos = generateDueQuotas()
    if (newPufos.length > 0) toastShow(`✓ ${newPufos.length} cuotas pendientes generadas`)
    // Precios de cripto al abrir Finanzas (no solo con Inversiones visible): la foto del día y la compra
    // periódica usan el precio de ahora. Si la red falla, siguen con la caché o el precio manual.
    void refreshPrices().catch(() => 0).then(() => {
      const dca = runDueDca()
      if (dca.done.length > 0) toastShow(`✓ Compra periódica hecha: ${dca.done.join(', ')}`)
      if (dca.skipped.length > 0) toastShow(`⚠️ Sin precio para la compra periódica de ${dca.skipped.join(', ')}`)
      recordSnapshot()
    })
  }, [processRecurrentes, recordSnapshot, refreshPrices, runDueDca, generateDueQuotas, toastShow])

  return (
    <div className="finance-page">
      <div className="page-header">
        <div className="page-title">Finanzas</div>
        <div className="finance-page-date">{new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date())}</div>
        {/* Exportar CSV vive en Movs (donde están los movimientos), no en la cabecera. */}
        <div className="tab-bar">
          {(['inicio','moves','patrimonio','plan','utiles','conta'] as const).map(t => (
            <button key={t} onClick={() => { if (t === 'patrimonio') setPatrimonioInitial('cuentas'); setTab(t) }} className={`tab-btn tab-gold${tab === t ? ' active' : ''}`}>
              {{inicio:'Resumen',moves:'Movimientos',patrimonio:'Patrimonio',plan:'Plan',utiles:'Útiles',conta:'Conta'}[t]}
            </button>
          ))}
        </div>
      </div>
      <div key={tab} className="animate-tab" style={{ padding: 16 }}>
        {tab === 'inicio' && <SummaryTab onGoPatrimonio={() => { setPatrimonioInitial('cuentas'); setTab('patrimonio') }} />}
        {tab === 'moves' && <MovesTab />}
        {tab === 'patrimonio' && <PatrimonioTab initialSub={patrimonioInitial} />}
        {tab === 'plan' && <BudgetsTab onGoGoals={() => { setPatrimonioInitial('huchas'); setTab('patrimonio') }} />}
        {tab === 'utiles' && <UtilesTab />}
        {tab === 'conta' && <ContabilidadTab />}
      </div>
    </div>
  )
}
