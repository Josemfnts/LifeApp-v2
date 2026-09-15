import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import { useFinanceStore, fmt, fmtShort } from '@/stores/financeStore'
import { computeNetWorth } from '@/lib/finance/networth'
import { portfolio } from '@/lib/finance/investments'
import { variation } from '@/lib/finance/snapshots'
import { localISO } from '@/lib/finance/dates'
import { AnimatedNumber } from './AnimatedNumber'

type Period = '1M' | '3M' | '1A' | 'Todo'

interface Props {
  onGoPatrimonio?: () => void
}

export function NetWorthHero({ onGoPatrimonio }: Props) {
  const cuentas = useFinanceStore(s => s.cuentas)
  const snapshots = useFinanceStore(s => s.snapshots)
  const [period, setPeriod] = useState<Period>('1M')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  const holdings = useFinanceStore(s => s.holdings)
  const priceCache = useFinanceStore(s => s.priceCache)
  const investments = portfolio(holdings, priceCache, Date.now()).value
  const breakdown = computeNetWorth(cuentas, investments ? { investments } : undefined)
  const today = localISO()
  const v = variation(snapshots, breakdown.net, today, period)

  useEffect(() => {
    if (!canvasRef.current) return
    if (chartRef.current) chartRef.current.destroy()
    if (snapshots.length === 0) return
    const labels = snapshots.map(s => s.date)
    const data = snapshots.map(s => s.net)
    chartRef.current = new Chart(canvasRef.current.getContext('2d')!, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            data,
            borderColor: 'rgba(91,138,240,0.85)',
            backgroundColor: 'rgba(91,138,240,0.08)',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0,
            fill: true,
            segment: {
              borderDash: (ctx: { p0DataIndex: number; p1DataIndex: number }) => {
                const a = snapshots[ctx.p0DataIndex]?.estimated
                const b = snapshots[ctx.p1DataIndex]?.estimated
                return a || b ? [4, 4] : undefined
              },
            },
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#191c22',
            borderColor: 'rgba(255,255,255,0.07)',
            borderWidth: 1,
            titleColor: '#e8e9ee',
            bodyColor: '#8a8d96',
            callbacks: {
              label: (c: { raw: unknown; dataIndex: number }) => {
                const v = c.raw as number
                const est = snapshots[c.dataIndex]?.estimated
                return `${fmt(v)}${est ? ' (estimado)' : ''}`
              },
            },
          },
        },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    })
  }, [snapshots])

  if (cuentas.length === 0 && holdings.length === 0) {
    return (
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 20, padding: 24, marginBottom: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>Patrimonio neto</div>
        <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 32, color: 'var(--color-text)', marginBottom: 12 }}>—</div>
        <div style={{ fontSize: 13, color: 'var(--color-sub)', marginBottom: 16 }}>Añade tu primera cuenta para ver tu patrimonio</div>
        {onGoPatrimonio && (
          <button onClick={onGoPatrimonio} style={{ background: 'rgba(91,138,240,0.1)', color: 'var(--color-acc-blue)', border: '1px solid rgba(91,138,240,0.2)', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
            Ir a Patrimonio
          </button>
        )}
      </div>
    )
  }

  const variationColor = v.abs >= 0 ? 'var(--color-acc-green)' : 'var(--color-red)'
  const variationSign = v.abs >= 0 ? '+' : ''
  const hasHistory = v.fromDate !== null
  const segmentRows: Array<[string, number]> = []
  segmentRows.push(['Líquido', breakdown.liquid])
  if (breakdown.investments !== 0 || breakdown.property !== 0) {
    if (breakdown.investments !== 0) segmentRows.push(['Inversión', breakdown.investments])
    if (breakdown.property !== 0) segmentRows.push(['Inmuebles', breakdown.property])
  }
  if (breakdown.debt !== 0) segmentRows.push(['Deudas', breakdown.debt])

  return (
    <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 20, padding: '20px 20px 16px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'radial-gradient(circle, rgba(91,138,240,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Patrimonio neto</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['1M', '3M', '1A', 'Todo'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', border: '1px solid', cursor: 'pointer',
                background: period === p ? 'rgba(91,138,240,0.1)' : 'transparent',
                color: period === p ? 'var(--color-acc-blue)' : 'var(--color-dim)',
                borderColor: period === p ? 'rgba(91,138,240,0.3)' : 'var(--color-border)' }}>
              {p}
            </button>
          ))}
        </div>
      </div>
      <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 42, lineHeight: 1, color: 'var(--color-text)', marginBottom: 8 }}>
        <AnimatedNumber value={breakdown.net} format={fmt} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        {hasHistory ? (
          <>
            <span style={{ fontSize: 12, fontWeight: 700, color: variationColor, background: 'var(--color-s2)', border: '1px solid var(--color-border)', padding: '2px 10px', borderRadius: 99 }}>
              {variationSign}{fmt(v.abs)} {v.pct !== null && `(${v.pct >= 0 ? '+' : ''}${v.pct.toFixed(1)}%)`}
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-dim)' }}>variación del patrimonio, no rentabilidad</span>
          </>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--color-dim)' }}>Sin histórico todavía — se calcula a partir de mañana</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
        {segmentRows.map(([name, val]) => (
          <div key={name} style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 10, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{name}</span>
            <span style={{ fontFamily: 'DM Serif Display,serif', fontSize: 16, color: name === 'Deudas' ? 'var(--color-red)' : 'var(--color-text)' }}>{fmtShort(val)}</span>
          </div>
        ))}
      </div>
      {snapshots.length > 1 && (
        <div style={{ position: 'relative', height: 110 }}>
          <canvas ref={canvasRef} />
          {snapshots.some(s => s.estimated) && (
            <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 9, color: 'var(--color-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 10, borderTop: '2px dashed var(--color-dim)' }} /> estimado
            </div>
          )}
        </div>
      )}
    </div>
  )
}
