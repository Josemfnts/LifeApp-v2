import { useState } from 'react'
import { DAYS, MONTHS, SHIFT_COLORS, todayStr, useAgendaStore } from '@/stores/agendaStore'

export function Calendar() {
  const [viewDate, setViewDate] = useState(new Date())
  const tasks = useAgendaStore(s => s.tasks)
  const recurring = useAgendaStore(s => s.recurring)
  const shifts = useAgendaStore(s => s.shifts)

  function changeMonth(delta: number) {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  const y = viewDate.getFullYear()
  const m = viewDate.getMonth()
  const firstDow = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const start = firstDow === 0 ? 6 : firstDow - 1
  const today = todayStr()

  const days: { d: number; dStr: string; isToday: boolean; dotClass: string; shift: string | null }[] = []

  for (let d = 1; d <= daysInMonth; d++) {
    const iter = new Date(y, m, d, 12, 0, 0)
    const dStr = iter.toISOString().slice(0, 10)
    const dow = iter.getDay()
    const isToday = dStr === today
    const shift = shifts[dStr] || null

    let dotClass = ''
    const cols: string[] = []
    if (recurring[dow]) recurring[dow].forEach(r => cols.push(r.color))
    if (tasks[dStr]) tasks[dStr].filter(t => !t.done).forEach(t => cols.push(t.color))
    if (cols.includes('red')) dotClass = 'dot-red'
    else if (cols.includes('purple')) dotClass = 'dot-purple'
    else if (cols.includes('yellow')) dotClass = 'dot-yellow'
    else if (cols.includes('green')) dotClass = 'dot-green'
    else if (cols.length > 0) dotClass = 'dot-blue'

    days.push({ d, dStr, isToday, dotClass, shift })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3.5">
        <button onClick={() => changeMonth(-1)} className="w-[34px] h-[34px] rounded-xl bg-[var(--color-s1)] border border-[var(--color-border)] text-[var(--color-sub)] text-base flex items-center justify-center cursor-pointer active:bg-[var(--color-s2)]">‹</button>
        <div className="font-serif text-xl text-[var(--color-text)]">{MONTHS[m]} {y}</div>
        <button onClick={() => changeMonth(1)} className="w-[34px] h-[34px] rounded-xl bg-[var(--color-s1)] border border-[var(--color-border)] text-[var(--color-sub)] text-base flex items-center justify-center cursor-pointer active:bg-[var(--color-s2)]">›</button>
      </div>

      <div className="grid grid-cols-7 mb-1.5">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-[var(--color-dim)] uppercase tracking-wider py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-[2px]">
        {Array.from({ length: start }, (_, i) => (
          <div key={`e${i}`} className="aspect-square bg-[var(--color-s1)] border border-[var(--color-border)] rounded-xl opacity-18 pointer-events-none" />
        ))}
        {days.map(({ d, dStr, isToday, dotClass, shift }) => (
          <div
            key={d}
            onClick={() => {
              const selDay = new Date(y, m, d, 12)
              const ev = new CustomEvent('agenda-pick-day', { detail: selDay })
              window.dispatchEvent(ev)
            }}
            className={`aspect-square relative w-full bg-[var(--color-s1)] rounded-xl border flex flex-col items-center justify-center text-[13px] font-medium cursor-pointer transition-all active:scale-93 ${
              isToday ? 'border-[#5b8af0]/35 bg-[#5b8af0]/10 text-[#5b8af0] font-bold' : 'border-[var(--color-border)] text-[var(--color-sub)]'
            }`}
          >
            <div className="text-xs leading-none">{d}</div>
            {shift && (
              <div className="text-[8px] font-bold mt-0.5 leading-none" style={{ color: SHIFT_COLORS[shift] || '#8a8d96' }}>
                {shift}
              </div>
            )}
            {dotClass && (
              <div className={`absolute bottom-1 w-1 h-1 rounded-full ${
                dotClass === 'dot-red' ? 'bg-[#e05f5f]' :
                dotClass === 'dot-purple' ? 'bg-[#9b7fe0]' :
                dotClass === 'dot-yellow' ? 'bg-[#c9a84c]' :
                dotClass === 'dot-green' ? 'bg-[#52b788]' : 'bg-[#5b8af0]'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
