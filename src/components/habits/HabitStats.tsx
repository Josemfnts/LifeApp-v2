import { useState, useMemo } from 'react'
import type { Habit, HabitLog } from '@/types'
import { Card } from '@/components/ui'
import { calcStreak, getLogValue, habitActiveOnDay, isHabitDone } from '@/hooks/useHabits'

interface HabitStatsProps {
  habits: Habit[]
  log: HabitLog
}

const MONTHS_S = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export function HabitStats({ habits, log }: HabitStatsProps) {
  const [selId, setSelId] = useState<string>('all')
  const today = useMemo(() => new Date(), [])
  const todayStr = today.toISOString().slice(0, 10)

  const relevantHabits = selId === 'all' ? habits : habits.filter(h => h.id === +selId)

  const stats = useMemo(() => {
    let bestStreak = 0
    let curStreakAll = 0
    let totalCheckins = 0

    relevantHabits.forEach(h => {
      const cs = calcStreak(h, log, today)
      if (cs > curStreakAll) curStreakAll = cs

      Object.values(log).forEach(dayObj => {
        const v = dayObj[h.id] || 0
        if (isHabitDone(h, v)) totalCheckins++
      })
    })

    let possible = 0
    let achieved = 0
    for (let i = 0; i < 30; i++) {
      const d = new Date(Date.now() - i * 86400000)
      relevantHabits.forEach(h => {
        if (!habitActiveOnDay(h, d)) return
        possible++
        const v = getLogValue(log, d.toISOString().slice(0, 10), h.id)
        if (isHabitDone(h, v)) achieved++
      })
    }

    return {
      bestStreak,
      curStreakAll,
      totalCheckins,
      rate: possible > 0 ? Math.round(achieved / possible * 100) + '%' : '—',
    }
  }, [relevantHabits, log, today])

  // Heatmap: 84 days (12 weeks)
  const heatCells = useMemo(() => {
    const days = 84
    const cells: { pct: number; isToday: boolean; bg: string }[] = []
    const baseColor = selId !== 'all' && relevantHabits[0] ? relevantHabits[0].color : '#9b7fe0'

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const dStr = d.toISOString().slice(0, 10)
      let filled = 0
      let total = 0
      relevantHabits.forEach(h => {
        if (!habitActiveOnDay(h, d)) return
        total++
        const v = getLogValue(log, dStr, h.id)
        if (isHabitDone(h, v)) filled++
      })
      const pct = total > 0 ? filled / total : 0
      let bg = 'rgba(255,255,255,0.04)'
      if (pct > 0 && pct < 0.5) bg = baseColor + '55'
      else if (pct >= 0.5 && pct < 1) bg = baseColor + '99'
      else if (pct === 1) bg = baseColor
      cells.push({ pct, isToday: dStr === todayStr, bg })
    }
    return cells
  }, [relevantHabits, log, todayStr, selId])

  const startD = new Date(Date.now() - 83 * 86400000)

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-3.5">
          <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-wide mb-1.5">Racha máxima</div>
          <div className="font-serif text-[32px] text-[var(--color-yellow)] leading-none">{stats.bestStreak}</div>
          <div className="text-[11px] text-[var(--color-dim)] mt-1">días consecutivos</div>
        </div>
        <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-3.5">
          <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-wide mb-1.5">Racha actual</div>
          <div className="font-serif text-[32px] text-[#9b7fe0] leading-none">{stats.curStreakAll}</div>
          <div className="text-[11px] text-[var(--color-dim)] mt-1">días seguidos</div>
        </div>
        <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-3.5">
          <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-wide mb-1.5">Tasa de éxito</div>
          <div className="font-serif text-[32px] text-[#52b788] leading-none">{stats.rate}</div>
          <div className="text-[11px] text-[var(--color-dim)] mt-1">últimos 30 días</div>
        </div>
        <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-3.5">
          <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-wide mb-1.5">Total completados</div>
          <div className="font-serif text-[32px] text-[#5b8af0] leading-none">{stats.totalCheckins}</div>
          <div className="text-[11px] text-[var(--color-dim)] mt-1">check-ins</div>
        </div>
      </div>

      <select
        value={selId}
        onChange={e => setSelId(e.target.value)}
        className="w-full bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3.5 py-2.5 text-sm font-sans mb-3 cursor-pointer outline-none"
      >
        <option value="all">Todos los hábitos combinados</option>
        {habits.map(h => (
          <option key={h.id} value={h.id}>{h.emoji} {h.name}</option>
        ))}
      </select>

      <Card padded className="mb-2.5">
        <div className="text-[12px] font-semibold text-[var(--color-sub)] tracking-wide mb-3">Últimas 12 semanas</div>
        <div className="grid grid-cols-[repeat(14,1fr)] gap-[3px] mb-1">
          {heatCells.map((cell, i) => (
            <div
              key={i}
              className="aspect-square rounded-[3px]"
              style={{
                background: cell.bg,
                outline: cell.isToday ? '1.5px solid rgba(255,255,255,0.3)' : undefined,
              }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[9px] text-[var(--color-dim)] px-px">
          <span>{startD.getDate()} {MONTHS_S[startD.getMonth()]}</span>
          <span>{today.getDate()} {MONTHS_S[today.getMonth()]}</span>
        </div>
      </Card>

      {/* Year in pixels */}
      {(() => {
        const days = 365
        const cells2: { pct: number; bg: string }[] = []
        const baseColor = selId !== 'all' && relevantHabits[0] ? relevantHabits[0].color : '#9b7fe0'
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date(Date.now() - i * 86400000)
          const dStr = d.toISOString().slice(0, 10)
          let filled = 0; let total = 0
          relevantHabits.forEach(h => {
            const dow2 = d.getDay(); let active2 = false
            if (h.freq === 'daily') active2 = true
            else if (h.freq === 'weekdays') active2 = dow2 >= 1 && dow2 <= 5
            else if (h.freq === 'weekend') active2 = dow2 === 0 || dow2 === 6
            else if (h.freq === 'custom') active2 = (h.days || []).includes(dow2)
            if (!active2) return; total++
            const v = getLogValue(log, dStr, h.id)
            if (isHabitDone(h, v)) filled++
          })
          const pct2 = total > 0 ? filled / total : 0
          let bg2 = 'rgba(255,255,255,0.03)'
          if (pct2 > 0 && pct2 < 0.5) bg2 = baseColor + '55'
          else if (pct2 >= 0.5 && pct2 < 1) bg2 = baseColor + '99'
          else if (pct2 === 1) bg2 = baseColor
          cells2.push({ pct: pct2, bg: bg2 })
        }
        const startY = new Date(Date.now() - 364 * 86400000)
        return (
          <Card padded className="mb-2.5">
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-sub)', letterSpacing: '0.3px', marginBottom: 10 }}>🗓 Año en píxeles</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(53,1fr)', gap: 2 }}>
              {cells2.map((c, i) => <div key={i} style={{ aspectRatio: '1', borderRadius: 2, background: c.bg }} />)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: 'var(--color-dim)' }}>
              <span>{startY.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}</span>
              <span>Hoy</span>
            </div>
          </Card>
        )
      })()}

      <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2.5">Por hábito</div>
      {habits.length === 0 ? (
        <div className="text-center py-8 text-[13px] text-[var(--color-dim)]">Sin hábitos.</div>
      ) : (
        habits.map(h => {
          const cs = calcStreak(h, log, today)
          let total30 = 0
          let done30 = 0
          for (let i = 0; i < 30; i++) {
            const d = new Date(Date.now() - i * 86400000)
            if (!habitActiveOnDay(h, d)) continue
            total30++
            const v = getLogValue(log, d.toISOString().slice(0, 10), h.id)
            if (isHabitDone(h, v)) done30++
          }
          const rate30 = total30 > 0 ? Math.round(done30 / total30 * 100) : 0
          return (
            <div key={h.id} className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-3.5 mb-2">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-[38px] h-[38px] rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: h.color + '18', border: '1px solid ' + h.color + '30' }}>
                  {h.emoji}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-[var(--color-text)]">{h.name}</div>
                  <div className="text-[11px] text-[var(--color-dim)] mt-0.5">
                    {h.type === 'count' ? `Meta: ${h.goal} ${h.unit}` : 'Sí/No'}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-serif text-[22px]" style={{ color: h.color }}>{cs}</div>
                  <div className="text-[10px] text-[var(--color-dim)]">racha</div>
                </div>
              </div>
              <div className="h-[5px] bg-white/[0.05] rounded-full overflow-hidden mb-1.5">
                <div className="h-full rounded-full transition-all duration-600" style={{ width: `${rate30}%`, background: h.color }} />
              </div>
              <div className="flex justify-between text-[11px] text-[var(--color-dim)]">
                <span>Último mes: {done30}/{total30} días</span>
                <span className="font-bold" style={{ color: h.color }}>{rate30}%</span>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
