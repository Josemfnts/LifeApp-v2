import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useFinanceStore } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import { localISO } from '@/lib/finance/dates'
import { parseEuroInput } from '@/lib/finance/money'
import { searchCoins, type CoinHit } from '@/lib/finance/prices'
import type { Holding, HoldingKind } from '@/lib/finance/investments'
import { KIND_META } from './meta'

interface Props {
  open: boolean
  onClose: () => void
}

const label = { fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4, marginTop: 8 } as const

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function AddHoldingSheet({ open, onClose }: Props) {
  const cuentas = useFinanceStore(s => s.cuentas)
  const addHolding = useFinanceStore(s => s.addHolding)
  const refreshPrices = useFinanceStore(s => s.refreshPrices)
  const toast = useToast()

  const [kind, setKind] = useState<HoldingKind>('etf')
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<CoinHit[]>([])
  const [coin, setCoin] = useState<CoinHit | null>(null)
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [isin, setIsin] = useState('')
  const [price, setPrice] = useState('')
  const [date, setDate] = useState(localISO())
  const [qty, setQty] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [fees, setFees] = useState('')
  const [cuenta, setCuenta] = useState('')

  function reset() {
    setKind('etf'); setQ(''); setHits([]); setCoin(null); setName(''); setSymbol(''); setIsin('')
    setPrice(''); setDate(localISO()); setQty(''); setUnitCost(''); setFees(''); setCuenta('')
  }
  function close() { reset(); onClose() }

  // Buscador de CoinGecko con debounce de 400 ms; ignora respuestas de búsquedas ya superadas.
  useEffect(() => {
    if (kind !== 'crypto' || coin || q.trim().length < 2) { setHits([]); return }
    let current = true
    const t = setTimeout(() => { void searchCoins(q).then(r => { if (current) setHits(r) }) }, 400)
    return () => { current = false; clearTimeout(t) }
  }, [q, kind, coin])

  function pickCoin(c: CoinHit) {
    setCoin(c); setName(c.name); setSymbol(c.symbol); setHits([]); setQ(c.name)
  }

  function handleSave() {
    const quantity = parseEuroInput(qty)
    const cost = parseEuroInput(unitCost)
    const fee = fees.trim() ? parseEuroInput(fees) : 0
    if (!name.trim()) { toast.show('Pon un nombre'); return }
    if (!(quantity > 0)) { toast.show('Cantidad inválida'); return }
    if (!(cost >= 0) || Number.isNaN(fee) || fee < 0) { toast.show('Precio o comisión inválidos'); return }
    const manual = kind === 'crypto' ? NaN : (price.trim() ? parseEuroInput(price) : cost)
    const h: Holding = {
      id: newId(),
      kind,
      name: name.trim(),
      ...(symbol.trim() ? { symbol: symbol.trim().toUpperCase() } : {}),
      ...(isin.trim() ? { isin: isin.trim().toUpperCase() } : {}),
      ...(coin ? { coingeckoId: coin.id, ...(coin.thumb ? { image: coin.thumb } : {}) } : {}),
      ...(manual > 0 ? { manualPrice: manual, priceAt: localISO() } : {}),
      ...(cuenta ? { cuenta } : {}),
      lots: [{ id: newId(), date, quantity, unitCost: cost, fees: fee, source: 'buy' }],
      sales: [],
    }
    addHolding(h, cuenta || undefined)
    if (h.coingeckoId) void refreshPrices()
    toast.show(`✓ ${h.name} añadida a la cartera`)
    close()
  }

  return (
    <Modal open={open} onClose={close} title="Nueva inversión">
      <div style={{ padding: '0 20px 8px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
          {(Object.keys(KIND_META) as HoldingKind[]).map(k => (
            <button key={k} type="button" onClick={() => { setKind(k); setCoin(null) }}
              style={{ padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                background: kind === k ? 'rgba(91,138,240,0.12)' : 'var(--color-s2)',
                color: kind === k ? 'var(--color-acc-blue)' : 'var(--color-sub)',
                borderColor: kind === k ? 'rgba(91,138,240,0.3)' : 'var(--color-border)' }}>
              {KIND_META[k].icon} {KIND_META[k].label}
            </button>
          ))}
        </div>

        {kind === 'crypto' ? (
          <>
            <div style={label}>Buscar moneda</div>
            <input className="inp" value={q} onChange={e => { setQ(e.target.value); setCoin(null) }} placeholder="Bitcoin, ETH, Solana…" autoComplete="off" />
            {coin && <div style={{ fontSize: 12, color: 'var(--color-acc-green)', marginTop: 4 }}>✓ {coin.name} ({coin.symbol}) · precio en vivo</div>}
            {hits.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                {hits.map(h => (
                  <button key={h.id} type="button" onClick={() => pickCoin(h)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'var(--color-s2)', border: '1px solid var(--color-border)', cursor: 'pointer', textAlign: 'left' }}>
                    {h.thumb ? <img src={h.thumb} alt="" width={22} height={22} /> : <span>🪙</span>}
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text)' }}>{h.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--color-dim)' }}>{h.symbol}</span>
                  </button>
                ))}
              </div>
            )}
            {!coin && (
              <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 4 }}>Si no la encuentras (o no hay conexión), escribe el nombre abajo y usa precio manual.</div>
            )}
          </>
        ) : null}

        <div style={label}>Nombre</div>
        <input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder={kind === 'fund' ? 'Ej: Indexa Global' : 'Ej: Vanguard FTSE All-World'} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <div style={label}>Símbolo</div>
            <input className="inp" value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="VWCE" />
          </div>
          {kind !== 'crypto' && (
            <div>
              <div style={label}>ISIN</div>
              <input className="inp" value={isin} onChange={e => setIsin(e.target.value)} placeholder="IE00BK5BQT80" />
            </div>
          )}
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-sub)', marginTop: 14 }}>Primera compra</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <div style={label}>Cantidad</div>
            <input className="inp" value={qty} onChange={e => setQty(e.target.value)} inputMode="decimal" placeholder="10" />
          </div>
          <div>
            <div style={label}>Precio por unidad (€)</div>
            <input className="inp" value={unitCost} onChange={e => setUnitCost(e.target.value)} inputMode="decimal" placeholder="105,40" />
          </div>
          <div>
            <div style={label}>Comisión (€)</div>
            <input className="inp" value={fees} onChange={e => setFees(e.target.value)} inputMode="decimal" placeholder="0" />
          </div>
          <div>
            <div style={label}>Fecha</div>
            <input className="inp" value={date} onChange={e => setDate(e.target.value)} type="date" style={{ fontSize: 13 }} />
          </div>
        </div>
        {kind !== 'crypto' && (
          <>
            <div style={label}>Precio actual (€, opcional — si lo dejas vacío se usa el de compra)</div>
            <input className="inp" value={price} onChange={e => setPrice(e.target.value)} inputMode="decimal" />
          </>
        )}
        <div style={label}>Cuenta de cargo (opcional)</div>
        <select className="inp" value={cuenta} onChange={e => setCuenta(e.target.value)}>
          <option value="">No sale de ninguna cuenta</option>
          {cuentas.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 4 }}>
          Si eliges cuenta, la compra baja su saldo sin contar como gasto: el dinero pasa a la cartera.
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '12px 20px 0' }}>
        <button onClick={close} className="btn-ghost" style={{ width: '100%' }}>Cancelar</button>
        <button onClick={handleSave} className="btn-primary" style={{ background: 'var(--color-acc-blue)', width: 'auto' }}>Guardar</button>
      </div>
    </Modal>
  )
}
