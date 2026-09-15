import { useState, useRef, useEffect } from 'react'
import Chart from 'chart.js/auto'
import { useFinanceStore, CAT_META, fmt, fmtShort } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import { isFlow } from '@/lib/finance/flow'
import { sumEuros } from '@/lib/finance/money'
import { flowAmount } from '@/lib/finance/split'
import { MONTHS_SH, monthKey } from './shared'

export function AnalysisTab() {
  const { txs } = useFinanceStore()
  const toast = useToast()
  const [icInit, setIcInit] = useState('1000')
  const [icRate, setIcRate] = useState('7')
  const [icYears, setIcYears] = useState('10')
  const [icMonthly, setIcMonthly] = useState('100')
  const [icResult, setIcResult] = useState<number | null>(null)
  const barRef = useRef<HTMLCanvasElement>(null)
  const rateRef = useRef<HTMLCanvasElement>(null)
  const chartRefs = useRef<{ bar: Chart | null; rate: Chart | null }>({ bar: null, rate: null })

  const flowTxs = txs.filter(isFlow)
  const totalIncome = sumEuros(flowTxs.filter(t => t.type === 'income').map(flowAmount))
  const totalExpense = sumEuros(flowTxs.filter(t => t.type === 'expense').map(flowAmount))
  const totalSaved = sumEuros([totalIncome, -totalExpense])
  const savingsRate = totalIncome > 0 ? Math.round((totalSaved / totalIncome) * 100) : 0

  const now = new Date()
  const months6 = Array.from({ length: 6 }, (_, i) => {
    let y = now.getFullYear(), m = now.getMonth() - (5 - i)
    while (m < 0) { m += 12; y-- }
    const keyM = monthKey(y, m)
    const monthFlow = txs.filter(t => t.date.startsWith(keyM) && isFlow(t))
    return {
      label: MONTHS_SH[m],
      income: sumEuros(monthFlow.filter(t => t.type === 'income').map(flowAmount)),
      expense: sumEuros(monthFlow.filter(t => t.type === 'expense').map(flowAmount)),
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

  const expFlow = txs.filter(t => t.type === 'expense' && isFlow(t) && t.date.startsWith(monthKey(now.getFullYear(), now.getMonth())))
  const totalExp = sumEuros(expFlow.map(flowAmount))
  const byCat: Record<string, number> = {}
  for (const t of expFlow) byCat[t.category] = sumEuros([byCat[t.category] || 0, flowAmount(t)])
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

      <div className="sec-label" style={{ marginTop: 24 }}>📈 Interés compuesto</div>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4 }}>Capital inicial (€)</div>
            <input className="inp" value={icInit} onChange={e => setIcInit(e.target.value)} type="number" placeholder="1000" style={{ marginBottom: 0 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4 }}>Interés anual (%)</div>
            <input className="inp" value={icRate} onChange={e => setIcRate(e.target.value)} type="number" placeholder="7" style={{ marginBottom: 0 }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4 }}>Años</div>
            <input className="inp" value={icYears} onChange={e => setIcYears(e.target.value)} type="number" placeholder="10" style={{ marginBottom: 0 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4 }}>Aportación mensual (€)</div>
            <input className="inp" value={icMonthly} onChange={e => setIcMonthly(e.target.value)} type="number" placeholder="100" style={{ marginBottom: 0 }} />
          </div>
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
