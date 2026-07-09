import { useState, useRef, useEffect } from 'react'
import { useFinanceStore, CAT_META, CUENTA_TYPE, fmt, fmtShort } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import Chart from 'chart.js/auto'
import { NotesFor } from '@/components/notes/NotesFor'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTHS_SH = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function todayISO() { return new Date().toISOString().slice(0, 10) }
function monthKey(y: number, m: number) { return `${y}-${String(m + 1).padStart(2, '0')}` }

function exportCSV(txs: { date: string; concept: string; category: string; type: string; amount: number; note?: string }[], toast: { show: (m: string) => void }) {
  const headers = 'Fecha,Concepto,Categoría,Tipo,Importe,Nota'
  const rows = txs.map(t => `${t.date},"${t.concept}","${t.category}",${t.type},${t.amount},"${t.note || ''}"`)
  const csv = [headers, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `lifeos-finanzas-${todayISO()}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
  toast.show('✓ CSV exportado')
}

export default function Finanzas() {
  const [tab, setTab] = useState<'summary' | 'moves' | 'analysis' | 'patrimonio' | 'budgets'>('summary')
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

/* ── SUMMARY TAB ── */
function SummaryTab() {
  const { txs } = useFinanceStore()
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth())
  const donaRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  const txsMonth = txs.filter(t => t.date.startsWith(monthKey(viewYear, viewMonth)))
  const income = txsMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = txsMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = income - expense

  useEffect(() => {
    if (!donaRef.current) return
    if (chartRef.current) chartRef.current.destroy()
    const ctx = donaRef.current.getContext('2d')!

    const expTxs = txsMonth.filter(t => t.type === 'expense')
    const byCat: Record<string, number> = {}
    expTxs.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount })
    const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1])

    if (!cats.length) {
      chartRef.current = new Chart(ctx, {
        type: 'doughnut',
        data: { datasets: [{ data: [1], backgroundColor: ['rgba(255,255,255,0.05)'], borderWidth: 0 }] },
        options: { cutout: '72%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
      })
    } else {
      const colors = cats.map(([c]) => CAT_META[c]?.color || '#8a8d96')
      chartRef.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: cats.map(c => c[0]),
          datasets: [{
            data: cats.map(c => c[1]),
            backgroundColor: colors.map(c => c + 'cc'),
            borderColor: colors, borderWidth: 1.5,
          }]
        },
        options: {
          cutout: '72%', animation: { duration: 500 },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#191c22', borderColor: 'rgba(255,255,255,0.07)', borderWidth: 1,
              titleColor: '#e8e9ee', bodyColor: '#8a8d96',
              callbacks: { label: (c: { raw: unknown }) => `${fmt(c.raw as number)} (${Math.round((c.raw as number) / expense * 100)}%)` }
            }
          }
        }
      })
    }
  }, [txsMonth, expense])

  const topCats = Object.entries(
    txsMonth.filter(t => t.type === 'expense').reduce((acc: Record<string, number>, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount; return acc
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const showAlert = expense > income && income > 0
  const showWarn = income > 0 && expense / income > 0.85 && !showAlert

  const recent = txsMonth.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--color-s1)', border: '1px solid var(--color-border)',
        borderRadius: 14, padding: '10px 14px', marginBottom: 12 }}>
        <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) } else setViewMonth(m => m - 1) }}
          style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-sub)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>‹</button>
        <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 18, color: 'var(--color-text)' }}>{MONTHS[viewMonth]} {viewYear}</div>
        <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) } else setViewMonth(m => m + 1) }}
          style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-sub)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>›</button>
      </div>

      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 20, padding: '24px 20px 20px', marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>Balance del mes</div>
        <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 44, lineHeight: 1, marginBottom: 6, color: balance > 0 ? 'var(--color-acc-green)' : balance < 0 ? 'var(--color-red)' : 'var(--color-text)' }}>
          {balance >= 0 ? '+' : ''}{fmt(balance)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-sub)', marginBottom: 20 }}>{MONTHS[viewMonth]} {viewYear}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: 'var(--color-s2)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>Ingresos</div>
            <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 22, color: 'var(--color-acc-green)' }}>{fmt(income)}</div>
            <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 3 }}>{txsMonth.filter(t => t.type === 'income').length} movimientos</div>
          </div>
          <div style={{ background: 'var(--color-s2)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>Gastos</div>
            <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 22, color: 'var(--color-red)' }}>{fmt(expense)}</div>
            <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 3 }}>{txsMonth.filter(t => t.type === 'expense').length} movimientos</div>
          </div>
        </div>
      </div>

      {(showAlert || showWarn) && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(224,95,95,0.07)', border: '1px solid rgba(224,95,95,0.2)', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠️</span>
          <span style={{ fontSize: 13, color: 'var(--color-sub)', lineHeight: 1.45 }}>
            {showAlert ? <>Estás gastando <strong style={{ color: 'var(--color-red)' }}>{fmt(expense - income)} más</strong> de lo que ingresas este mes.</>
              : <>Llevas gastado el <strong style={{ color: 'var(--color-red)' }}>{Math.round(expense / income * 100)}%</strong> de tus ingresos este mes.</>}
          </span>
        </div>
      )}

      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div className="sec-label" style={{ marginBottom: 12 }}>Gastos por categoría</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
            <canvas ref={donaRef} width={110} height={110} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 18, color: 'var(--color-text)', lineHeight: 1 }}>{fmtShort(expense)}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--color-dim)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>gastado</div>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {topCats.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--color-dim)' }}>Sin gastos registrados.</div>
            ) : topCats.map(([name, amt]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: CAT_META[name]?.color || '#8a8d96' }} />
                <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--color-sub)' }}>{name}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{Math.round(amt / expense * 100)}%</span>
                <span style={{ fontSize: 11, color: 'var(--color-dim)', minWidth: 52, textAlign: 'right' }}>{fmtShort(amt)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 10 }}>
        {recent.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'var(--color-dim)' }}>Sin movimientos este mes.</div>
        ) : recent.map((t, i) => (
          <TxRow key={i} tx={t} />
        ))}
      </div>
    </div>
  )
}

/* ── MOVES TAB ── */
function MovesTab() {
  const { txs, addTx } = useFinanceStore()
  const toast = useToast()
  const [type, setType] = useState<'income' | 'expense'>('income')
  const [concept, setConcept] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Nómina')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [filter, setFilter] = useState('Todos')
  const [search, setSearch] = useState('')

  const incCats = ['Nómina','Freelance','Otros ingresos']
  const expCats = ['Vivienda','Alimentación','Transporte','Salud','Ocio','Ropa','Suscripciones','Deporte','Restaurantes','Viajes','Educación','Ahorro','Otros gastos']
  const cats = type === 'income' ? incCats : expCats

  function handleAdd() {
    const a = parseFloat(amount)
    if (!a || a <= 0) { toast.show('Introduce un importe'); return }
    addTx({ concept: concept.trim() || category, amount: a, category, date, note: note.trim(), type })
    toast.show(type === 'income' ? `✓ Ingreso de ${fmt(a)} añadido` : `✓ Gasto de ${fmt(a)} añadido`)
    setConcept(''); setAmount(''); setNote('')
  }

  const allCats = ['Todos', ...new Set(txs.map(t => t.category))]
  let filtered = txs.slice()
  if (filter !== 'Todos') filtered = filtered.filter(t => t.category === filter)
  if (search.trim()) filtered = filtered.filter(t =>
    t.concept.toLowerCase().includes(search.toLowerCase()) ||
    t.note.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  )
  filtered.sort((a, b) => b.date.localeCompare(a.date))

  const byDate: Record<string, typeof filtered> = {}
  filtered.forEach(t => { const d = t.date; if (!byDate[d]) byDate[d] = []; byDate[d].push(t) })

  return (
    <div>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
          <button onClick={() => { setType('income'); setCategory('Nómina') }}
            style={{ padding: 9, borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', textAlign: 'center', cursor: 'pointer', border: '1px solid',
              background: type === 'income' ? 'rgba(82,183,136,0.12)' : 'var(--color-s2)',
              color: type === 'income' ? 'var(--color-acc-green)' : 'var(--color-dim)',
              borderColor: type === 'income' ? 'rgba(82,183,136,0.3)' : 'var(--color-border)' }}>↑ Ingreso</button>
          <button onClick={() => { setType('expense'); setCategory('Alimentación') }}
            style={{ padding: 9, borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', textAlign: 'center', cursor: 'pointer', border: '1px solid',
              background: type === 'expense' ? 'rgba(224,95,95,0.1)' : 'var(--color-s2)',
              color: type === 'expense' ? 'var(--color-red)' : 'var(--color-dim)',
              borderColor: type === 'expense' ? 'rgba(224,95,95,0.25)' : 'var(--color-border)' }}>↓ Gasto</button>
        </div>
        <input className="inp" value={concept} onChange={e => setConcept(e.target.value)} type="text" placeholder="Concepto (ej: Nómina, Supermercado...)" />
        <input className="inp" value={amount} onChange={e => setAmount(e.target.value)} type="number" step="0.01" placeholder="Importe en €" />
        <select className="inp" value={category} onChange={e => setCategory(e.target.value)}>
          {cats.map(c => <option key={c} value={c}>{CAT_META[c]?.icon || '•'} {c}</option>)}
        </select>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <input className="inp" value={date} onChange={e => setDate(e.target.value)} type="date" style={{ marginBottom: 0, fontSize: 13 }} />
          <input className="inp" value={note} onChange={e => setNote(e.target.value)} type="text" placeholder="Nota..." style={{ marginBottom: 0 }} />
        </div>
        <button onClick={handleAdd} style={{ width: '100%', background: 'var(--color-acc-gold)', color: '#111', border: 'none', fontFamily: 'DM Sans,sans-serif', fontSize: 14, fontWeight: 700, padding: 11, borderRadius: 10, cursor: 'pointer', boxShadow: '0 2px 12px rgba(201,168,76,0.25)' }}>
          {type === 'income' ? 'Añadir ingreso' : 'Añadir gasto'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input className="inp" value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="🔍 Buscar movimientos..." style={{ marginBottom: 0 }} />
        <button onClick={() => exportCSV(txs, toast)} style={{ background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-sub)', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>📥 CSV</button>
      </div>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 2 }}>
        {allCats.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            style={{ flex: '0 0 auto', padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, border: '1px solid', whiteSpace: 'nowrap', cursor: 'pointer',
              background: filter === c ? 'rgba(201,168,76,0.1)' : 'var(--color-s1)',
              color: filter === c ? 'var(--color-acc-gold)' : 'var(--color-sub)',
              borderColor: filter === c ? 'rgba(201,168,76,0.3)' : 'var(--color-border)' }}>{c}</button>
        ))}
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'var(--color-dim)' }}>Sin movimientos{filter !== 'Todos' ? ' en esta categoría' : ''}.</div>
        ) : Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).map(([d, txList]) => {
          const dt = new Date(d + 'T12:00:00')
          return (
            <div key={d}>
              <div style={{ padding: '8px 16px 0', fontSize: 10, fontWeight: 700, color: 'var(--color-dim)', letterSpacing: '0.5px', textTransform: 'uppercase', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                {dt.getDate()} {MONTHS_SH[dt.getMonth()]}
              </div>
              {txList.map(t => <TxRow key={`${d}-${t.id}`} tx={t} />)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TxRow({ tx }: { tx: { id?: number; concept: string; category: string; amount: number; type: string; note: string } }) {
  const { removeTx, txs } = useFinanceStore()
  const idx = txs.findIndex(t => t.id === tx.id)
  const meta = CAT_META[tx.category] || { icon: '📤', color: '#8a8d96' }
  const sign = tx.type === 'income' ? '+' : '−'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0, background: meta.color + '18', border: '1px solid ' + meta.color + '30' }}>{meta.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.concept}</div>
        <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 2 }}>{tx.category}{tx.note ? ' · ' + tx.note : ''}</div>
      </div>
      <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 20, fontWeight: 400, flexShrink: 0, color: tx.type === 'income' ? 'var(--color-acc-green)' : 'var(--color-red)' }}>
        {sign}{fmt(tx.amount)}
      </div>
      {idx >= 0 && (
        <button onClick={() => removeTx(idx)}
          style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: 'rgba(224,95,95,0.08)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.15)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
      )}
    </div>
  )
}

/* ── ANALYSIS TAB ── */
function AnalysisTab() {
  const { txs } = useFinanceStore()
  const barRef = useRef<HTMLCanvasElement>(null)
  const rateRef = useRef<HTMLCanvasElement>(null)
  const chartRefs = useRef<{ bar: Chart | null; rate: Chart | null }>({ bar: null, rate: null })

  const totalIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalSaved = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? Math.round((totalSaved / totalIncome) * 100) : 0

  const now = new Date()
  const months6 = Array.from({ length: 6 }, (_, i) => {
    let y = now.getFullYear(), m = now.getMonth() - (5 - i)
    while (m < 0) { m += 12; y-- }
    const keyM = monthKey(y, m)
    const monthTxs = txs.filter(t => t.date.startsWith(keyM))
    return {
      label: MONTHS_SH[m],
      income: monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    }
  })

  const chartDefaults = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#191c22', borderColor: 'rgba(255,255,255,0.07)', borderWidth: 1, titleColor: '#e8e9ee', bodyColor: '#8a8d96' } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4a4d56', font: { size: 10 } } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4a4d56', font: { size: 10 } }, beginAtZero: true }
    }
  }

  useEffect(() => {
    if (!barRef.current || !rateRef.current) return
    const c = chartRefs.current
    if (c.bar) c.bar.destroy()
    if (c.rate) c.rate.destroy()

    c.bar = new Chart(barRef.current.getContext('2d')!, {
      type: 'bar',
      data: {
        labels: months6.map(m => m.label),
        datasets: [
          { label: 'Ingresos', data: months6.map(m => m.income), backgroundColor: 'rgba(82,183,136,0.2)', borderColor: 'rgba(82,183,136,0.6)', borderWidth: 1.5, borderRadius: 5, borderSkipped: false },
          { label: 'Gastos', data: months6.map(m => m.expense), backgroundColor: 'rgba(224,95,95,0.18)', borderColor: 'rgba(224,95,95,0.55)', borderWidth: 1.5, borderRadius: 5, borderSkipped: false },
        ]
      },
      options: { ...chartDefaults, plugins: { ...chartDefaults.plugins, legend: { display: true, labels: { color: '#8a8d96', boxWidth: 10, boxHeight: 10, font: { size: 11 } } } } }
    })

    c.rate = new Chart(rateRef.current.getContext('2d')!, {
      type: 'line',
      data: {
        labels: months6.map(m => m.label),
        datasets: [{ data: months6.map(m => m.income > 0 ? Math.round(((m.income - m.expense) / m.income) * 100) : 0), borderColor: 'rgba(201,168,76,0.8)', backgroundColor: 'rgba(201,168,76,0.06)', borderWidth: 2, tension: 0.35, pointBackgroundColor: 'rgba(201,168,76,0.9)', pointRadius: 4, fill: true }]
      },
      options: { ...chartDefaults, scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, ticks: { ...chartDefaults.scales.y.ticks, callback: (v: string | number) => (typeof v === 'number' ? v : parseFloat(v as string)) + '%' } } } }
    })
  }, [txs])

  const expTxs = txs.filter(t => t.type === 'expense' && t.date.startsWith(monthKey(now.getFullYear(), now.getMonth())))
  const totalExp = expTxs.reduce((s, t) => s + t.amount, 0)
  const byCat: Record<string, number> = {}
  expTxs.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount })
  const catsSorted = Object.entries(byCat).sort((a, b) => b[1] - a[1])

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[
          { label: 'Total ingresos', val: fmtShort(totalIncome), unit: 'histórico', cls: 'st-green', color: 'var(--color-acc-green)' },
          { label: 'Total gastos', val: fmtShort(totalExpense), unit: 'histórico', cls: 'st-red', color: 'var(--color-red)' },
          { label: 'Ahorro neto', val: fmtShort(Math.abs(totalSaved)), unit: totalSaved >= 0 ? 'acumulado' : 'en negativo', cls: 'st-gold', color: 'var(--color-acc-gold)' },
          { label: 'Tasa ahorro', val: savingsRate + '%', unit: 'del total', cls: 'st-blue', color: 'var(--color-acc-blue)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 12, right: '40%', height: 2, borderRadius: '0 0 2px 2px', background: s.color }} />
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 26, lineHeight: 1, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 4 }}>{s.unit}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-sub)', letterSpacing: '0.3px', marginBottom: 12 }}>Ingresos vs gastos — últimos 6 meses</div>
        <div style={{ position: 'relative', height: 160 }}><canvas ref={barRef} /></div>
      </div>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-sub)', letterSpacing: '0.3px', marginBottom: 12 }}>Tasa de ahorro mensual (%)</div>
        <div style={{ position: 'relative', height: 120 }}><canvas ref={rateRef} /></div>
      </div>

      <div className="card">
        {catsSorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'var(--color-dim)' }}>Sin gastos este mes.</div>
        ) : catsSorted.map(([cat, amt]) => {
          const pct = Math.round(amt / totalExp * 100)
          const meta = CAT_META[cat] || { icon: '📤', color: '#8a8d96' }
          return (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: meta.color }} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>{meta.icon} {cat}</span>
              <div style={{ flex: '0 0 80px' }}>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: meta.color }} />
                </div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--color-dim)', minWidth: 34, textAlign: 'right' }}>{pct}%</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', minWidth: 60, textAlign: 'right' }}>{fmt(amt)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── PATRIMONIO TAB ── */
function PatrimonioTab() {
  const { cuentas, huchas, pufos, saveCuenta, removeCuenta, addHucha, aportarHucha, removeHucha, addPufo, settlePufo, removePufo } = useFinanceStore()
  const toast = useToast()
  const [sub, setSub] = useState<'cuentas' | 'huchas' | 'pufos'>('cuentas')
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
    saveCuenta({ name: cName.trim(), type: cType, balance: parseFloat(cBal) || 0, color: cColor, note: cNote.trim(), updatedAt: todayISO() }, editIdx)
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
            <button onClick={() => openForm()}
              style={{ background: 'rgba(91,138,240,0.1)', color: 'var(--color-acc-blue)', border: '1px solid rgba(91,138,240,0.2)', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>+ Añadir</button>
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
                  <input className="inp" value={cName} onChange={e => setCName(e.target.value)} type="text" placeholder="Nombre (ej: Cuenta ING)" />
                  <select className="inp" value={cType} onChange={e => setCType(e.target.value)}>
                    {Object.entries(CUENTA_TYPE).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <input className="inp" value={cBal} onChange={e => setCBal(e.target.value)} type="number" step="0.01" placeholder="Saldo actual (€)" />
                  <input className="inp" value={cColor} onChange={e => setCColor(e.target.value)} type="color" style={{ height: 44, cursor: 'pointer' }} />
                </div>
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

      {/* Huchas totales */}
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
            <input className="inp" value={hDeadline} onChange={e => setHDeadline(e.target.value)} type="date" style={{ marginBottom: 8, fontSize: 13 }} />
            <select className="inp" value={hColor} onChange={e => setHColor(e.target.value)} style={{ marginBottom: 12 }}>
              <option value="var(--color-acc-gold)">🟡 Dorado</option>
              <option value="var(--color-acc-green)">🟢 Verde</option>
              <option value="var(--color-acc-blue)">🔵 Azul</option>
              <option value="var(--color-acc-purple)">🟣 Morado</option>
            </select>
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
              addPufo({ id: Date.now(), who: pWho.trim(), person: pWho.trim(), amount: a, dir: pufoDir, reason: pReason.trim(), concept: pReason.trim(), date: todayISO(), settled: false })
              toast.show('✓ Pufo registrado')
              setPWho(''); setPAmt(''); setPReason('')
            }}
              style={{ width: '100%', padding: 12, borderRadius: 12, background: 'var(--color-acc-blue)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', marginTop: 4 }}>Añadir pufo</button>
          </div>
        </>
      )}

      {/* Settle modal */}
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
    </div>
  )
}

/* ── BUDGETS TAB ── */
function BudgetsTab() {
  const { txs, presupuestos, setPresupuesto, removePresupuesto, recurrentes, addRecurrente, removeRecurrente } = useFinanceStore()
  const toast = useToast()
  const [cat, setCat] = useState('Alimentación')
  const [limit, setLimit] = useState('')
  const [rConcept, setRConcept] = useState('')
  const [rAmount, setRAmount] = useState('')
  const [rType, setRType] = useState<'income' | 'expense'>('expense')
  const [rCategory, setRCategory] = useState('Alimentación')
  const [rDay, setRDay] = useState('1')
  const [icInit, setIcInit] = useState('1000')
  const [icRate, setIcRate] = useState('7')
  const [icYears, setIcYears] = useState('10')
  const [icMonthly, setIcMonthly] = useState('100')
  const [icResult, setIcResult] = useState<number | null>(null)

  const now = new Date()
  const keyM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  return (
    <div>
      <div className="sec-label">Presupuestos mensuales</div>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <select className="inp" value={cat} onChange={e => setCat(e.target.value)} style={{ flex: 1, marginBottom: 0 }}>
            {['Vivienda','Alimentación','Transporte','Salud','Ocio','Ropa','Suscripciones','Deporte','Restaurantes','Viajes','Educación','Otros gastos'].map(c => (
              <option key={c} value={c}>{CAT_META[c]?.icon || '•'} {c}</option>
            ))}
          </select>
          <input className="inp" value={limit} onChange={e => setLimit(e.target.value)} type="number" placeholder="Límite €" style={{ flex: 1, marginBottom: 0 }} />
          <button onClick={() => { const l = parseFloat(limit); if (l > 0) { setPresupuesto(cat, l); setLimit(''); toast.show(`✓ Presupuesto para ${cat}: ${fmt(l)}`) } }}
            style={{ padding: '10px 16px', borderRadius: 10, background: 'var(--color-acc-gold)', color: '#111', border: 'none', fontSize: 13, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', whiteSpace: 'nowrap' }}>Añadir</button>
        </div>
      </div>

      {presupuestos.length === 0 ? (
        <div className="empty-state">Sin presupuestos. Define límites por categoría.</div>
      ) : presupuestos.map(p => {
        const gastado = txs.filter(t => t.type === 'expense' && t.category === p.category && t.date.startsWith(keyM)).reduce((s, t) => s + t.amount, 0)
        const pct = Math.min(100, Math.round(gastado / p.limit * 100))
        const over = gastado > p.limit
        return (
          <div key={p.category} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{CAT_META[p.category]?.icon || '•'} {p.category}</span>
                <span style={{ fontSize: 11, color: 'var(--color-dim)', marginLeft: 8 }}>Límite: {fmt(p.limit)}</span>
              </div>
              <button onClick={() => { removePresupuesto(p.category); toast.show('Presupuesto eliminado') }}
                style={{ background: 'rgba(224,95,95,0.08)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.15)', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ height: '100%', borderRadius: 99, transition: 'width 0.5s ease', width: `${pct}%`, background: over ? 'var(--color-red)' : 'var(--color-acc-green)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: over ? 'var(--color-red)' : 'var(--color-sub)' }}>{fmt(gastado)} gastado</span>
              <span style={{ color: over ? 'var(--color-red)' : 'var(--color-dim)', fontWeight: 700 }}>{pct}%</span>
            </div>
            {over && <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-red)', fontWeight: 600 }}>⚠️ Has superado el presupuesto en {fmt(gastado - p.limit)}</div>}
          </div>
        )
      })}

      <div className="sec-label" style={{ marginTop: 24 }}>Transacciones recurrentes</div>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <input className="inp" value={rConcept} onChange={e => setRConcept(e.target.value)} type="text" placeholder="Concepto (ej: Suscripción Netflix)" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <input className="inp" value={rAmount} onChange={e => setRAmount(e.target.value)} type="number" step="0.01" placeholder="Importe €" style={{ marginBottom: 0 }} />
          <select className="inp" value={rDay} onChange={e => setRDay(e.target.value)} style={{ marginBottom: 0 }}>
            {Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>Día {i + 1}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button onClick={() => setRType('income')}
            style={{ flex: 1, padding: 9, borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid',
              background: rType === 'income' ? 'rgba(82,183,136,0.12)' : 'var(--color-s2)',
              color: rType === 'income' ? 'var(--color-acc-green)' : 'var(--color-dim)',
              borderColor: rType === 'income' ? 'rgba(82,183,136,0.3)' : 'var(--color-border)' }}>Ingreso</button>
          <button onClick={() => setRType('expense')}
            style={{ flex: 1, padding: 9, borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid',
              background: rType === 'expense' ? 'rgba(224,95,95,0.1)' : 'var(--color-s2)',
              color: rType === 'expense' ? 'var(--color-red)' : 'var(--color-dim)',
              borderColor: rType === 'expense' ? 'rgba(224,95,95,0.25)' : 'var(--color-border)' }}>Gasto</button>
        </div>
        <select className="inp" value={rCategory} onChange={e => setRCategory(e.target.value)}>
          {['Vivienda','Alimentación','Transporte','Salud','Ocio','Ropa','Suscripciones','Deporte','Restaurantes','Viajes','Educación','Otros gastos'].map(c => <option key={c} value={c}>{CAT_META[c]?.icon || '•'} {c}</option>)}
          <option value="Nómina">💼 Nómina</option>
        </select>
        <button onClick={() => {
          const a = parseFloat(rAmount)
          if (!rConcept.trim() || !a || a <= 0) { toast.show('Introduce concepto e importe'); return }
          addRecurrente({ id: Date.now(), concept: rConcept.trim(), amount: a, type: rType, category: rCategory, day: parseInt(rDay), active: true })
          toast.show('✓ Transacción recurrente añadida')
          setRConcept(''); setRAmount('')
        }}
          style={{ width: '100%', padding: 12, borderRadius: 12, background: 'var(--color-acc-blue)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>Añadir recurrente</button>
      </div>

      {recurrentes.length === 0 ? (
        <div className="empty-state">Sin transacciones recurrentes.</div>
      ) : recurrentes.map(r => (
        <div key={r.id} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 12, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 18 }}>{r.type === 'income' ? '💼' : '📅'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{r.concept}</div>
            <div style={{ fontSize: 11, color: 'var(--color-dim)' }}>{r.category} · Día {r.day} · {fmt(r.amount)}</div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: r.type === 'income' ? 'var(--color-acc-green)' : 'var(--color-red)' }}>
            {r.type === 'income' ? '+' : '−'}{fmt(r.amount)}
          </div>
          <button onClick={() => { removeRecurrente(r.id); toast.show('Recurrente eliminado') }}
            style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(224,95,95,0.06)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.12)', cursor: 'pointer', fontSize: 11 }}>✕</button>
        </div>
      ))}

      <div className="sec-label" style={{ marginTop: 24 }}>📈 Interés compuesto</div>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <input className="inp" value={icInit} onChange={e => setIcInit(e.target.value)} type="number" placeholder="Inicial €" style={{ marginBottom: 0 }} />
          <input className="inp" value={icRate} onChange={e => setIcRate(e.target.value)} type="number" placeholder="Interés anual %" style={{ marginBottom: 0 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <input className="inp" value={icYears} onChange={e => setIcYears(e.target.value)} type="number" placeholder="Años" style={{ marginBottom: 0 }} />
          <input className="inp" value={icMonthly} onChange={e => setIcMonthly(e.target.value)} type="number" placeholder="Aporte mensual €" style={{ marginBottom: 0 }} />
        </div>
        <button onClick={() => {
          const init = parseFloat(icInit) || 0
          const rate = (parseFloat(icRate) || 7) / 100 / 12
          const months = (parseInt(icYears) || 10) * 12
          const monthly = parseFloat(icMonthly) || 0
          let total = init
          for (let i = 0; i < months; i++) total = total * (1 + rate) + monthly
          setIcResult(Math.round(total))
          toast.show(`💰 Total estimado: ${fmt(Math.round(total))}`)
        }}
          style={{ width: '100%', padding: 12, borderRadius: 12, background: 'rgba(201,168,76,0.1)', color: 'var(--color-acc-gold)', border: '1px solid rgba(201,168,76,0.2)', fontSize: 14, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>Calcular</button>
        {icResult !== null && (
          <div style={{ marginTop: 10, textAlign: 'center' }}>
            <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 28, color: 'var(--color-acc-gold)' }}>{fmt(icResult)}</div>
            <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 2 }}>en {icYears} años al {icRate}% anual</div>
          </div>
        )}
      </div>
    </div>
  )
}
