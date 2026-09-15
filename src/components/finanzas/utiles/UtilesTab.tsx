import { useState } from 'react'
import { AnalysisTab } from '../AnalysisTab'
import { SimulatorsSection } from './SimulatorsSection'
import { MonthlyReport } from './MonthlyReport'

type Sub = 'analisis' | 'simuladores' | 'informe'

// Pestaña Útiles: Análisis · Simuladores · Informe.
export function UtilesTab() {
  const [sub, setSub] = useState<Sub>('analisis')
  return (
    <div>
      <div className="no-print" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12, paddingBottom: 4 }}>
        {([
          { k: 'analisis' as const, l: '📊 Análisis' },
          { k: 'simuladores' as const, l: '🧮 Simuladores' },
          { k: 'informe' as const, l: '📄 Informe' },
        ]).map(s => (
          <button key={s.k} onClick={() => setSub(s.k)}
            style={{ flex: '0 0 auto', whiteSpace: 'nowrap', padding: '10px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700,
              fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid',
              background: sub === s.k ? 'rgba(91,138,240,0.12)' : 'transparent',
              color: sub === s.k ? 'var(--color-acc-blue)' : 'var(--color-dim)',
              borderColor: sub === s.k ? 'rgba(91,138,240,0.3)' : 'var(--color-border)' }}>{s.l}</button>
        ))}
      </div>
      {sub === 'analisis' && <AnalysisTab />}
      {sub === 'simuladores' && <SimulatorsSection />}
      {sub === 'informe' && <MonthlyReport />}
    </div>
  )
}
