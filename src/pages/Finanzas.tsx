import { useState, useEffect } from 'react'
import { useFinanceStore } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import { exportCSV } from '@/components/finanzas/shared'
import { SummaryTab } from '@/components/finanzas/SummaryTab'
import { MovesTab } from '@/components/finanzas/MovesTab'
import { AnalysisTab } from '@/components/finanzas/AnalysisTab'
import { PatrimonioTab } from '@/components/finanzas/PatrimonioTab'
import { BudgetsTab } from '@/components/finanzas/BudgetsTab'

type Tab = 'summary' | 'moves' | 'analysis' | 'patrimonio' | 'budgets'

export default function Finanzas() {
  const [tab, setTab] = useState<Tab>('summary')
  const store = useFinanceStore()
  const toast = useToast()
  const processRecurrentes = useFinanceStore(s => s.processRecurrentes)
  const toastShow = useToast(s => s.show)

  useEffect(() => {
    const newTxs = processRecurrentes()
    if (newTxs.length > 0) toastShow(`✓ ${newTxs.length} transacciones recurrentes añadidas`)
  }, [processRecurrentes, toastShow])

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Finanzas</div>
        <div className="tab-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', overflowX: 'auto', overflowY: 'hidden', minWidth: 0 }}>
            {(['summary','moves','analysis','patrimonio','budgets'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`tab-btn tab-gold${tab === t ? ' active' : ''}`}>
                {{summary:'Resumen',moves:'Movs',analysis:'Análisis',patrimonio:'Patrimonio',budgets:'Presupuesto'}[t]}
              </button>
            ))}
          </div>
          <button onClick={() => exportCSV(store.txs, toast)} style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-dim)', borderRadius: 8, padding: '4px 8px', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', flexShrink: 0, marginRight: 8 }}>CSV</button>
        </div>
      </div>
      <div style={{ padding: 16 }}>
        {tab === 'summary' && <SummaryTab />}
        {tab === 'moves' && <MovesTab />}
        {tab === 'analysis' && <AnalysisTab />}
        {tab === 'patrimonio' && <PatrimonioTab />}
        {tab === 'budgets' && <BudgetsTab />}
      </div>
    </div>
  )
}
