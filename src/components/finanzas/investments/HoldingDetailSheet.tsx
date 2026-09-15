import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useFinanceStore, fmt } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import { localISO } from '@/lib/finance/dates'
import { parseEuroInput } from '@/lib/finance/money'
import { applySplit, position, resolvePrice, valuation, type Lot } from '@/lib/finance/investments'
import { KIND_META, freshnessLabel, toneColor } from './meta'

interface Props {
  holdingId: string | null
  onClose: () => void
}

type Mode = 'buy' | 'sell' | 'price' | 'split' | 'dca' | null

const label = { fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4, marginTop: 8 } as const
const stat = { fontSize: 10, color: 'var(--color-dim)' } as const
const statVal = { fontSize: 14, fontWeight: 700, color: 'var(--color-text)' } as const

export function HoldingDetailSheet({ holdingId, onClose }: Props) {
  const holdings = useFinanceStore(s => s.holdings)
  const cuentas = useFinanceStore(s => s.cuentas)
  const priceCache = useFinanceStore(s => s.priceCache)
  const { buyLot, sell, updateHolding, removeHolding } = useFinanceStore()
  const toast = useToast()

  const [mode, setMode] = useState<Mode>(null)
  const [date, setDate] = useState(localISO())
  const [qty, setQty] = useState('')
  const [amount, setAmount] = useState('')
  const [fees, setFees] = useState('')
  const [cuenta, setCuenta] = useState('')
  const [source, setSource] = useState<NonNullable<Lot['source']>>('buy')
  const [ratio, setRatio] = useState('')
  const [dcaDay, setDcaDay] = useState('1')
  const [dcaActive, setDcaActive] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const h = holdings.find(x => x.id === holdingId)
  if (!h) return null

  let pos: ReturnType<typeof position> | null = null
  try { pos = position(h) } catch { pos = null }
  const rp = resolvePrice(h, priceCache, Date.now())
  const val = pos ? valuation(h, rp.price) : null
  const fresh = freshnessLabel(rp)

  function openMode(m: Mode) {
    setMode(m); setDate(localISO()); setQty(''); setFees(''); setSource('buy')
    setCuenta(h?.cuenta ?? '')
    if (m === 'price') setAmount(h?.manualPrice !== undefined ? String(h.manualPrice) : '')
    else if (m === 'dca') {
      setAmount(h?.dca ? String(h.dca.amount) : '')
      setDcaDay(String(h?.dca?.day ?? 1)); setDcaActive(h?.dca?.active ?? true); setCuenta(h?.dca?.cuenta ?? h?.cuenta ?? '')
    } else setAmount('')
    setRatio('')
  }

  function close() { setMode(null); onClose() }

  function submit() {
    if (!h) return
    const q = parseEuroInput(qty)
    const a = parseEuroInput(amount)
    const f = fees.trim() ? parseEuroInput(fees) : 0
    try {
      if (mode === 'buy') {
        if (!(q > 0) || !(a >= 0) || Number.isNaN(f)) { toast.show('Revisa cantidad, precio y comisión'); return }
        buyLot(h.id, { date, quantity: q, unitCost: a, fees: f, source }, cuenta || undefined)
        toast.show(source === 'buy' ? '✓ Compra añadida' : `✓ ${source === 'staking' ? 'Staking' : 'Airdrop'} añadido a coste 0`)
      } else if (mode === 'sell') {
        if (!(q > 0) || !(a >= 0) || Number.isNaN(f)) { toast.show('Revisa cantidad, precio y comisión'); return }
        sell(h.id, { date, quantity: q, unitPrice: a, fees: f }, cuenta || undefined)
        toast.show('✓ Venta registrada')
      } else if (mode === 'price') {
        if (!(a > 0)) { toast.show('Precio inválido'); return }
        updateHolding(h.id, { manualPrice: a, priceAt: date })
        toast.show('✓ Precio actualizado')
      } else if (mode === 'split') {
        const r = parseEuroInput(ratio)
        if (!(r > 0)) { toast.show('Ratio inválido'); return }
        updateHolding(h.id, applySplit(h, r))
        toast.show(`✓ Split ${r}:1 aplicado`)
      } else if (mode === 'dca') {
        const day = Math.min(28, Math.max(1, Number(dcaDay) || 1))
        if (!(a > 0) || !cuenta) { toast.show('Pon importe y cuenta'); return }
        updateHolding(h.id, { dca: { amount: a, day, cuenta, active: dcaActive, ...(h.dca?.lastRun ? { lastRun: h.dca.lastRun } : {}) } })
        toast.show('✓ Compra periódica guardada')
      }
      setMode(null)
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'No se pudo guardar')
    }
  }

  const btn = (m: Exclude<Mode, null>, text: string) => (
    <button type="button" onClick={() => openMode(mode === m ? null : m)}
      style={{ padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid',
        background: mode === m ? 'rgba(91,138,240,0.12)' : 'var(--color-s2)',
        color: mode === m ? 'var(--color-acc-blue)' : 'var(--color-sub)',
        borderColor: mode === m ? 'rgba(91,138,240,0.3)' : 'var(--color-border)' }}>{text}</button>
  )

  const cuentaSelect = (
    <>
      <div style={label}>Cuenta</div>
      <select className="inp" value={cuenta} onChange={e => setCuenta(e.target.value)}>
        <option value="">{mode === 'dca' ? 'Elige cuenta…' : 'Ninguna (no mueve saldo)'}</option>
        {cuentas.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
      </select>
    </>
  )

  return (
    <>
      <Modal open={!!holdingId} onClose={close} title={`${KIND_META[h.kind]?.icon ?? ''} ${h.name}`}>
        <div style={{ padding: '0 20px 8px' }}>
          <div style={{ fontSize: 12, color: 'var(--color-dim)', marginBottom: 10 }}>
            {[h.symbol, h.isin, KIND_META[h.kind]?.label].filter(Boolean).join(' · ')} · <span style={{ color: toneColor(fresh.tone) }}>{fresh.text}</span>
          </div>

          {pos ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, background: 'var(--color-s2)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 12 }}>
              <div><div style={statVal}>{pos.quantity}</div><div style={stat}>Cantidad</div></div>
              <div><div style={statVal}>{fmt(rp.price)}</div><div style={stat}>Precio</div></div>
              <div><div style={statVal}>{fmt(val?.value ?? 0)}</div><div style={stat}>Valor</div></div>
              <div><div style={statVal}>{fmt(pos.avgCost)}</div><div style={stat}>Coste medio</div></div>
              <div><div style={statVal}>{fmt(pos.costBasis)}</div><div style={stat}>Coste total</div></div>
              <div>
                <div style={{ ...statVal, color: (val?.unrealized ?? 0) >= 0 ? 'var(--color-acc-green)' : 'var(--color-red)' }}>
                  {fmt(val?.unrealized ?? 0)}{val?.unrealizedPct != null ? ` · ${val.unrealizedPct.toFixed(1)}%` : ''}
                </div>
                <div style={stat}>Latente</div>
              </div>
              <div><div style={{ ...statVal, color: pos.realized >= 0 ? 'var(--color-acc-green)' : 'var(--color-red)' }}>{fmt(pos.realized)}</div><div style={stat}>Realizado</div></div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--color-acc-gold)' }}>⚠️ Las ventas superan lo comprado: revisa los movimientos de abajo.</div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '12px 0 4px' }}>
            {btn('buy', 'Comprar')}
            {btn('sell', 'Vender')}
            {btn('price', 'Precio manual')}
            {btn('split', 'Split')}
            {btn('dca', 'Compra periódica')}
          </div>

          {(mode === 'buy' || mode === 'sell') && (
            <div>
              {mode === 'buy' && h.kind === 'crypto' && (
                <>
                  <div style={label}>Tipo</div>
                  <select className="inp" value={source} onChange={e => setSource(e.target.value as NonNullable<Lot['source']>)}>
                    <option value="buy">Compra</option>
                    <option value="staking">Staking (coste 0)</option>
                    <option value="airdrop">Airdrop (coste 0)</option>
                  </select>
                </>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><div style={label}>Cantidad</div><input className="inp" value={qty} onChange={e => setQty(e.target.value)} inputMode="decimal" /></div>
                <div><div style={label}>{mode === 'buy' ? 'Precio compra (€/ud)' : 'Precio venta (€/ud)'}</div><input className="inp" value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" /></div>
                <div><div style={label}>Comisión (€)</div><input className="inp" value={fees} onChange={e => setFees(e.target.value)} inputMode="decimal" placeholder="0" /></div>
                <div><div style={label}>Fecha</div><input className="inp" value={date} onChange={e => setDate(e.target.value)} type="date" style={{ fontSize: 13 }} /></div>
              </div>
              {!(mode === 'buy' && source !== 'buy') && cuentaSelect}
            </div>
          )}

          {mode === 'price' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><div style={label}>Precio (€/ud)</div><input className="inp" value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" /></div>
              <div><div style={label}>Fecha del precio</div><input className="inp" value={date} onChange={e => setDate(e.target.value)} type="date" style={{ fontSize: 13 }} /></div>
            </div>
          )}

          {mode === 'split' && (
            <>
              <div style={label}>Ratio (4 = cada acción pasa a ser 4)</div>
              <input className="inp" value={ratio} onChange={e => setRatio(e.target.value)} inputMode="decimal" placeholder="4" />
              <div style={{ fontSize: 11, color: 'var(--color-dim)' }}>Multiplica cantidades y divide precios; el coste total no cambia.</div>
            </>
          )}

          {mode === 'dca' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><div style={label}>Importe al mes (€)</div><input className="inp" value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" /></div>
                <div><div style={label}>Día del mes (1-28)</div><input className="inp" value={dcaDay} onChange={e => setDcaDay(e.target.value)} inputMode="numeric" /></div>
              </div>
              {cuentaSelect}
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--color-sub)', marginTop: 8 }}>
                <input type="checkbox" checked={dcaActive} onChange={e => setDcaActive(e.target.checked)} /> Activa
              </label>
              <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 4 }}>
                Al abrir Finanzas a partir de ese día se compra al precio del momento (si no hay precio, se avisa y no compra).
              </div>
            </>
          )}

          {mode && (
            <button onClick={submit} className="btn-primary" style={{ background: 'var(--color-acc-blue)', width: '100%', marginTop: 12 }}>Guardar</button>
          )}

          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-sub)', margin: '16px 0 6px' }}>Movimientos</div>
          {[...h.lots.map(l => ({ id: l.id, date: l.date, text: `${l.source === 'staking' ? 'Staking' : l.source === 'airdrop' ? 'Airdrop' : l.source === 'dca' ? 'Compra periódica' : 'Compra'} ${l.quantity} × ${fmt(l.unitCost)}${l.fees ? ` + ${fmt(l.fees)}` : ''}` })),
            ...h.sales.map(s => ({ id: s.id, date: s.date, text: `Venta ${s.quantity} × ${fmt(s.unitPrice)}${s.fees ? ` − ${fmt(s.fees)}` : ''}` }))]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map(m => (
              <div key={m.id} style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--color-sub)', padding: '5px 0', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ color: 'var(--color-dim)', flexShrink: 0 }}>{m.date}</span>
                <span>{m.text}</span>
              </div>
            ))}

          <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 10 }}>
            Los dividendos se apuntan como un ingreso normal con la categoría «Dividendos».
          </div>

          <button onClick={() => setConfirmDelete(true)}
            style={{ marginTop: 14, width: '100%', padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'var(--color-s2)', color: 'var(--color-red)', border: '1px solid var(--color-border)' }}>
            Borrar inversión
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="Borrar inversión"
        message={`Se borra «${h.name}» con sus compras y ventas. Los movimientos de cuenta que generó se mantienen.`}
        confirmLabel="Borrar"
        danger
        onConfirm={() => { removeHolding(h.id); toast.show('Inversión borrada'); close() }}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  )
}
