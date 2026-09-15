import { useEffect, useMemo, useState } from 'react'
import { useFinanceStore, fmt, fmtShort } from '@/stores/financeStore'
import { portfolio, position, resolvePrice, valuation } from '@/lib/finance/investments'
import { AnimatedNumber } from '../AnimatedNumber'
import { AddHoldingSheet } from './AddHoldingSheet'
import { HoldingDetailSheet } from './HoldingDetailSheet'
import { KIND_META, freshnessLabel, holdingIcon, toneColor } from './meta'

const REFRESH_MS = 60_000

export function InvestmentsSection() {
  const holdings = useFinanceStore(s => s.holdings)
  const priceCache = useFinanceStore(s => s.priceCache)
  const refreshPrices = useFinanceStore(s => s.refreshPrices)
  const [now, setNow] = useState(() => Date.now())
  const [addOpen, setAddOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  // Precios en vivo solo con la sección visible y la pestaña del navegador activa, cada 60 s.
  const cryptoKey = holdings.map(h => h.coingeckoId).filter(Boolean).join(',')
  useEffect(() => {
    if (!cryptoKey) return
    let alive = true
    const tick = () => {
      if (document.visibilityState !== 'visible') return
      void refreshPrices().then(() => { if (alive) setNow(Date.now()) })
    }
    tick()
    const timer = setInterval(tick, REFRESH_MS)
    return () => { alive = false; clearInterval(timer) }
  }, [cryptoKey, refreshPrices])

  const pf = useMemo(() => portfolio(holdings, priceCache, now), [holdings, priceCache, now])
  const pct = pf.cost > 0 ? (pf.unrealized / pf.cost) * 100 : null
  const up = pf.unrealized >= 0

  return (
    <div>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 20, padding: 20, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Cartera de inversión</div>
        <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 38, lineHeight: 1, color: 'var(--color-text)' }}>
          <AnimatedNumber value={pf.value} format={fmt} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: up ? 'var(--color-acc-green)' : 'var(--color-red)' }}>
              {up ? '+' : ''}{fmt(pf.unrealized)}{pct !== null ? ` (${up ? '+' : ''}${pct.toFixed(1)}%)` : ''}
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-dim)' }}>Latente</div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: pf.realized >= 0 ? 'var(--color-acc-green)' : 'var(--color-red)' }}>
              {pf.realized >= 0 ? '+' : ''}{fmt(pf.realized)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-dim)' }}>Realizado</div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-sub)' }}>{fmtShort(pf.cost)}</div>
            <div style={{ fontSize: 10, color: 'var(--color-dim)' }}>Invertido</div>
          </div>
        </div>
        {pf.invalid.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--color-acc-gold)', marginTop: 10 }}>
            ⚠️ Revisa {pf.invalid.join(', ')}: tiene ventas que superan lo comprado y no se cuenta.
          </div>
        )}
        <div style={{ fontSize: 10, color: 'var(--color-dim)', marginTop: 10 }}>
          Rentabilidad de cada posición = (valor − coste) / coste. Las plusvalías no son ingresos.
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Posiciones</div>
        <button onClick={() => setAddOpen(true)}
          style={{ background: 'rgba(91,138,240,0.1)', color: 'var(--color-acc-blue)', border: '1px solid rgba(91,138,240,0.2)', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>+ Añadir</button>
      </div>

      {holdings.length === 0 ? (
        <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📈</div>
          <div style={{ fontSize: 14, color: 'var(--color-sub)' }}>Sin inversiones todavía</div>
          <div style={{ fontSize: 12, color: 'var(--color-dim)', marginTop: 6 }}>Acciones, ETF, fondos o cripto (con precio en vivo).</div>
        </div>
      ) : (
        <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
          {holdings.map(h => {
            let qty = 0
            let broken = false
            try { qty = position(h).quantity } catch { broken = true }
            const rp = resolvePrice(h, priceCache, now)
            const fresh = freshnessLabel(rp)
            let value = 0
            let unrealized = 0
            let upct: number | null = null
            if (!broken) {
              const v = valuation(h, rp.price)
              value = v.value
              unrealized = v.unrealized
              upct = v.unrealizedPct
            }
            const pos = unrealized >= 0
            return (
              <div key={h.id} onClick={() => setDetailId(h.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', opacity: h.includeInNw === false ? 0.6 : 1 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: 'var(--color-s2)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, overflow: 'hidden' }}>
                  {h.image ? <img src={h.image} alt="" width={26} height={26} /> : holdingIcon(h)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {h.name}{h.symbol ? <span style={{ color: 'var(--color-dim)', fontWeight: 500 }}> · {h.symbol}</span> : null}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-dim)' }}>
                    {broken ? '⚠️ ventas imposibles' : `${qty} × ${fmt(rp.price)}`} · <span style={{ color: toneColor(fresh.tone) }}>{fresh.text}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 17, color: 'var(--color-text)' }}>{fmtShort(value)}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: pos ? 'var(--color-acc-green)' : 'var(--color-red)' }}>
                    {pos ? '+' : ''}{fmtShort(unrealized)}{upct !== null ? ` · ${pos ? '+' : ''}${upct.toFixed(1)}%` : ''}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {Object.keys(pf.byKind).length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {Object.entries(pf.byKind).map(([k, v]) => (
            <span key={k} style={{ fontSize: 11, color: 'var(--color-sub)', background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 99, padding: '3px 10px' }}>
              {KIND_META[k as keyof typeof KIND_META]?.icon} {KIND_META[k as keyof typeof KIND_META]?.label} {fmtShort(v ?? 0)}
            </span>
          ))}
        </div>
      )}

      <AddHoldingSheet open={addOpen} onClose={() => setAddOpen(false)} />
      <HoldingDetailSheet holdingId={detailId} onClose={() => setDetailId(null)} />
    </div>
  )
}
