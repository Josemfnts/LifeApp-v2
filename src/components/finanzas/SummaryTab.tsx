import { useState, useRef, useEffect } from 'react'
import Chart from 'chart.js/auto'
import { useFinanceStore, CAT_META, fmt, fmtShort } from '@/stores/financeStore'
import { isFlow } from '@/lib/finance/flow'
import { sumEuros } from '@/lib/finance/money'
import { MONTHS, monthKey } from './shared'
import { TxRow } from './TxRow'
import { EditTxSheet } from './EditTxSheet'
import { NetWorthHero } from './NetWorthHero'

export function SummaryTab({ onGoPatrimonio }: { onGoPatrimonio?: () => void }) {
  const { txs } = useFinanceStore()
  const [editId, setEditId] = useState<number | null>(null)
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth())
  const donaRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  const txsMonth = txs.filter(t => t.date.startsWith(monthKey(viewYear, viewMonth)))
  const txsMonthFlow = txsMonth.filter(isFlow)
  const income = sumEuros(txsMonthFlow.filter(t => t.type === 'income').map(t => t.amount))
  const expense = sumEuros(txsMonthFlow.filter(t => t.type === 'expense').map(t => t.amount))
  const balance = sumEuros([income, -expense])

  useEffect(() => {
    if (!donaRef.current) return
    if (chartRef.current) chartRef.current.destroy()
    const ctx = donaRef.current.getContext('2d')!

    const expTxs = txsMonthFlow.filter(t => t.type === 'expense')
    const byCat: Record<string, number> = {}
    for (const t of expTxs) byCat[t.category] = sumEuros([byCat[t.category] || 0, t.amount])
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
  }, [txsMonth, txsMonthFlow, expense])

  const expFlow = txsMonthFlow.filter(t => t.type === 'expense')
  const topByCat: Record<string, number> = {}
  for (const t of expFlow) topByCat[t.category] = sumEuros([topByCat[t.category] || 0, t.amount])
  const topCats = Object.entries(topByCat).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const showAlert = expense > income && income > 0
  const showWarn = income > 0 && expense / income > 0.85 && !showAlert

  const recent = txsMonth.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  return (
    <div>
      <NetWorthHero onGoPatrimonio={onGoPatrimonio} />
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
            <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 3 }}>{txsMonthFlow.filter(t => t.type === 'income').length} movimientos</div>
          </div>
          <div style={{ background: 'var(--color-s2)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>Gastos</div>
            <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 22, color: 'var(--color-red)' }}>{fmt(expense)}</div>
            <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 3 }}>{txsMonthFlow.filter(t => t.type === 'expense').length} movimientos</div>
          </div>
        </div>
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
          <TxRow key={i} tx={t} onClick={(id) => setEditId(id)} />
        ))}
      </div>
      <EditTxSheet open={editId !== null} onClose={() => setEditId(null)} txId={editId} />
    </div>
  )
}
