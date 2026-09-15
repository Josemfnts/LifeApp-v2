import { useState } from 'react'
import { useFinanceStore, CUENTA_TYPE, fmt, fmtShort } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import { localISO } from '@/lib/finance/dates'
import { NotesFor } from '@/components/notes/NotesFor'
import { TransferSheet } from './TransferSheet'
import { AdjustSheet } from './AdjustSheet'
import { InvestmentsSection } from './investments/InvestmentsSection'

export function PatrimonioTab() {
  const { cuentas, huchas, pufos, saveCuenta, removeCuenta, addHucha, aportarHucha, removeHucha, addPufo, settlePufo, removePufo } = useFinanceStore()
  const toast = useToast()
  const [sub, setSub] = useState<'cuentas' | 'inversiones' | 'huchas' | 'pufos'>('cuentas')
  const [cuentaModal, setCuentaModal] = useState(false)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [cName, setCName] = useState('')
  const [cType, setCType] = useState('bank')
  const [cBal, setCBal] = useState('')
  const [cColor, setCColor] = useState('var(--color-acc-blue)')
  const [cNote, setCNote] = useState('')

  const [settleModal, setSettleModal] = useState(false)
  const [settleIdx, setSettleIdx] = useState(-1)
  const [settleTarget, setSettleTarget] = useState('none')
  const [transferOpen, setTransferOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustCuenta, setAdjustCuenta] = useState('')

  const assets = cuentas.reduce((s, cu) => CUENTA_TYPE[cu.type]?.asset ? s + cu.balance : s, 0)
  const liabilities = cuentas.reduce((s, cu) => !CUENTA_TYPE[cu.type]?.asset ? s + Math.abs(cu.balance) : s, 0)
  const net = assets - liabilities

  function openForm(idx?: number) {
    if (idx != null) {
      const cu = cuentas[idx]
      setCName(cu.name); setCType(cu.type); setCBal(String(cu.balance)); setCColor(cu.color || 'var(--color-acc-blue)'); setCNote(cu.note || '')
      setEditIdx(idx)
    } else {
      setCName(''); setCType('bank'); setCBal(''); setCColor('var(--color-acc-blue)'); setCNote('')
      setEditIdx(null)
    }
    setCuentaModal(true)
  }

  function handleSave() {
    if (!cName.trim()) { toast.show('Escribe un nombre para la cuenta'); return }
    saveCuenta({ name: cName.trim(), type: cType, balance: parseFloat(cBal) || 0, color: cColor, note: cNote.trim(), updatedAt: localISO() }, editIdx)
    setCuentaModal(false)
    toast.show('✓ ' + cName.trim() + ' guardada')
  }

  const activePufos = pufos.filter(p => !p.settled)
  const meDeben = activePufos.filter(p => p.dir === 'me_debe').reduce((s, p) => s + p.amount, 0)
  const lesDebo = activePufos.filter(p => p.dir === 'le_debo').reduce((s, p) => s + p.amount, 0)
  const [pufoDir, setPufoDir] = useState<'me_debe' | 'le_debo'>('me_debe')
  const [pWho, setPWho] = useState('')
  const [pAmt, setPAmt] = useState('')
  const [pReason, setPReason] = useState('')
  const [hName, setHName] = useState('')
  const [hGoal, setHGoal] = useState('')
  const [hCurr, setHCurr] = useState('')
  const [hDeadline, setHDeadline] = useState('')
  const [hColor, setHColor] = useState('var(--color-acc-gold)')
  const [hEmoji, setHEmoji] = useState('🎯')

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 8, paddingBottom: 4 }}>
        {([
          { k: 'cuentas' as const, l: '🏦 Cuentas', c: 'var(--color-acc-gold)' },
          { k: 'inversiones' as const, l: '📈 Inversiones', c: 'var(--color-acc-blue)' },
          { k: 'huchas' as const, l: '🎯 Huchas', c: 'var(--color-acc-green)' },
          { k: 'pufos' as const, l: '💸 Pufos', c: 'var(--color-red)' },
        ]).map(s => (
          <button key={s.k} onClick={() => setSub(s.k)}
            style={{ flex: '0 0 auto', whiteSpace: 'nowrap', padding: '10px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700,
              fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid',
              background: sub === s.k ? s.c + '26' : 'transparent',
              color: sub === s.k ? s.c : 'var(--color-dim)',
              borderColor: sub === s.k ? s.c + '4d' : 'var(--color-border)' }}>{s.l}</button>
        ))}
      </div>

      {sub === 'cuentas' && (
        <>
          <div style={{ background: 'linear-gradient(145deg,#191c22,#1a1f2c)', border: '1px solid rgba(91,138,240,0.2)', borderRadius: 20, padding: 20, marginBottom: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Patrimonio neto</div>
            <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 44, lineHeight: 1, color: net >= 0 ? 'var(--color-acc-blue)' : 'var(--color-red)' }}>{fmt(net)}</div>
            <div style={{ fontSize: 12, color: 'var(--color-sub)', marginTop: 6 }}>{cuentas.length} cuenta{cuentas.length !== 1 ? 's' : ''}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 14 }}>
              <div><div style={{ fontSize: 12, color: 'var(--color-acc-green)', fontWeight: 700 }}>{fmtShort(assets)}</div><div style={{ fontSize: 10, color: 'var(--color-dim)', marginTop: 2 }}>Activos</div></div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.07)' }} />
              <div><div style={{ fontSize: 12, color: 'var(--color-red)', fontWeight: 700 }}>{fmtShort(liabilities)}</div><div style={{ fontSize: 10, color: 'var(--color-dim)', marginTop: 2 }}>Pasivos</div></div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Mis cuentas</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {cuentas.length >= 2 && (
                <button onClick={() => setTransferOpen(true)}
                  style={{ background: 'rgba(91,138,240,0.08)', color: 'var(--color-acc-blue)', border: '1px solid rgba(91,138,240,0.18)', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>🔁 Traspaso</button>
              )}
              <button onClick={() => openForm()}
                style={{ background: 'rgba(91,138,240,0.1)', color: 'var(--color-acc-blue)', border: '1px solid rgba(91,138,240,0.2)', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>+ Añadir</button>
            </div>
          </div>
          {cuentas.length === 0 ? (
            <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 28, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🏦</div>
              <div style={{ fontSize: 14, color: 'var(--color-sub)' }}>Sin cuentas todavía</div>
            </div>
          ) : (
            <>
              {[false, true].map(isLiab => {
                const items = cuentas.map((cu, i) => ({ cu, i })).filter(({ cu }) => (CUENTA_TYPE[cu.type]?.asset ?? true) === !isLiab)
                if (!items.length) return null
                return (
                  <div key={isLiab ? 'liab' : 'asset'} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: isLiab ? 'var(--color-red)' : 'var(--color-acc-green)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
                      {isLiab ? 'Pasivos' : 'Activos'}
                    </div>
                    <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
                      {items.map(({ cu, i }) => {
                        const meta = CUENTA_TYPE[cu.type] || { icon: '💰', label: 'Cuenta' }
                        return (
                          <div key={i} style={{ padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: cu.color + '18', border: '1px solid ' + cu.color + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{meta.icon}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 1 }}>{cu.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--color-dim)' }}>{meta.label}{cu.note ? ' · ' + cu.note : ''}</div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 18, color: isLiab ? 'var(--color-red)' : 'var(--color-text)', lineHeight: 1 }}>{fmtShort(cu.balance)}</div>
                              <div style={{ fontSize: 10, color: 'var(--color-dim)', marginTop: 2 }}>actualizado {cu.updatedAt || '—'}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                              <button onClick={() => { setAdjustCuenta(cu.name); setAdjustOpen(true) }}
                                title="Ajustar saldo"
                                style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(201,168,76,0.08)', color: 'var(--color-acc-gold)', border: '1px solid rgba(201,168,76,0.18)', cursor: 'pointer', fontSize: 13 }}>⚖️</button>
                              <button onClick={() => openForm(i)} style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(91,138,240,0.08)', color: 'var(--color-acc-blue)', border: '1px solid rgba(91,138,240,0.15)', cursor: 'pointer', fontSize: 12 }}>✎</button>
                              <button onClick={() => { removeCuenta(i); toast.show('Cuenta eliminada') }} style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(224,95,95,0.06)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.12)', cursor: 'pointer', fontSize: 11 }}>✕</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {cuentaModal && (
            <div onClick={e => { if (e.target === e.currentTarget) setCuentaModal(false) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
              <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 40px', maxHeight: '90dvh', overflowY: 'auto' }}>
                <div style={{ width: 36, height: 4, background: 'var(--color-border2)', borderRadius: 99, margin: '0 auto 16px' }} />
                <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 20, marginBottom: 16 }}>{editIdx != null ? 'Editar cuenta' : 'Nueva cuenta'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <input className="inp" value={cName} onChange={e => setCName(e.target.value)} type="text" placeholder="Nombre" />
                  <select className="inp" value={cType} onChange={e => setCType(e.target.value)}>
                    {Object.entries(CUENTA_TYPE).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <input className="inp" value={cBal} onChange={e => setCBal(e.target.value)} type="number" step="0.01" placeholder="Saldo actual (€)" />
                  <input className="inp" value={cColor} onChange={e => setCColor(e.target.value)} type="color" style={{ height: 44, cursor: 'pointer' }} />
                </div>
                {(cType === 'invest' || cType === 'pension') && (
                  <div style={{ fontSize: 12, color: 'var(--color-acc-gold)', marginBottom: 8, lineHeight: 1.4 }}>
                    Si registras esta inversión en 📈 Inversiones, no la añadas también como cuenta: contaría dos veces.
                  </div>
                )}
                <input className="inp" value={cNote} onChange={e => setCNote(e.target.value)} type="text" placeholder="Nota opcional" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button onClick={() => setCuentaModal(false)} className="btn-ghost" style={{ width: '100%' }}>Cancelar</button>
                  <button onClick={handleSave} className="btn-primary" style={{ background: 'var(--color-acc-blue)', width: 'auto' }}>Guardar</button>
                </div>
              </div>
            </div>
          )}
          <NotesFor entityType="finance" entityId="patrimonio" defaultTitle="Notas financieras" />
        </>
      )}

      {sub === 'inversiones' && <InvestmentsSection />}

      {sub === 'huchas' && huchas.length > 0 && (
        <div style={{ background: 'linear-gradient(145deg,#191c22,#191f1e)', border: '1px solid rgba(82,183,136,0.2)', borderRadius: 16, padding: 16, marginBottom: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Ahorro total en huchas</div>
          <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 36, lineHeight: 1, color: 'var(--color-acc-green)' }}>
            {fmt(huchas.reduce((s, h) => s + h.current, 0))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-sub)', marginTop: 4 }}>
            de {fmt(huchas.reduce((s, h) => s + h.goal, 0))} objetivo total · {huchas.length} hucha{huchas.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {sub === 'huchas' && (
        <>
          {huchas.map((h, i) => {
            const pct = Math.min((h.current / h.goal) * 100, 100)
            const done = h.current >= h.goal
            const left = Math.max(h.goal - h.current, 0)
            return (
              <div key={i} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 10, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 12, right: '50%', height: 2, borderRadius: '0 0 2px 2px', background: h.color || 'var(--color-acc-gold)' }} />
                {done && <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, color: 'var(--color-acc-green)', background: 'rgba(82,183,136,0.1)', border: '1px solid rgba(82,183,136,0.2)', borderRadius: 6, padding: '2px 10px', marginBottom: 8 }}>Meta alcanzada ✓</div>}
                <button onClick={() => { removeHucha(i); toast.show('Hucha eliminada') }} style={{ position: 'absolute', top: 14, right: 16, background: 'transparent', border: 'none', color: 'var(--color-dim)', fontSize: 16, cursor: 'pointer', padding: 4 }}>×</button>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, background: (h.color || 'var(--color-acc-gold)') + '18', border: '1px solid ' + (h.color || 'var(--color-acc-gold)') + '30' }}>{h.emoji || '🎯'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 19, color: 'var(--color-text)', lineHeight: 1.2, marginBottom: 3 }}>{h.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-dim)' }}>
                      {h.deadline ? `Límite: ${new Date(h.deadline + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Sin fecha límite'}
                      {(() => {
                        if (!h.deadline || done) return ''
                        const daysLeft = Math.ceil((new Date(h.deadline).getTime() - Date.now()) / 86400000)
                        if (daysLeft <= 0) return ' · ¡Vencido!'
                        const perMonth = left / (daysLeft / 30)
                        return ` · ${fmt(perMonth)}/mes para llegar`
                      })()}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-sub)', marginBottom: 7 }}>
                  <div><span style={{ fontFamily: 'DM Serif Display,serif', fontSize: 18, color: h.color || 'var(--color-acc-gold)' }}>{fmt(h.current)}</span><span style={{ fontSize: 12, color: 'var(--color-dim)' }}> ahorrados</span></div>
                  <div style={{ textAlign: 'right' }}><span style={{ fontSize: 13, color: 'var(--color-dim)' }}>Meta: </span><strong style={{ fontSize: 14, color: 'var(--color-text)' }}>{fmt(h.goal)}</strong></div>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ height: '100%', borderRadius: 99, transition: 'width 0.6s ease', width: `${pct}%`, background: h.color || 'var(--color-acc-gold)' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-dim)', textAlign: 'right', marginBottom: 12, marginTop: -8 }}>{pct.toFixed(1)}% · Faltan {fmt(left)}</div>
                {!done && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="inp" id={`ha-${i}`} type="number" placeholder="Añadir importe €" style={{ flex: 1, background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 10, padding: '9px 12px', fontSize: 13, fontFamily: 'DM Sans,sans-serif' }} />
                    <button onClick={() => {
                      const el = document.getElementById(`ha-${i}`) as HTMLInputElement
                      const val = parseFloat(el?.value || '0')
                      if (!val || val <= 0) return
                      aportarHucha(i, val)
                      if (h.current + val >= h.goal) toast.show(`🎉 ¡Hucha "${h.name}" completada!`)
                      else toast.show(`✓ +${fmt(val)} aportados`)
                      el.value = ''
                    }}
                      style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', background: (h.color || 'var(--color-acc-gold)') + '18', color: h.color || 'var(--color-acc-gold)', border: '1px solid ' + (h.color || 'var(--color-acc-gold)') + '30' }}>Aportar</button>
                  </div>
                )}
              </div>
            )
          })}
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, marginTop: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Nueva hucha</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input className="inp" value={hName} onChange={e => setHName(e.target.value)} type="text" placeholder="Nombre" style={{ flex: 1, margin: 0 }} />
              <input className="inp" value={hEmoji} onChange={e => setHEmoji(e.target.value)} type="text" placeholder="🎯" maxLength={2} style={{ width: 56, textAlign: 'center', fontSize: 20, margin: 0 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input className="inp" value={hGoal} onChange={e => setHGoal(e.target.value)} type="number" placeholder="Objetivo €" style={{ flex: 1, margin: 0 }} />
              <input className="inp" value={hCurr} onChange={e => setHCurr(e.target.value)} type="number" placeholder="Tengo ya €" style={{ flex: 1, margin: 0 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input className="inp" value={hDeadline} onChange={e => setHDeadline(e.target.value)} type="date" style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 13 }} />
              <select className="inp" value={hColor} onChange={e => setHColor(e.target.value)} style={{ flex: 1, minWidth: 0, margin: 0 }}>
                <option value="var(--color-acc-gold)">🟡 Dorado</option>
                <option value="var(--color-acc-green)">🟢 Verde</option>
                <option value="var(--color-acc-blue)">🔵 Azul</option>
                <option value="var(--color-acc-purple)">🟣 Morado</option>
              </select>
            </div>
            <button onClick={() => {
              const g = parseFloat(hGoal)
              if (!hName.trim() || !g || g <= 0) { toast.show('Introduce nombre y objetivo'); return }
              addHucha({ name: hName.trim(), goal: g, current: parseFloat(hCurr) || 0, emoji: hEmoji.trim() || '🎯', deadline: hDeadline, color: hColor })
              setHName(''); setHGoal(''); setHCurr(''); setHEmoji(''); setHDeadline('')
              toast.show(`✓ Hucha "${hName}" creada`)
            }}
              style={{ width: '100%', padding: 12, borderRadius: 12, background: 'var(--color-acc-blue)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>Crear hucha</button>
          </div>
        </>
      )}

      {sub === 'pufos' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--color-dim)', marginBottom: 4 }}>Me deben</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-acc-green)' }}>{fmt(meDeben)}</div>
            </div>
            <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--color-dim)', marginBottom: 4 }}>Les debo</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-red)' }}>{fmt(lesDebo)}</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            {activePufos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, fontSize: 13, color: 'var(--color-dim)' }}>Sin pufos activos.</div>
            ) : activePufos.map((p) => {
              const realIdx = pufos.indexOf(p)
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: 24 }}>{p.dir === 'me_debe' ? '💰' : '📤'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{p.who}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-dim)' }}>{p.reason || ''}</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: p.dir === 'me_debe' ? 'var(--color-acc-green)' : 'var(--color-red)' }}>{fmt(p.amount)}</div>
                  <button onClick={() => { setSettleIdx(realIdx); setSettleTarget('none'); setSettleModal(true) }}
                    style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(82,183,136,0.1)', color: 'var(--color-acc-green)', border: '1px solid rgba(82,183,136,0.2)', fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>Saldar</button>
                  <button onClick={() => { removePufo(realIdx); toast.show('Pufo eliminado') }}
                    style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(224,95,95,0.06)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.12)', cursor: 'pointer', fontSize: 11 }}>✕</button>
                </div>
              )
            })}
          </div>

          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Nuevo pufo</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <button onClick={() => setPufoDir('me_debe')}
                style={{ padding: 10, borderRadius: 10, fontFamily: 'DM Sans,sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                  background: pufoDir === 'me_debe' ? 'rgba(82,183,136,0.12)' : 'transparent',
                  color: pufoDir === 'me_debe' ? 'var(--color-acc-green)' : 'var(--color-dim)',
                  borderColor: pufoDir === 'me_debe' ? 'rgba(82,183,136,0.2)' : 'var(--color-border)' }}>Me deben</button>
              <button onClick={() => setPufoDir('le_debo')}
                style={{ padding: 10, borderRadius: 10, fontFamily: 'DM Sans,sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                  background: pufoDir === 'le_debo' ? 'rgba(224,95,95,0.1)' : 'transparent',
                  color: pufoDir === 'le_debo' ? 'var(--color-red)' : 'var(--color-dim)',
                  borderColor: pufoDir === 'le_debo' ? 'rgba(224,95,95,0.25)' : 'var(--color-border)' }}>Les debo</button>
            </div>
            <input className="inp" value={pWho} onChange={e => setPWho(e.target.value)} type="text" placeholder="¿Quién?" />
            <input className="inp" value={pAmt} onChange={e => setPAmt(e.target.value)} type="number" step="0.01" placeholder="Importe €" />
            <input className="inp" value={pReason} onChange={e => setPReason(e.target.value)} type="text" placeholder="Motivo (opcional)" />
            <button onClick={() => {
              const a = parseFloat(pAmt)
              if (!pWho.trim() || !a || a <= 0) { toast.show('Introduce persona e importe'); return }
              addPufo({ id: Date.now(), who: pWho.trim(), person: pWho.trim(), amount: a, dir: pufoDir, reason: pReason.trim(), concept: pReason.trim(), date: localISO(), settled: false })
              toast.show('✓ Pufo registrado')
              setPWho(''); setPAmt(''); setPReason('')
            }}
              style={{ width: '100%', padding: 12, borderRadius: 12, background: 'var(--color-acc-blue)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', marginTop: 4 }}>Añadir pufo</button>
          </div>
        </>
      )}

      {settleModal && settleIdx >= 0 && (
        <div onClick={e => { if (e.target === e.currentTarget) setSettleModal(false) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 40px', maxHeight: '90dvh', overflowY: 'auto' }}>
            <div style={{ width: 36, height: 4, background: 'var(--color-border2)', borderRadius: 99, margin: '0 auto 16px' }} />
            <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 20, marginBottom: 12 }}>Saldar pufo</div>
            <p style={{ fontSize: 13, color: 'var(--color-sub)', marginBottom: 16 }}>
              {(() => {
                const p = pufos[settleIdx]
                if (!p) return ''
                return `${p.dir === 'me_debe' ? p.person + ' te debe' : 'Debes a ' + p.person} ${fmt(p.amount)}${p.concept ? ' · ' + p.concept : ''}`
              })()}
            </p>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 6 }}>Mover dinero a hucha</div>
              <select className="inp" value={settleTarget} onChange={e => setSettleTarget(e.target.value)}>
                <option value="none">No mover — solo marcar como saldado</option>
                {huchas.map((h, i) => {
                  const dirLabel = pufos[settleIdx]?.dir === 'me_debe' ? 'Añadir a' : 'Restar de'
                  return <option key={i} value={i}>{dirLabel} "{h.name}" ({fmt(h.current)})</option>
                })}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={() => setSettleModal(false)} className="btn-ghost" style={{ width: '100%' }}>Cancelar</button>
              <button onClick={() => {
                const p = pufos[settleIdx]
                if (!p) return
                if (settleTarget !== 'none') {
                  const hIdx = parseInt(settleTarget)
                  if (!isNaN(hIdx) && huchas[hIdx]) {
                    if (p.dir === 'me_debe') {
                      aportarHucha(hIdx, p.amount)
                    } else {
                      aportarHucha(hIdx, -p.amount)
                    }
                  }
                }
                settlePufo(settleIdx)
                setSettleModal(false)
                toast.show('✓ Pufo saldado' + (settleTarget !== 'none' ? ' y dinero movido' : ''))
              }}
                className="btn-primary" style={{ background: 'var(--color-acc-green)', width: 'auto' }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
      <TransferSheet open={transferOpen} onClose={() => setTransferOpen(false)} />
      <AdjustSheet open={adjustOpen} onClose={() => setAdjustOpen(false)} cuentaName={adjustCuenta} />
    </div>
  )
}
