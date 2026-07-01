import type { Habit } from '@/types'
import { Card, ProgressBar } from '@/components/ui'
import { calcStreak, getLogValue } from '@/hooks/useHabits'
import type { HabitLog } from '@/types'

interface HabitTodayCardProps {
  habit: Habit
  val: number
  log: HabitLog
  onToggle: (id: number) => void
  onIncrement: (id: number, delta: number) => void
  onSetFull: (id: number) => void
}

function streakDots(h: Habit, log: HabitLog) {
  return Array.from({ length: 14 }, (_, i) => {
    const dStr = new Date(Date.now() - ((13 - i) * 86400000)).toISOString().slice(0, 10)
    const v = getLogValue(log, dStr, h.id)
    const filled = h.type === 'bool' ? !!v : v >= (h.goal || 1)
    const partial = !filled && v > 0
    return (
      <div
        key={i}
        className="flex-1 aspect-square rounded"
        style={{ background: filled ? h.color : partial ? h.color + '44' : 'rgba(255,255,255,0.05)', maxWidth: 18 }}
      />
    )
  })
}

export function HabitTodayCard({ habit, val, log, onToggle, onIncrement, onSetFull }: HabitTodayCardProps) {
  const isDone = habit.type === 'bool' ? !!val : val >= habit.goal
  const pctH = habit.type === 'count' ? Math.min(100, Math.round(val / habit.goal * 100)) : (isDone ? 100 : 0)
  const streakVal = calcStreak(habit, log, new Date())
  const btnColor = isDone ? '#52b788' : habit.color
  const btnBg = isDone ? 'rgba(82,183,136,0.12)' : habit.color + '22'

  return (
    <Card className="mb-2.5">
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
        onClick={() => onToggle(habit.id)}
      >
        <div
          className="w-11 h-11 rounded-[14px] flex items-center justify-center text-[22px] flex-shrink-0 relative"
          style={{ background: habit.color + '18', border: '1px solid ' + habit.color + '30' }}
        >
          {habit.emoji}
          {isDone && (
            <div className="absolute inset-0 rounded-[14px] bg-[#52b788]/85 flex items-center justify-center text-sm text-white">
              ✓
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-[var(--color-text)]">{habit.name}</div>
          <div className="text-xs text-[var(--color-sub)]">
            {habit.type === 'count' ? `${val}/${habit.goal} ${habit.unit}` : isDone ? '✓ Completado hoy' : 'Pendiente hoy'}
          </div>
        </div>
        <div className="flex flex-col items-center gap-0 flex-shrink-0">
          {streakVal >= 7 && <div className="text-sm leading-none mb-0.5">🔥</div>}
          <div className="font-serif text-[22px]" style={{ color: streakVal > 0 ? 'var(--color-yellow)' : 'var(--color-dim)' }}>
            {streakVal}
          </div>
          <div className="text-[9px] font-bold text-[var(--color-dim)] uppercase tracking-wider">racha</div>
        </div>
      </div>

      <div className="px-4 pb-3.5">
        <ProgressBar value={pctH} color={habit.color} height={6} animated />

        <div className="flex items-center gap-2 mt-2">
          {habit.type === 'count' ? (
            <>
              <button
                onClick={() => onIncrement(habit.id, -1)}
                className="w-9 h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-s2)] text-[var(--color-text)] text-base font-semibold flex items-center justify-center cursor-pointer active:bg-white/[0.08] flex-shrink-0"
              >−</button>
              <div className="flex-1 text-center font-serif text-lg text-[var(--color-text)]">
                {val}<span className="text-xs text-[var(--color-dim)]"> /{habit.goal}</span>
              </div>
              <button
                onClick={() => onIncrement(habit.id, 1)}
                className="w-9 h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-s2)] text-[var(--color-text)] text-base font-semibold flex items-center justify-center cursor-pointer active:bg-white/[0.08] flex-shrink-0"
              >+</button>
            </>
          ) : (
            <div className="flex-1" />
          )}
          <button
            onClick={() => habit.type === 'bool' ? onToggle(habit.id) : onSetFull(habit.id)}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold font-sans cursor-pointer flex-shrink-0 border"
            style={{ background: btnBg, color: btnColor, borderColor: btnColor + '33' }}
          >
            {isDone ? '✓ Hecho' : 'Marcar hecho'}
          </button>
        </div>
      </div>

      <div className="flex gap-1 px-4 pb-3.5">
        {streakDots(habit, log)}
      </div>
    </Card>
  )
}
