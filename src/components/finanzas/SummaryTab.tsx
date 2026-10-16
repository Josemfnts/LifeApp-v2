import { useState, useRef, useEffect } from 'react'
import Chart from 'chart.js/auto'
import { useFinanceStore, CAT_META, fmt, fmtShort } from '@/stores/financeStore'
import { isFlow } from '@/lib/finance/flow'
import { sumEuros } from '@/lib/finance/money'
import { flowAmount } from '@/lib/finance/split'
import { MONTHS, monthKey } from './shared'
import { TxRow } from './TxRow'
import { EditTxSheet } from './EditTxSheet'
import { NetWorthHero } from './NetWorthHero'
import { UpcomingBlock } from './plan/UpcomingBlock'
import { ArrowDownRight, ArrowUpRight, Scale } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export function SummaryTab({ onGoPatrimonio }: { onGoPatrimonio?: () => void }) {
  const { theme } = useTheme()
  const { txs } = useFinanceStore()
  const [editId, setEditId] = useState<number | null>(null)
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth())
  const donaRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  const txsMonth = txs.filter(t => t.date.startsWith(monthKey(viewYear, viewMonth)))
  const txsMonthFlow = txsMonth.filter(isFlow)
  const income = sumEuros(txsMonthFlow.filter(t => t.type === 'income').map(flowAmount))
  const expense = sumEuros(txsMonthFlow.filter(t => t.type === 'expense').map(flowAmount))
  const balance = sumEuros([income, -expense])

  useEffect(() => {
    if (!donaRef.current) return
    if (chartRef.current) chartRef.current.destroy()
    const ctx = donaRef.current.getContext('2d')!
    const styles = getComputedStyle(document.documentElement)
    const surface = styles.getPropertyValue('--color-s2').trim()
    const ink = styles.getPropertyValue('--color-ink').trim()
    const volt = styles.getPropertyValue('--color-volt').trim()
    const teal = styles.getPropertyValue('--color-teal').trim()
    const amber = styles.getPropertyValue('--color-amber').trim()
    const coral = styles.getPropertyValue('--color-coral').trim()
    const palette = [teal, amber, coral]

    const expTxs = txsMonthFlow.filter(t => t.type === 'expense')
    const byCat: Record<string, number> = {}
    for (const t of expTxs) byCat[t.category] = sumEuros([byCat[t.category] || 0, flowAmount(t)])
    const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1])

    if (!cats.length) {
      chartRef.current = new Chart(ctx, {
        type: 'doughnut',
        data: { datasets: [{ data: [1], backgroundColor: [surface], borderWidth: 0 }] },
        options: { cutout: '72%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
      })
    } else {
      const colors = cats.map((_, i) => palette[i % palette.length])
      chartRef.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: cats.map(c => c[0]),
          datasets: [{
            data: cats.map(c => c[1]),
            backgroundColor: colors,
            borderColor: colors, borderWidth: 1.5,
          }]
        },
        options: {
          cutout: '72%', animation: { duration: 500 },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: ink, borderColor: ink, borderWidth: 1,
              titleColor: volt, bodyColor: '#FFFFFF',
              callbacks: { label: (c: { raw: unknown }) => `${fmt(c.raw as number)} (${Math.round((c.raw as number) / expense * 100)}%)` }
            }
          }
        }
      })
    }
    return () => { chartRef.current?.destroy(); chartRef.current = null }
  }, [txsMonth, txsMonthFlow, expense, theme])

  const expFlow = txsMonthFlow.filter(t => t.type === 'expense')
  const topByCat: Record<string, number> = {}
  for (const t of expFlow) topByCat[t.category] = sumEuros([topByCat[t.category] || 0, flowAmount(t)])
  const topCats = Object.entries(topByCat).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const showAlert = expense > income && income > 0
  const showWarn = income > 0 && expense / income > 0.85 && !showAlert

  const recent = txsMonth.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  return (
    <div>
      <NetWorthHero onGoPatrimonio={onGoPatrimonio} />
      <UpcomingBlock />
      {/* V5: selector de mes sin tarjeta propia: es navegación, no contenido. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0', marginBottom: 8 }}>
        <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) } else setViewMonth(m => m - 1) }}
          style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-sub)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>‹</button>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--color-text)' }}>{MONTHS[viewMonth]} {viewYear}</div>
        <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) } else setViewMonth(m => m + 1) }}
          style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-sub)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>›</button>
      </div>

      <div className="stat-strip finance-summary-strip">
          <div><span className="finance-stat-label"><Scale size={14} /> Balance</span><div className="stat-num" style={{ color: balance < 0 ? 'var(--color-red)' : 'var(--color-text)' }}>{balance >= 0 ? '+' : ''}{fmt(balance)}</div><div className="finance-stat-count">{MONTHS[viewMonth]} {viewYear}</div></div>
          <div><span className="finance-stat-label"><ArrowUpRight size={15} /> Ingresos</span><div className="stat-num">{fmt(income)}</div><div className="finance-stat-count">{txsMonthFlow.filter(t => t.type === 'income').length} movimientos</div></div>
          <div><span className="finance-stat-label"><ArrowDownRight size={15} /> Gastos</span><div className="stat-num">{fmt(expense)}</div><div className="finance-stat-count">{txsMonthFlow.filter(t => t.type === 'expense').length} movimientos</div></div>
        </div>

      {(showAlert || showWarn) && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(224,95,95,0.07)', border: '1px solid rgba(224,95,95,0.2)', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠️</span>
          <span style={{ fontSize: 13, color: 'var(--color-sub)', lineHeight: 1.45 }}>
            {showAlert ? <>Estás gastando <strong style={{ color: 'var(--color-red)' }}>{fmt(sumEuros([expense, -income]))} más</strong> de lo que ingresas este mes.</>
              : <>Llevas gastado el <strong style={{ color: 'var(--color-red)' }}>{Math.round(expense / income * 100)}%</strong> de tus ingresos este mes.</>}
          </span>
        </div>
      )}

      <div className="finance-categories">
        <div className="sec-label" style={{ marginBottom: 12 }}>Gastos por categoría</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
            <canvas ref={donaRef} width={110} height={110} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--color-text)', lineHeight: 1 }}>{fmtShort(expense)}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--color-dim)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>gastado</div>
            </div>
          </div>
          <div style={{ flex: '1 1 190px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {topCats.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--color-dim)' }}>Sin gastos registrados este mes.</div>
            ) : topCats.map(([name, amt], i) => (
              <div className="finance-categories__row" key={name}>
                <span className="name">{CAT_META[name]?.icon} {name}</span>
                <span className="value">{fmt(amt)} <small style={{ color: 'var(--color-sub)', fontSize: 11 }}>{Math.round(amt / expense * 100)}%</small></span>
                <div className="finance-categories__track"><div className="finance-categories__fill" style={{ width: `${Math.min(100, amt / expense * 100)}%`, background: `var(--color-${['teal', 'amber', 'coral'][i % 3]})` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 10 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, padding: '16px 16px 4px' }}>Últimos movimientos</div>
        {recent.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'var(--color-dim)' }}>Sin movimientos este mes.</div>
        ) : recent.map((t, i) => (
          <TxRow key={i} tx={t} onClick={(id) => setEditId(id)} />
        ))}
      </div>
      <EditTxSheet open={editId !== null} onClose={() => setEditId(null)} txId={editId} />
    </div>
  )
}
