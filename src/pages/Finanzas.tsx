import { useState, useEffect } from 'react'
import { useFinanceStore } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import { exportCSV } from '@/components/finanzas/shared'
import { SummaryTab } from '@/components/finanzas/SummaryTab'
import { MovesTab } from '@/components/finanzas/MovesTab'
import { UtilesTab } from '@/components/finanzas/utiles/UtilesTab'
import { PatrimonioTab } from '@/components/finanzas/PatrimonioTab'
import { BudgetsTab } from '@/components/finanzas/BudgetsTab'

type Tab = 'inicio' | 'moves' | 'patrimonio' | 'plan' | 'utiles'

export default function Finanzas() {
  const [tab, setTab] = useState<Tab>('inicio')
  const store = useFinanceStore()
  const toast = useToast()
  const processRecurrentes = useFinanceStore(s => s.processRecurrentes)
  const recordSnapshot = useFinanceStore(s => s.recordSnapshot)
  const runDueDca = useFinanceStore(s => s.runDueDca)
  const refreshPrices = useFinanceStore(s => s.refreshPrices)
  const toastShow = useToast(s => s.show)

  useEffect(() => {
    recordSnapshot()
    const newTxs = processRecurrentes()
    if (newTxs.length > 0) toastShow(`✓ ${newTxs.length} transacciones recurrentes añadidas`)
    // Precios de cripto al abrir Finanzas (no solo con Inversiones visible): la foto del día y la compra
    // periódica usan el precio de ahora. Si la red falla, siguen con la caché o el precio manual.
    void refreshPrices().catch(() => 0).then(() => {
      const dca = runDueDca()
      if (dca.done.length > 0) toastShow(`✓ Compra periódica hecha: ${dca.done.join(', ')}`)
      if (dca.skipped.length > 0) toastShow(`⚠️ Sin precio para la compra periódica de ${dca.skipped.join(', ')}`)
      recordSnapshot()
    })
  }, [processRecurrentes, recordSnapshot, refreshPrices, runDueDca, toastShow])

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Finanzas</div>
        <div className="tab-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', overflowX: 'auto', overflowY: 'hidden', minWidth: 0 }}>
            {(['inicio','moves','patrimonio','plan','utiles'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`tab-btn tab-gold${tab === t ? ' active' : ''}`}>
                {{inicio:'Inicio',moves:'Movs',patrimonio:'Patrimonio',plan:'Plan',utiles:'Útiles'}[t]}
              </button>
            ))}
          </div>
          <button onClick={() => exportCSV(store.txs, toast)} style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-dim)', borderRadius: 8, padding: '4px 8px', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', flexShrink: 0, marginRight: 8 }}>CSV</button>
        </div>
      </div>
      <div style={{ padding: 16 }}>
        {tab === 'inicio' && <SummaryTab onGoPatrimonio={() => setTab('patrimonio')} />}
        {tab === 'moves' && <MovesTab />}
        {tab === 'patrimonio' && <PatrimonioTab />}
        {tab === 'plan' && <BudgetsTab />}
        {tab === 'utiles' && <UtilesTab />}
      </div>
    </div>
  )
}
