import { useState } from 'react'
import { Input } from '@/components/ui'
import { useFinanceStore } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'

export default function Finanzas() {
  const [tab, setTab] = useState<'balance' | 'huchas' | 'pufos'>('balance')
  const txs = useFinanceStore(s => s.txs)
  const addTx = useFinanceStore(s => s.addTx)
  const removeTx = useFinanceStore(s => s.removeTx)
  const huchas = useFinanceStore(s => s.huchas)
  const addHucha = useFinanceStore(s => s.addHucha)
  const updateHucha = useFinanceStore(s => s.updateHucha)
  const removeHucha = useFinanceStore(s => s.removeHucha)
  const pufos = useFinanceStore(s => s.pufos)
  const addPufo = useFinanceStore(s => s.addPufo)
  const updatePufo = useFinanceStore(s => s.updatePufo)
  const removePufo = useFinanceStore(s => s.removePufo)
  const toast = useToast()

  const [amount, setAmount] = useState('')
  const [txType, setTxType] = useState<'income' | 'expense'>('expense')
  const [category, setCategory] = useState('Otros')
  const [desc, setDesc] = useState('')
  const [huchaName, setHuchaName] = useState('')
  const [huchaTarget, setHuchaTarget] = useState('')
  const [huchaColor, setHuchaColor] = useState('#c9a84c')
  const [pufoName, setPufoName] = useState('')
  const [pufoTotal, setPufoTotal] = useState('')
  const [pufoCreditor, setPufoCreditor] = useState('')

  const today = new Date().toISOString().slice(0, 10)
  const balance = txs.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0)
  const totalIngresos = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalGastos = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const COLORS = ['#c9a84c', '#5b8af0', '#52b788', '#e07a5f', '#9b7fe0', '#e05f5f']
  const CATEGORIES = ['Supermercado', 'Restaurante', 'Transporte', 'Ocio', 'Salud', 'Hogar', 'Suscripciones', 'Ropa', 'Educación', 'Inversión', 'Nómina', 'Regalo', 'Otros']

  function handleAddTx() {
    const a = parseFloat(amount)
    if (!a) return
    addTx({ date: today, amount: a, type: txType, category, description: desc.trim() })
    toast.show(`✓ ${txType === 'income' ? 'Ingreso' : 'Gasto'} de ${a}€ registrado`)
    setAmount(''); setDesc('')
  }

  function handleAddHucha() {
    const t = parseFloat(huchaTarget)
    if (!t || !huchaName.trim()) return
    addHucha({ name: huchaName.trim(), target: t, current: 0, color: huchaColor })
    toast.show('✓ Hucha creada')
    setHuchaName(''); setHuchaTarget('')
  }

  function handleAddPufo() {
    const t = parseFloat(pufoTotal)
    if (!t || !pufoName.trim()) return
    addPufo({ name: pufoName.trim(), total: t, paid: 0, creditor: pufoCreditor.trim() })
    toast.show('✓ Deuda registrada')
    setPufoName(''); setPufoTotal(''); setPufoCreditor('')
  }

  if (tab === 'balance') {
    return (
      <div className="animate-tab p-4">
        <div className="bg-gradient-to-br from-[#191c22] to-[#1c1d16] border border-[var(--color-border)] rounded-2xl p-5 mb-3">
          <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-1">Balance</div>
          <div className="font-serif text-[40px] leading-none" style={{ color: balance >= 0 ? '#52b788' : '#e05f5f' }}>
            {balance >= 0 ? '+' : ''}{balance.toFixed(2)}€
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <span className="text-[#52b788]">+{totalIngresos.toFixed(0)}€</span>
            <span className="text-[var(--color-red)]">-{totalGastos.toFixed(0)}€</span>
          </div>
        </div>

        {txs.length > 0 && (
          <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mb-3">
            <div className="text-[12px] font-semibold text-[var(--color-sub)] tracking-wide mb-3">Últimos 14 días</div>
            <div className="flex items-end gap-[2px] h-[60px]">
              {Array.from({ length: 14 }, (_, i) => {
                const d = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10)
                const dayTxs = txs.filter(t => t.date === d)
                const inc = dayTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
                const exp = dayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
                const maxVal = Math.max(inc, exp, 1)
                const maxAll = Math.max(1, ...Array.from({ length: 14 }, (_, j) => {
                  const d2 = new Date(Date.now() - (13 - j) * 86400000).toISOString().slice(0, 10)
                  const ts = txs.filter(t => t.date === d2)
                  return Math.max(
                    ts.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
                    ts.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
                  )
                }))
                return (
                  <div key={i} className="flex-1 flex items-end gap-[1px]" title={d}>
                    {exp > 0 && <div className="flex-1 rounded-t-sm bg-[var(--color-red)] opacity-80" style={{ height: `${Math.max(2, (exp / maxAll) * 56)}px` }} />}
                    {inc > 0 && <div className="flex-1 rounded-t-sm bg-[#52b788] opacity-80" style={{ height: `${Math.max(2, (inc / maxAll) * 56)}px` }} />}
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-1 text-[9px] text-[var(--color-dim)]">
              <span>🟢 Ingresos</span>
              <span>🔴 Gastos</span>
            </div>
          </div>
        )}

        <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mb-3">
          <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-3">Nuevo movimiento</div>
          <div className="flex gap-2 mb-2">
            <button onClick={() => setTxType('expense')}
              className={`flex-1 py-2 rounded-xl text-[13px] font-bold font-sans cursor-pointer border transition-all ${
                txType === 'expense' ? 'bg-red-500/[0.1] text-[var(--color-red)] border-red-500/[0.2]' : 'bg-[var(--color-s2)] text-[var(--color-dim)] border-[var(--color-border)]'
              }`}>Gasto</button>
            <button onClick={() => setTxType('income')}
              className={`flex-1 py-2 rounded-xl text-[13px] font-bold font-sans cursor-pointer border transition-all ${
                txType === 'income' ? 'bg-[#52b788]/[0.1] text-[#52b788] border-[#52b788]/[0.2]' : 'bg-[var(--color-s2)] text-[var(--color-dim)] border-[var(--color-border)]'
              }`}>Ingreso</button>
          </div>
          <Input value={amount} onChange={setAmount} type="number" step="0.01" placeholder="Cantidad (€)" className="mb-2" />
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="w-full bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3.5 py-2.5 text-sm font-sans mb-2 outline-none cursor-pointer">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <Input value={desc} onChange={setDesc} placeholder="Descripción (opcional)" className="mb-2" />
          <button onClick={handleAddTx} className="w-full py-2.5 rounded-xl bg-[#c9a84c] text-[#111] text-sm font-bold font-sans cursor-pointer shadow-lg shadow-[#c9a84c]/25">Registrar</button>
        </div>

        <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2.5">Últimos movimientos</div>
        {txs.length === 0 ? (
          <div className="text-center py-8 text-[13px] text-[var(--color-dim)]">Sin movimientos registrados.</div>
        ) : (
          txs.slice(0, 20).map((tx, i) => (
            <div key={i} className="flex items-center gap-3 px-3.5 py-3 bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl mb-2">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[var(--color-text)]">{tx.description || tx.category}</div>
                <div className="text-[11px] text-[var(--color-dim)] mt-0.5">{tx.date} · {tx.category}</div>
              </div>
              <div className={`font-serif text-base italic ${tx.type === 'income' ? 'text-[#52b788]' : 'text-[var(--color-red)]'}`}>
                {tx.type === 'income' ? '+' : '-'}{tx.amount.toFixed(2)}€
              </div>
              <button onClick={() => removeTx(i)} className="w-6 h-6 rounded-lg bg-red-500/[0.08] text-[var(--color-red)] border border-red-500/[0.15] text-[11px] font-bold flex items-center justify-center cursor-pointer">✕</button>
            </div>
          ))
        )}
      </div>
    )
  }

  if (tab === 'huchas') {
    return (
      <div className="animate-tab p-4">
        <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mb-3">
          <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-3">Nueva hucha</div>
          <Input value={huchaName} onChange={setHuchaName} placeholder="Nombre (ej: Vacaciones)" className="mb-2" />
          <Input value={huchaTarget} onChange={setHuchaTarget} type="number" step="0.01" placeholder="Objetivo (€)" className="mb-2" />
          <div className="flex gap-1.5 mb-2.5">
            {COLORS.map(c => (
              <button key={c} onClick={() => setHuchaColor(c)}
                className={`w-7 h-7 rounded-full cursor-pointer border-2 transition-all ${huchaColor === c ? 'border-white' : 'border-transparent'}`}
                style={{ background: c }} />
            ))}
          </div>
          <button onClick={handleAddHucha} className="w-full py-2.5 rounded-xl bg-[#c9a84c] text-[#111] text-sm font-bold font-sans cursor-pointer shadow-lg shadow-[#c9a84c]/25">Crear hucha</button>
        </div>

        <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2.5">Mis huchas</div>
        {huchas.length === 0 ? (
          <div className="text-center py-12 text-[13px] text-[var(--color-dim)]">Sin huchas creadas.</div>
        ) : (
          huchas.map((h, i) => {
            const pct = Math.min(100, Math.round(h.current / h.target * 100))
            return (
              <div key={i} className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mb-2.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-[var(--color-text)]">{h.name}</div>
                  <div className="font-serif text-lg" style={{ color: h.color }}>{pct}%</div>
                </div>
                <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: h.color }} />
                </div>
                <div className="flex justify-between text-[11px] text-[var(--color-dim)]">
                  <span>{h.current.toFixed(0)}€ de {h.target.toFixed(0)}€</span>
                  <span>{h.target - h.current > 0 ? `${(h.target - h.current).toFixed(0)}€` : '✓'}</span>
                </div>
                <div className="flex gap-2 mt-2">
                  {[10, 50, 100].map(a => (
                    <button key={a} onClick={() => { updateHucha(h.name, a); toast.show(`+${a}€ a ${h.name}`) }}
                      className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold font-sans cursor-pointer border"
                      style={{ background: h.color + '18', color: h.color, borderColor: h.color + '33' }}>+{a}€</button>
                  ))}
                </div>
                <button onClick={() => removeHucha(i)} className="mt-2 text-[11px] text-[var(--color-dim)] cursor-pointer hover:text-red-400">Eliminar</button>
              </div>
            )
          })
        )}
      </div>
    )
  }

  if (tab === 'pufos') {
    return (
      <div className="animate-tab p-4">
        <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mb-3">
          <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-3">Registrar deuda</div>
          <Input value={pufoName} onChange={setPufoName} placeholder="Concepto (ej: Préstamo coche)" className="mb-2" />
          <Input value={pufoTotal} onChange={setPufoTotal} type="number" step="0.01" placeholder="Total (€)" className="mb-2" />
          <Input value={pufoCreditor} onChange={setPufoCreditor} placeholder="Acreedor (opcional)" className="mb-2" />
          <button onClick={handleAddPufo} className="w-full py-2.5 rounded-xl bg-[var(--color-red)]/10 text-[var(--color-red)] border border-red-500/[0.2] text-sm font-semibold font-sans cursor-pointer">Registrar deuda</button>
        </div>

        <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2.5">Deudas activas</div>
        {pufos.length === 0 ? (
          <div className="text-center py-12 text-[13px] text-[var(--color-dim)]">Sin deudas. ¡Bien!</div>
        ) : (
          pufos.map((p, i) => {
            const pct = Math.min(100, Math.round(p.paid / p.total * 100))
            return (
              <div key={i} className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mb-2.5">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-semibold text-[var(--color-text)]">{p.name}</div>
                  <div className="text-xs text-[var(--color-dim)]">{p.creditor}</div>
                </div>
                <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: pct === 100 ? '#52b788' : '#e07a5f' }} />
                </div>
                <div className="flex justify-between text-[11px] text-[var(--color-dim)]">
                  <span>{p.paid.toFixed(0)}€ pagados de {p.total.toFixed(0)}€</span>
                  <span className="font-bold text-[var(--color-red)]">{p.total - p.paid > 0 ? `${(p.total - p.paid).toFixed(0)}€` : '✓ Liquidado'}</span>
                </div>
                {p.total - p.paid > 0 && (
                  <div className="flex gap-2 mt-2">
                    {[20, 50, 100].map(a => (
                      <button key={a} onClick={() => { updatePufo(p.name, a); toast.show(`+${a}€ pagado a ${p.name}`) }}
                        className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold font-sans cursor-pointer border bg-[#52b788]/10 text-[#52b788] border-[#52b788]/20">Pagar {a}€</button>
                    ))}
                  </div>
                )}
                <button onClick={() => removePufo(i)} className="mt-2 text-[11px] text-[var(--color-dim)] cursor-pointer hover:text-red-400">Eliminar</button>
              </div>
            )
          })
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-module" style={{ color: 'var(--color-acc-gold)' }}>Finanzas</div>
        <div className="page-title">Finanzas</div>
        <div className="flex mt-0.5">
          {(['balance','huchas','pufos'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-[13px] font-medium text-center cursor-pointer border-b-2 transition-all bg-transparent font-sans ${
                tab === t ? 'text-[#c9a84c] border-[#c9a84c]' : 'text-[var(--color-dim)] border-transparent'
              }`}>{t === 'balance' ? 'Balance' : t === 'huchas' ? 'Huchas' : 'Deudas'}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
