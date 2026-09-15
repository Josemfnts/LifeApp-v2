import { useEffect, useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useFinanceStore, fmt } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import { localISO } from '@/lib/finance/dates'
import { parseEuroInput, roundEuros } from '@/lib/finance/money'
import { effectiveRate, nextPaymentSplit, remainingMonths, schedule, simulateExtra, type Debt, type DebtKind } from '@/lib/finance/debts'
import { DEBT_KIND, newId, pctInput } from './meta'

interface Props {
  open: boolean
  debtId: string | null
  onClose: () => void
}

const label = { fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4, marginTop: 8 } as const
const stat = { fontSize: 10, color: 'var(--color-dim)' } as const
const statVal = { fontSize: 14, fontWeight: 700, color: 'var(--color-text)' } as const
const box = { background: 'var(--color-s2)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 12, marginTop: 12 } as const

export function DebtSheet({ open, debtId, onClose }: Props) {
  const debts = useFinanceStore(s => s.debts)
  const cuentas = useFinanceStore(s => s.cuentas)
  const properties = useFinanceStore(s => s.properties)
  const { saveDebt, removeDebt, payDebt, extraAmortization } = useFinanceStore()
  const toast = useToast()
  const existing = debtId ? debts.find(d => d.id === debtId) : undefined

  const [editing, setEditing] = useState(true)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<DebtKind>('mortgage')
  const [principal, setPrincipal] = useState('')
  const [balance, setBalance] = useState('')
  const [rate, setRate] = useState('')
  const [rateType, setRateType] = useState<'fixed' | 'variable'>('fixed')
  const [euribor, setEuribor] = useState('')
  const [spread, setSpread] = useState('')
  const [months, setMonths] = useState('')
  const [startDate, setStartDate] = useState(localISO())
  const [paymentDay, setPaymentDay] = useState('1')
  const [cuenta, setCuenta] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [includeInNw, setIncludeInNw] = useState(true)
  const [payDate, setPayDate] = useState(localISO())
  const [payCuenta, setPayCuenta] = useState('')
  const [extra, setExtra] = useState('')
  const [extraMode, setExtraMode] = useState<'reduce_term' | 'reduce_payment'>('reduce_term')
  const [showAll, setShowAll] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Rellena el formulario solo al ABRIR (si dependiera de cada cambio del store, pagar una cuota
  // o una escritura de CompAI borraría lo que se está tecleando).
  const wasOpen = useRef(false)
  useEffect(() => {
    const opening = open && !wasOpen.current
    wasOpen.current = open
    if (!opening) return
    const d = existing
    setEditing(!d)
    setName(d?.name ?? ''); setKind(d?.kind ?? 'mortgage')
    setPrincipal(d ? String(d.principal) : ''); setBalance(d ? String(d.balance) : '')
    setRate(pctInput(d?.annualRate)); setRateType(d?.rateType ?? 'fixed')
    setEuribor(pctInput(d?.euribor)); setSpread(pctInput(d?.spread))
    setMonths(d ? String(d.termMonths) : ''); setStartDate(d?.startDate ?? localISO())
    setPaymentDay(String(d?.paymentDay ?? 1)); setCuenta(d?.cuenta ?? '')
    setPropertyId(d?.propertyId ?? ''); setIncludeInNw(d?.includeInNw !== false)
    setPayDate(localISO()); setPayCuenta(d?.cuenta ?? ''); setExtra(''); setShowAll(false)
  }, [open, existing])

  const today = localISO()

  function handleSave() {
    const P = parseEuroInput(principal)
    const B = balance.trim() ? parseEuroInput(balance) : P
    const n = Math.round(parseEuroInput(months))
    const day = Math.min(31, Math.max(1, parseInt(paymentDay, 10) || 1))
    const r = rate.trim() ? parseEuroInput(rate) : 0
    const e = euribor.trim() ? parseEuroInput(euribor) : 0
    const s = spread.trim() ? parseEuroInput(spread) : 0
    if (!name.trim()) { toast.show('Pon un nombre'); return }
    if (!(P > 0) || !(B >= 0)) { toast.show('Revisa importe original y pendiente'); return }
    if (!(n > 0)) { toast.show('Plazo en meses inválido'); return }
    if ([r, e, s].some(x => Number.isNaN(x) || x < 0)) { toast.show('Revisa los tipos de interés'); return }
    const d: Debt = {
      id: existing?.id ?? newId(),
      name: name.trim(),
      kind,
      principal: roundEuros(P),
      balance: roundEuros(B),
      annualRate: r / 100,
      rateType,
      ...(rateType === 'variable' ? { euribor: e / 100, spread: s / 100 } : {}),
      termMonths: n,
      startDate,
      paymentDay: day,
      ...(cuenta ? { cuenta } : {}),
      ...(propertyId ? { propertyId } : {}),
      ...(includeInNw ? {} : { includeInNw: false }),
      payments: existing?.payments ?? [],
    }
    saveDebt(d)
    toast.show(`✓ ${d.name} guardada`)
    if (existing) setEditing(false)
    else onClose()
  }

  const split = existing ? nextPaymentSplit(existing, payDate) : null
  const rateEff = existing ? effectiveRate(existing) : 0
  const remaining = existing ? remainingMonths(existing, today) : 0
  const rows = existing ? schedule(existing.balance, rateEff, remaining, today, existing.paymentDay) : []
  const extraAmount = parseEuroInput(extra)
  const sim = existing && extraAmount > 0 ? simulateExtra(existing, extraAmount, extraMode, today) : null
  const amortizedPct = existing && existing.principal > 0 ? Math.max(0, Math.min(100, (1 - existing.balance / existing.principal) * 100)) : 0

  const cuentaOptions = cuentas.map(c => <option key={c.name} value={c.name}>{c.name}</option>)

  return (
    <>
      <Modal open={open} onClose={onClose} title={existing ? `${DEBT_KIND[existing.kind].icon} ${existing.name}` : 'Nueva deuda'}>
        <div style={{ padding: '0 20px 8px' }}>
          {existing && !editing && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, ...box, marginTop: 0 }}>
                <div><div style={{ ...statVal, color: 'var(--color-red)' }}>{fmt(existing.balance)}</div><div style={stat}>Pendiente</div></div>
                <div><div style={statVal}>{amortizedPct.toFixed(1)}%</div><div style={stat}>Amortizado</div></div>
                <div><div style={statVal}>{(rateEff * 100).toFixed(2).replace('.', ',')}%</div><div style={stat}>TIN {existing.rateType === 'variable' ? 'variable' : 'fijo'}</div></div>
                <div><div style={statVal}>{remaining}</div><div style={stat}>Meses restantes</div></div>
                <div><div style={statVal}>{fmt(existing.principal)}</div><div style={stat}>Importe original</div></div>
                <div><div style={statVal}>{split ? fmt(split.total) : '—'}</div><div style={stat}>Próxima cuota</div></div>
              </div>

              {split && split.total > 0 && (
                <div style={box}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Pagar cuota</div>
                  <div style={{ fontSize: 12, color: 'var(--color-sub)', marginTop: 4 }}>
                    {fmt(split.interest)} de intereses (gasto) · {fmt(split.principal)} de capital (baja la deuda, no es gasto)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div><div style={label}>Fecha</div><input className="inp" type="date" value={payDate} onChange={e => setPayDate(e.target.value)} style={{ fontSize: 13 }} /></div>
                    <div><div style={label}>Cuenta</div><select className="inp" value={payCuenta} onChange={e => setPayCuenta(e.target.value)}><option value="">Ninguna</option>{cuentaOptions}</select></div>
                  </div>
                  <button className="btn-primary" style={{ background: 'var(--color-acc-blue)', width: '100%', marginTop: 8 }}
                    onClick={() => { payDebt(existing.id, { date: payDate, cuenta: payCuenta || undefined }); toast.show(`✓ Cuota pagada: ${fmt(split.interest)} intereses · ${fmt(split.principal)} capital`) }}>
                    Pagar {fmt(split.total)}
                  </button>
                </div>
              )}

              {existing.balance > 0 && (
                <div style={box}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Amortización anticipada</div>
                  <div style={label}>Importe (€)</div>
                  <input className="inp" value={extra} onChange={e => setExtra(e.target.value)} inputMode="decimal" placeholder="5.000" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
                    {(['reduce_term', 'reduce_payment'] as const).map(m => (
                      <button key={m} type="button" onClick={() => setExtraMode(m)}
                        style={{ padding: 8, borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                          background: extraMode === m ? 'rgba(91,138,240,0.12)' : 'var(--color-s1)',
                          color: extraMode === m ? 'var(--color-acc-blue)' : 'var(--color-sub)',
                          borderColor: extraMode === m ? 'rgba(91,138,240,0.3)' : 'var(--color-border)' }}>
                        {m === 'reduce_term' ? 'Reducir plazo' : 'Reducir cuota'}
                      </button>
                    ))}
                  </div>
                  {sim && (
                    <div style={{ fontSize: 12, color: 'var(--color-sub)', marginTop: 8, lineHeight: 1.5 }}>
                      Ahorras <strong style={{ color: 'var(--color-acc-green)' }}>{fmt(sim.interestSaved)}</strong> en intereses
                      {extraMode === 'reduce_term'
                        ? <> y terminas <strong>{sim.monthsSaved} meses</strong> antes (cuota {fmt(sim.newPayment)}).</>
                        : <>; la cuota baja a <strong>{fmt(sim.newPayment)}</strong>.</>}
                    </div>
                  )}
                  <button className="btn-ghost" style={{ width: '100%', marginTop: 8 }} disabled={!(extraAmount > 0)}
                    onClick={() => { extraAmortization(existing.id, extraAmount, { date: today, cuenta: payCuenta || undefined, mode: extraMode }); setExtra(''); toast.show('✓ Amortización anticipada registrada') }}>
                    Amortizar {extraAmount > 0 ? fmt(Math.min(extraAmount, existing.balance)) : ''}
                  </button>
                </div>
              )}

              {rows.length > 0 && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-sub)', margin: '16px 0 6px' }}>Cuadro de amortización</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, color: 'var(--color-sub)' }}>
                      <thead>
                        <tr style={{ color: 'var(--color-dim)', textAlign: 'right' }}>
                          <th style={{ textAlign: 'left', padding: '4px 2px' }}>Fecha</th><th>Cuota</th><th>Intereses</th><th>Capital</th><th>Pendiente</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(showAll ? rows : rows.slice(0, 12)).map(r => (
                          <tr key={r.n} style={{ textAlign: 'right', borderTop: '1px solid var(--color-border)' }}>
                            <td style={{ textAlign: 'left', padding: '4px 2px' }}>{r.date}</td>
                            <td>{fmt(r.payment)}</td><td>{fmt(r.interest)}</td><td>{fmt(r.principal)}</td><td>{fmt(r.balance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rows.length > 12 && (
                    <button type="button" onClick={() => setShowAll(v => !v)} style={{ background: 'transparent', border: 'none', color: 'var(--color-acc-blue)', fontSize: 12, padding: '6px 0', cursor: 'pointer' }}>
                      {showAll ? 'Ver solo 12' : `Ver las ${rows.length} cuotas`}
                    </button>
                  )}
                </>
              )}

              {existing.payments.length > 0 && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-sub)', margin: '14px 0 6px' }}>Pagos</div>
                  {[...existing.payments].reverse().map(p => (
                    <div key={p.id} style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--color-sub)', padding: '4px 0', borderBottom: '1px solid var(--color-border)' }}>
                      <span style={{ color: 'var(--color-dim)' }}>{p.date}</span>
                      <span style={{ flex: 1 }}>{p.extra ? 'Amortización anticipada' : 'Cuota'}</span>
                      <span>{fmt(p.total)}</span>
                    </div>
                  ))}
                </>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
                <button className="btn-ghost" style={{ width: '100%' }} onClick={() => setEditing(true)}>Editar condiciones</button>
                <button className="btn-ghost" style={{ width: '100%', color: 'var(--color-red)' }} onClick={() => setConfirmDelete(true)}>Borrar</button>
              </div>
            </>
          )}

          {editing && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(Object.keys(DEBT_KIND) as DebtKind[]).map(k => (
                  <button key={k} type="button" onClick={() => setKind(k)}
                    style={{ padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                      background: kind === k ? 'rgba(91,138,240,0.12)' : 'var(--color-s2)',
                      color: kind === k ? 'var(--color-acc-blue)' : 'var(--color-sub)',
                      borderColor: kind === k ? 'rgba(91,138,240,0.3)' : 'var(--color-border)' }}>
                    {DEBT_KIND[k].icon} {DEBT_KIND[k].label}
                  </button>
                ))}
              </div>
              <div style={label}>Nombre</div>
              <input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder="Hipoteca piso" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><div style={label}>Importe original (€)</div><input className="inp" value={principal} onChange={e => setPrincipal(e.target.value)} inputMode="decimal" /></div>
                <div><div style={label}>Pendiente hoy (€)</div><input className="inp" value={balance} onChange={e => setBalance(e.target.value)} inputMode="decimal" placeholder="= original" /></div>
                <div><div style={label}>Plazo (meses)</div><input className="inp" value={months} onChange={e => setMonths(e.target.value)} inputMode="numeric" placeholder="360" /></div>
                <div><div style={label}>Día de pago</div><input className="inp" value={paymentDay} onChange={e => setPaymentDay(e.target.value)} inputMode="numeric" /></div>
                <div><div style={label}>Fecha de inicio</div><input className="inp" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ fontSize: 13 }} /></div>
                <div>
                  <div style={label}>Tipo</div>
                  <select className="inp" value={rateType} onChange={e => setRateType(e.target.value as 'fixed' | 'variable')}>
                    <option value="fixed">Fijo</option>
                    <option value="variable">Variable</option>
                  </select>
                </div>
              </div>
              {rateType === 'fixed' ? (
                <><div style={label}>TIN (%)</div><input className="inp" value={rate} onChange={e => setRate(e.target.value)} inputMode="decimal" placeholder="3,25" /></>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><div style={label}>Euríbor actual (%)</div><input className="inp" value={euribor} onChange={e => setEuribor(e.target.value)} inputMode="decimal" placeholder="2,50" /></div>
                  <div><div style={label}>Diferencial (%)</div><input className="inp" value={spread} onChange={e => setSpread(e.target.value)} inputMode="decimal" placeholder="0,99" /></div>
                </div>
              )}
              <div style={label}>Cuenta desde la que se paga</div>
              <select className="inp" value={cuenta} onChange={e => setCuenta(e.target.value)}><option value="">Ninguna</option>{cuentaOptions}</select>
              {properties.length > 0 && (
                <>
                  <div style={label}>Inmueble ligado</div>
                  <select className="inp" value={propertyId} onChange={e => setPropertyId(e.target.value)}>
                    <option value="">Ninguno</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </>
              )}
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--color-sub)', marginTop: 10 }}>
                <input type="checkbox" checked={includeInNw} onChange={e => setIncludeInNw(e.target.checked)} /> Contar en el patrimonio neto
              </label>
              <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 6 }}>
                Si ya la tienes como cuenta de tipo Préstamo/Hipoteca en Cuentas, bórrala allí: contaría dos veces.
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
        title="Borrar deuda"
        message={existing ? `Se borra «${existing.name}» y su historial de pagos. Los movimientos de cuenta que generó se mantienen.` : ''}
        confirmLabel="Borrar"
        danger
        onConfirm={() => { if (existing) { removeDebt(existing.id); toast.show('Deuda borrada'); onClose() } }}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  )
}
