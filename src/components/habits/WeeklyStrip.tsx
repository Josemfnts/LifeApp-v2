import { useEffect, useState } from 'react'

interface WeeklyStripProps {
  habits: { id: number; type: string; goal: number; freq: string; days: number[] }[]
  getLogValue: (date: string, habitId: number) => number
}

const DOW_MINI = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

export function WeeklyStrip({ habits, getLogValue }: WeeklyStripProps) {
  const [days, setDays] = useState<{ date: Date; dStr: string; done: number; total: number }[]>([])

  useEffect(() => {
    const result = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - ((6 - i) * 86400000))
      const dStr = d.toISOString().slice(0, 10)
      let done = 0
      habits.forEach(h => {
        const dow = d.getDay()
        let active = false
        if (h.freq === 'daily') active = true
        else if (h.freq === 'weekdays') active = dow >= 1 && dow <= 5
        else if (h.freq === 'weekend') active = dow === 0 || dow === 6
        else if (h.freq === 'custom') active = (h.days || []).includes(dow)
        if (!active) return
        const val = getLogValue(dStr, h.id)
        if (h.type === 'bool' && val) done++
        else if (h.type === 'count' && val >= h.goal) done++
        else if (h.type === 'avoid' && val === 0) done++
      })
      return { date: d, dStr, done, total: habits.length }
    })
    setDays(result)
  }, [habits, getLogValue])

  const todayIdx = 6

  return (
    <div className="flex gap-1 my-2.5">
      {days.map((item, i) => {
        const pct = item.total ? item.done / item.total : 0
        const color = pct >= 1 ? 'var(--color-acc-green)' : pct >= 0.5 ? 'var(--color-acc-gold)' : pct > 0 ? 'var(--color-acc-blue)' : 'rgba(255,255,255,0.05)'
        const border = i === todayIdx ? '2px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.06)'
        const textColor = i === todayIdx ? 'var(--color-text)' : 'var(--color-dim)'
        return (
          <div key={i} className="flex-1 text-center min-w-0">
            <div className="text-[9px] font-semibold uppercase mb-1" style={{ color: textColor }}>
              {DOW_MINI[item.date.getDay()]}
            </div>
            <div
              className="aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold text-white/85"
              style={{ background: color, border }}
            >
              {item.total ? (pct >= 1 ? '✓' : item.done > 0 ? item.done : '') : ''}
            </div>
            <div className="text-[9px] text-[var(--color-dim)] mt-0.5">{item.date.getDate()}</div>
          </div>
        )
      })}
    </div>
  )
}
