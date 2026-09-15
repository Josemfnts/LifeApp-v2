import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'

export interface LineSeries {
  label: string
  data: number[]
  colorVar: string // nombre de variable CSS, p.ej. '--color-acc-blue'
  dashed?: boolean
  fill?: boolean
}

// chart.js no entiende var(--…): se resuelve el color real del tema al dibujar.
function cssColor(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

export function MiniLineChart({ labels, series, height = 140, format }: {
  labels: string[]
  series: LineSeries[]
  height?: number
  format?: (n: number) => string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    chartRef.current?.destroy()
    const grid = cssColor('--color-border', 'rgba(128,128,128,0.2)')
    const dim = cssColor('--color-dim', '#888')
    chartRef.current = new Chart(canvasRef.current.getContext('2d')!, {
      type: 'line',
      data: {
        labels,
        datasets: series.map(s => {
          const color = cssColor(s.colorVar, '#5b8af0')
          return {
            label: s.label,
            data: s.data,
            borderColor: color,
            backgroundColor: color + '22',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.25,
            fill: !!s.fill,
            borderDash: s.dashed ? [4, 4] : undefined,
          }
        }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        plugins: {
          legend: { display: series.length > 1, labels: { color: dim, boxWidth: 10, font: { size: 10 } } },
          tooltip: { callbacks: format ? { label: c => `${c.dataset.label}: ${format(c.raw as number)}` } : {} },
        },
        scales: {
          x: { grid: { color: grid }, ticks: { color: dim, font: { size: 9 }, maxTicksLimit: 6 } },
          y: { grid: { color: grid }, ticks: { color: dim, font: { size: 9 }, maxTicksLimit: 5 } },
        },
      },
    })
    return () => { chartRef.current?.destroy(); chartRef.current = null }
  }, [labels, series, format])

  return (
    <div style={{ position: 'relative', height }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
