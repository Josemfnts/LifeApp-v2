import { useEffect, useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useFinanceStore, fmt } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import { localISO } from '@/lib/finance/dates'
import { parseEuroInput, roundEuros } from '@/lib/finance/money'
import { currentValue, equity, valueSeries, type Property } from '@/lib/finance/properties'
import { PROPERTY_KIND, newId, pctInput } from './meta'

interface Props {
  open: boolean
  propertyId: string | null
  onClose: () => void
}

const label = { fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4, marginTop: 8 } as const
const stat = { fontSize: 10, color: 'var(--color-dim)' } as const
const statVal = { fontSize: 14, fontWeight: 700, color: 'var(--color-text)' } as const
const box = { background: 'var(--color-s2)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 12, marginTop: 12 } as const

export function PropertySheet({ open, propertyId, onClose }: Props) {
  const properties = useFinanceStore(s => s.properties)
  const debts = useFinanceStore(s => s.debts)
  const { saveProperty, removeProperty, addValuation, saveDebt } = useFinanceStore()
  const toast = useToast()
  const existing = propertyId ? properties.find(p => p.id === propertyId) : undefined

  const [editing, setEditing] = useState(true)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<Property['kind']>('home')
  const [price, setPrice] = useState('')
  const [date, setDate] = useState(localISO())
  const [surface, setSurface] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [cadastralRef, setCadastralRef] = useState('')
  const [mode, setMode] = useState<Property['valuationMode']>('manual')
  const [pct, setPct] = useState('')
  const [includeInNw, setIncludeInNw] = useState(true)
  const [valDate, setValDate] = useState(localISO())
  const [valValue, setValValue] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const wasOpen = useRef(false)
  useEffect(() => {
    const opening = open && !wasOpen.current
    wasOpen.current = open
    if (!opening) return
    const p = existing
    setEditing(!p)
    setName(p?.name ?? ''); setKind(p?.kind ?? 'home'); setPrice(p ? String(p.purchasePrice) : '')
    setDate(p?.purchaseDate ?? localISO()); setSurface(p?.surface ? String(p.surface) : '')
    setPostalCode(p?.postalCode ?? ''); setCadastralRef(p?.cadastralRef ?? '')
    setMode(p?.valuationMode ?? 'manual'); setPct(pctInput(p?.annualPct)); setIncludeInNw(p?.includeInNw !== false)
    setValDate(localISO()); setValValue('')
  }, [open, existing])

  const today = localISO()

  function handleSave() {
    const P = parseEuroInput(price)
    const a = pct.trim() ? parseEuroInput(pct) : 0
    const s = surface.trim() ? parseEuroInput(surface) : NaN
    if (!name.trim() || !(P > 0)) { toast.show('Pon nombre y precio de compra'); return }
    if (mode === 'annual_pct' && Number.isNaN(a)) { toast.show('Revisa el % anual'); return }
    const p: Property = {
      id: existing?.id ?? newId(),
      name: name.trim(),
      kind,
      purchasePrice: roundEuros(P),
      purchaseDate: date,
      ...(s > 0 ? { surface: s } : {}),
      ...(postalCode.trim() ? { postalCode: postalCode.trim() } : {}),
      ...(cadastralRef.trim() ? { cadastralRef: cadastralRef.trim() } : {}),
      valuationMode: mode,
      ...(mode === 'annual_pct' ? { annualPct: a / 100 } : {}),
      valuations: existing?.valuations ?? [],
      ...(includeInNw ? {} : { includeInNw: false }),
    }
    saveProperty(p)
    toast.show(`✓ ${p.name} guardado`)
    if (existing) setEditing(false)
    else onClose()
  }

  function linkDebt(debtId: string) {
    if (!existing) return
    for (const d of debts) {
      if (d.id === debtId && d.propertyId !== existing.id) saveDebt({ ...d, propertyId: existing.id })
      if (d.id !== debtId && d.propertyId === existing.id) saveDebt({ ...d, propertyId: undefined })
    }
  }

  const value = existing ? currentValue(existing, today) : 0
  const gain = existing ? value - existing.purchasePrice : 0
  const gainPct = existing && existing.purchasePrice > 0 ? (gain / existing.purchasePrice) * 100 : 0
  const linked = existing ? debts.find(d => d.propertyId === existing.id) : undefined
  const series = existing ? valueSeries(existing, today) : []
  const maxValue = Math.max(1, ...series.map(x => x.value))

  return (
    <>
      <Modal open={open} onClose={onClose} title={existing ? `${PROPERTY_KIND[existing.kind].icon} ${existing.name}` : 'Nuevo inmueble'}>
        <div style={{ padding: '0 20px 8px' }}>
          {existing && !editing && (
            <>
              {existing.valuationMode === 'annual_pct' && (
                <div style={{ fontSize: 12, color: 'var(--color-acc-gold)', marginBottom: 8 }}>
                  Valor estimado por índice ({pctInput(existing.annualPct)} % anual), no tasación.
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, ...box, marginTop: 0 }}>
                <div><div style={statVal}>{fmt(value)}</div><div style={stat}>Valor actual</div></div>
                <div><div style={statVal}>{fmt(existing.purchasePrice)}</div><div style={stat}>Compra ({existing.purchaseDate})</div></div>
                <div>
                  <div style={{ ...statVal, color: gain >= 0 ? 'var(--color-acc-green)' : 'var(--color-red)' }}>{gain >= 0 ? '+' : ''}{fmt(gain)} · {gainPct.toFixed(1)}%</div>
                  <div style={stat}>Revalorización</div>
                </div>
                <div><div style={statVal}>{fmt(equity(existing, debts, today))}</div><div style={stat}>Tuyo de verdad{linked ? ` (− ${linked.name})` : ''}</div></div>
              </div>

              <div style={box}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Nueva valoración</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><div style={label}>Fecha</div><input className="inp" type="date" value={valDate} onChange={e => setValDate(e.target.value)} style={{ fontSize: 13 }} /></div>
                  <div><div style={label}>Valor (€)</div><input className="inp" value={valValue} onChange={e => setValValue(e.target.value)} inputMode="decimal" /></div>
                </div>
                <button className="btn-ghost" style={{ width: '100%', marginTop: 8 }}
                  onClick={() => {
                    const v = parseEuroInput(valValue)
                    if (!(v > 0)) { toast.show('Valor inválido'); return }
                    addValuation(existing.id, { date: valDate, value: roundEuros(v), source: 'manual' })
                    setValValue('')
                    toast.show('✓ Valoración guardada')
                  }}>Guardar valoración</button>
                <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 6 }}>
                  {existing.valuationMode === 'annual_pct' ? 'La revalorización anual se aplica desde la última valoración manual.' : 'En modo manual, el valor es la última valoración.'}
                </div>
              </div>

              {debts.length > 0 && (
                <>
                  <div style={label}>Hipoteca ligada</div>
                  <select className="inp" value={linked?.id ?? ''} onChange={e => linkDebt(e.target.value)}>
                    <option value="">Ninguna</option>
                    {debts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </>
              )}

              {series.length > 1 && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-sub)', margin: '14px 0 6px' }}>Evolución</div>
                  {series.map(pt => (
                    <div key={pt.date} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--color-sub)', padding: '3px 0' }}>
                      <span style={{ width: 78, color: 'var(--color-dim)', flexShrink: 0 }}>{pt.date}</span>
                      <div style={{ flex: 1, height: 6, background: 'var(--color-s2)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${(pt.value / maxValue) * 100}%`, height: '100%', background: 'var(--color-acc-blue)' }} />
                      </div>
                      <span style={{ width: 90, textAlign: 'right', flexShrink: 0 }}>{fmt(pt.value)}</span>
                    </div>
                  ))}
                </>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
                <button className="btn-ghost" style={{ width: '100%' }} onClick={() => setEditing(true)}>Editar datos</button>
                <button className="btn-ghost" style={{ width: '100%', color: 'var(--color-red)' }} onClick={() => setConfirmDelete(true)}>Borrar</button>
              </div>
            </>
          )}

          {editing && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(Object.keys(PROPERTY_KIND) as Property['kind'][]).map(k => (
                  <button key={k} type="button" onClick={() => setKind(k)}
                    style={{ padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                      background: kind === k ? 'rgba(91,138,240,0.12)' : 'var(--color-s2)',
                      color: kind === k ? 'var(--color-acc-blue)' : 'var(--color-sub)',
                      borderColor: kind === k ? 'rgba(91,138,240,0.3)' : 'var(--color-border)' }}>
                    {PROPERTY_KIND[k].icon} {PROPERTY_KIND[k].label}
                  </button>
                ))}
              </div>
              <div style={label}>Nombre</div>
              <input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder="Piso Madrid" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><div style={label}>Precio de compra (€)</div><input className="inp" value={price} onChange={e => setPrice(e.target.value)} inputMode="decimal" /></div>
                <div><div style={label}>Fecha de compra</div><input className="inp" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ fontSize: 13 }} /></div>
                <div><div style={label}>Superficie (m²)</div><input className="inp" value={surface} onChange={e => setSurface(e.target.value)} inputMode="decimal" /></div>
                <div><div style={label}>Código postal</div><input className="inp" value={postalCode} onChange={e => setPostalCode(e.target.value)} inputMode="numeric" /></div>
              </div>
              <div style={label}>Referencia catastral (opcional)</div>
              <input className="inp" value={cadastralRef} onChange={e => setCadastralRef(e.target.value)} />
              <div style={label}>Valoración</div>
              <select className="inp" value={mode} onChange={e => setMode(e.target.value as Property['valuationMode'])}>
                <option value="manual">Manual (yo actualizo el valor)</option>
                <option value="annual_pct">Revalorización anual estimada (%)</option>
              </select>
              {mode === 'annual_pct' && (
                <><div style={label}>% anual</div><input className="inp" value={pct} onChange={e => setPct(e.target.value)} inputMode="decimal" placeholder="4" /></>
              )}
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--color-sub)', marginTop: 10 }}>
                <input type="checkbox" checked={includeInNw} onChange={e => setIncludeInNw(e.target.checked)} /> Contar en el patrimonio neto
              </label>
              <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 6 }}>
                Si ya lo tienes como cuenta de tipo Inmueble en Cuentas, bórrala allí: contaría dos veces.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
                <button className="btn-ghost" style={{ width: '100%' }} onClick={() => (existing ? setEditing(false) : onClose())}>Cancelar</button>
                <button className="btn-primary" style={{ background: 'var(--color-acc-blue)', width: 'auto' }} onClick={handleSave}>Guardar</button>
              </div>
            </>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete && !!existing}
        title="Borrar inmueble"
        message={existing ? `Se borra «${existing.name}» y sus valoraciones. Las hipotecas ligadas se quedan sin vínculo.` : ''}
        confirmLabel="Borrar"
        danger
        onConfirm={() => { if (existing) { removeProperty(existing.id); toast.show('Inmueble borrado'); onClose() } }}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  )
}
