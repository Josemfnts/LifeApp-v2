import { useState } from 'react'
import { useFinanceStore, fmt, fmtShort } from '@/stores/financeStore'
import { localISO } from '@/lib/finance/dates'
import { sumEuros } from '@/lib/finance/money'
import { currentValue, equity } from '@/lib/finance/properties'
import { PropertySheet } from './PropertySheet'
import { PROPERTY_KIND } from './meta'

export function PropertiesSection() {
  const properties = useFinanceStore(s => s.properties)
  const debts = useFinanceStore(s => s.debts)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetId, setSheetId] = useState<string | null>(null)
  const today = localISO()

  const counted = properties.filter(p => p.includeInNw !== false)
  const total = sumEuros(counted.map(p => currentValue(p, today)))
  const net = sumEuros(counted.map(p => equity(p, debts, today)))

  function open(id: string | null) { setSheetId(id); setSheetOpen(true) }

  return (
    <div>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 20, padding: 20, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Inmuebles</div>
        <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 38, lineHeight: 1, color: 'var(--color-text)' }}>{fmt(total)}</div>
        <div style={{ fontSize: 12, color: 'var(--color-sub)', marginTop: 8 }}>Descontando hipotecas ligadas: {fmt(net)}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Mis inmuebles</div>
        <button onClick={() => open(null)}
          style={{ background: 'rgba(91,138,240,0.1)', color: 'var(--color-acc-blue)', border: '1px solid rgba(91,138,240,0.2)', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>+ Añadir</button>
      </div>

      {properties.length === 0 ? (
        <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🏠</div>
          <div style={{ fontSize: 14, color: 'var(--color-sub)' }}>Sin inmuebles registrados</div>
          <div style={{ fontSize: 12, color: 'var(--color-dim)', marginTop: 6 }}>Vivienda, alquiler, garaje o terreno con su evolución de valor.</div>
        </div>
      ) : (
        <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
          {properties.map(p => {
            const value = currentValue(p, today)
            const gain = value - p.purchasePrice
            const gainPct = p.purchasePrice > 0 ? (gain / p.purchasePrice) * 100 : 0
            const up = gain >= 0
            return (
              <div key={p.id} onClick={() => open(p.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', opacity: p.includeInNw === false ? 0.6 : 1 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: 'var(--color-s2)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{PROPERTY_KIND[p.kind].icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-dim)' }}>
                    {PROPERTY_KIND[p.kind].label}{p.valuationMode === 'annual_pct' ? ' · valor estimado por índice, no tasación' : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 17, color: 'var(--color-text)' }}>{fmtShort(value)}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: up ? 'var(--color-acc-green)' : 'var(--color-red)' }}>{up ? '+' : ''}{gainPct.toFixed(1)}%</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <PropertySheet open={sheetOpen} propertyId={sheetId} onClose={() => setSheetOpen(false)} />
    </div>
  )
}
