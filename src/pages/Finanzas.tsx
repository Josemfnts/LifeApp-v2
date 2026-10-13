import { useState, useEffect } from 'react'
import { useFinanceStore } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import { SummaryTab } from '@/components/finanzas/SummaryTab'
import { MovesTab } from '@/components/finanzas/MovesTab'
import { UtilesTab } from '@/components/finanzas/utiles/UtilesTab'
import { PatrimonioTab } from '@/components/finanzas/PatrimonioTab'
import { BudgetsTab } from '@/components/finanzas/BudgetsTab'
import { ContabilidadTab } from '@/components/finanzas/ContabilidadTab'

type Tab = 'inicio' | 'moves' | 'patrimonio' | 'plan' | 'utiles' | 'conta'

export default function Finanzas() {
  const [tab, setTab] = useState<Tab>('inicio')
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
    <div>
      <div className="page-header">
        <div className="page-title">Finanzas</div>
        {/* Exportar CSV vive en Movs (donde están los movimientos), no en la cabecera. */}
        <div className="tab-bar">
          {(['inicio','moves','patrimonio','plan','utiles','conta'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`tab-btn tab-gold${tab === t ? ' active' : ''}`}>
              {{inicio:'Inicio',moves:'Movs',patrimonio:'Patrimonio',plan:'Plan',utiles:'Útiles',conta:'Conta'}[t]}
            </button>
          ))}
        </div>
      </div>
      <div key={tab} className="animate-tab" style={{ padding: 16 }}>
        {tab === 'inicio' && <SummaryTab onGoPatrimonio={() => setTab('patrimonio')} />}
        {tab === 'moves' && <MovesTab />}
        {tab === 'patrimonio' && <PatrimonioTab />}
        {tab === 'plan' && <BudgetsTab />}
        {tab === 'utiles' && <UtilesTab />}
        {tab === 'conta' && <ContabilidadTab />}
      </div>
    </div>
  )
}
