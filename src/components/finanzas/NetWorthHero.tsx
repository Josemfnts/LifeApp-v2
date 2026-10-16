import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import { useFinanceStore, fmt, fmtShort, netWorthExtras } from '@/stores/financeStore'
import { computeNetWorth } from '@/lib/finance/networth'
import { variation } from '@/lib/finance/snapshots'
import { localISO } from '@/lib/finance/dates'
import { sumEuros } from '@/lib/finance/money'
import { AnimatedNumber } from './AnimatedNumber'
import { useTheme } from '@/contexts/ThemeContext'

type Period = '1M' | '3M' | '1A' | 'Todo'

interface Props {
  onGoPatrimonio?: () => void
}

export function NetWorthHero({ onGoPatrimonio }: Props) {
  const { theme } = useTheme()
  const cuentas = useFinanceStore(s => s.cuentas)
  const snapshots = useFinanceStore(s => s.snapshots)
  const [period, setPeriod] = useState<Period>('1M')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  const holdings = useFinanceStore(s => s.holdings)
  const priceCache = useFinanceStore(s => s.priceCache)
  const debts = useFinanceStore(s => s.debts)
  const properties = useFinanceStore(s => s.properties)
  const pufos = useFinanceStore(s => s.pufos)
  const breakdown = computeNetWorth(cuentas, netWorthExtras({ holdings, priceCache, debts, properties, pufos }))
  const today = localISO()
  const v = variation(snapshots, breakdown.net, today, period)

  useEffect(() => {
    if (!canvasRef.current) return
    if (chartRef.current) chartRef.current.destroy()
    if (snapshots.length === 0) return
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--color-ink').trim()
    const volt = getComputedStyle(document.documentElement).getPropertyValue('--color-volt').trim()
    const labels = snapshots.map(s => s.date)
    const data = snapshots.map(s => s.net)
    chartRef.current = new Chart(canvasRef.current.getContext('2d')!, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            data,
            borderColor: ink,
            backgroundColor: `color-mix(in srgb, ${ink} 18%, transparent)`,
            borderWidth: 2.5,
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
            backgroundColor: ink,
            borderColor: ink,
            borderWidth: 1,
            titleColor: volt,
            bodyColor: '#FFFFFF',
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
    return () => { chartRef.current?.destroy(); chartRef.current = null }
  }, [snapshots, theme])

  if (cuentas.length === 0 && holdings.length === 0 && debts.length === 0 && properties.length === 0 && !pufos.some(p => !p.settled)) {
    return (
      <div className="finance-hero finance-hero__empty">
        <div className="finance-hero__label">Patrimonio neto</div>
        <div className="finance-hero__value">—</div>
        <div>Añade tu primera cuenta para ver tu patrimonio.</div>
        {onGoPatrimonio && (
          <button className="finance-hero__action" onClick={onGoPatrimonio}>Añadir cuenta</button>
        )}
      </div>
    )
  }

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
    <div className="finance-hero">
      <div className="finance-hero__top">
        <div className="finance-hero__label">Patrimonio neto</div>
        <div className="finance-hero__periods" aria-label="Periodo del patrimonio">
          {(['1M', '3M', '1A', 'Todo'] as const).map(p => (
            <button className="finance-hero__period" aria-pressed={period === p} key={p} onClick={() => setPeriod(p)}>
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="finance-hero__value">
        <AnimatedNumber value={breakdown.net} format={fmt} />
      </div>
      <div className="finance-hero__variation">
        {hasHistory ? (
          <>
            <span className="finance-hero__chip">
              {variationSign}{fmt(v.abs)} {v.pct !== null && `(${v.pct >= 0 ? '+' : ''}${v.pct.toFixed(1)}%)`}
            </span>
            <span className="finance-hero__note">variación del patrimonio, no rentabilidad</span>
          </>
        ) : (
          <span className="finance-hero__note">Sin histórico todavía — se calcula a partir de mañana</span>
        )}
      </div>
      <div className="finance-hero__segments">
        {segmentRows.map(([name, val]) => (
          <div className="finance-hero__segment" key={name}>
            <span>{name}</span>
            <strong>{fmtShort(val)}</strong>
          </div>
        ))}
      </div>
      {(() => {
        const receivables = sumEuros(pufos.filter(p => !p.settled).map(p => (p.dir === 'me_debe' ? p.amount : -p.amount)))
        if (receivables === 0) return null
        return (
          <div className="finance-hero__note" style={{ fontSize: 11, marginTop: 10 }}>
            {receivables > 0 ? `Incluye ${fmt(receivables)} que te deben` : `Descuenta ${fmt(-receivables)} que debes`}
          </div>
        )
      })()}
      {snapshots.length > 1 && (
        <div className="finance-hero__chart">
          <canvas ref={canvasRef} />
          {snapshots.some(s => s.estimated) && (
            <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 10, color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 10, borderTop: '2px dashed var(--color-ink)' }} /> estimado
            </div>
          )}
        </div>
      )}
    </div>
  )
}
