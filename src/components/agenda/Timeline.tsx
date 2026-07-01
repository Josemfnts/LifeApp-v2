import { useState } from 'react'
import { DAYS, MONTHS, COLOR_HEX, SHIFT_LABELS, SHIFT_COLORS, useAgendaStore } from '@/stores/agendaStore'
import { Input } from '@/components/ui'

interface TimelineProps {
  date: Date
}

export function Timeline({ date }: TimelineProps) {
  const getTasksForDate = useAgendaStore(s => s.getTasksForDate)
  const toggleTask = useAgendaStore(s => s.toggleTask)
  const addTask = useAgendaStore(s => s.addTask)
  const shifts = useAgendaStore(s => s.shifts)
  const dStr = date.toISOString().slice(0, 10)
  const [showForm, setShowForm] = useState(false)
  const [newText, setNewText] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newColor, setNewColor] = useState('blue')

  const allTasks = getTasksForDate(dStr)
  const done = allTasks.filter(t => t.done).length
  const total = allTasks.length
  const pct = total > 0 ? Math.round(done / total * 100) : 0
  const shift = shifts[dStr]

  const HOURS = Array.from({ length: 18 }, (_, i) => i + 6)

  const now = new Date()
  const nowH = now.getHours()
  const nowM = now.getMinutes()
  const isToday = dStr === new Date().toISOString().slice(0, 10)

  // Group tasks by hour
  const byHour: Record<number, { t: typeof allTasks[0]; idx: number }[]> = {}
  const unscheduled: { t: typeof allTasks[0]; idx: number }[] = []

  allTasks.forEach((t, idx) => {
    if (!t.time) { unscheduled.push({ t, idx }); return }
    const h = parseInt(t.time.split(':')[0])
    if (!byHour[h]) byHour[h] = []
    byHour[h].push({ t, idx })
  })

  function handleAdd() {
    if (!newText.trim()) return
    addTask(dStr, { text: newText.trim(), time: newTime, color: newColor, done: false })
    setNewText('')
    setNewTime('')
    setShowForm(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="font-serif text-lg text-[var(--color-text)]">
          {DAYS[date.getDay()]}, {date.getDate()} {MONTHS[date.getMonth()]}
        </div>
        <div className="text-xs text-[var(--color-sub)] font-medium">{date.getFullYear()}</div>
      </div>

      <div className="flex items-center gap-2.5 mb-3">
        <div className="flex-1 flex items-center gap-2.5 bg-[var(--color-s1)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5">
          <span className="text-base">🏭</span>
          <div>
            <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-wider">Turno</div>
            <div className="text-sm font-semibold" style={{ color: shift ? SHIFT_COLORS[shift] : 'var(--color-dim)' }}>
              {shift ? SHIFT_LABELS[shift] : '—'}
            </div>
          </div>
        </div>

        {total > 0 && (
          <div className="flex-[2] flex items-center gap-2.5 bg-[var(--color-s1)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5">
            <span className="text-xs font-semibold text-[var(--color-sub)] flex-shrink-0">{done}/{total}</span>
            <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-[#5b8af0] rounded-full transition-all duration-400" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-[#5b8af0] flex-shrink-0">{pct}%</span>
          </div>
        )}
      </div>

      {/* Add form */}
      <div className="mb-3">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-2.5 rounded-xl bg-[#5b8af0]/10 text-[#5b8af0] border border-[#5b8af0]/20 text-xs font-semibold font-sans cursor-pointer"
          >+ Añadir tarea</button>
        ) : (
          <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-3.5">
            <Input value={newText} onChange={setNewText} placeholder="¿Qué tienes que hacer?" className="mb-2" />
            <div className="flex gap-2 mb-2">
              <input
                type="time"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
                className="w-24 bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-2 py-2.5 text-sm font-sans outline-none text-center"
              />
              <select
                value={newColor}
                onChange={e => setNewColor(e.target.value)}
                className="flex-1 bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3 py-2.5 text-sm font-sans outline-none cursor-pointer"
              >
                {Object.entries(COLOR_HEX).map(([k]) => <option key={k} value={k}>{k}</option>)}
              </select>
              <button
                onClick={() => setShowForm(false)}
                className="px-3 py-2.5 rounded-xl bg-red-500/[0.08] text-[var(--color-red)] border border-red-500/[0.15] text-xs font-semibold font-sans cursor-pointer"
              >✕</button>
              <button
                onClick={handleAdd}
                className="w-11 h-11 rounded-xl bg-[#5b8af0] text-white text-xl font-semibold flex items-center justify-center cursor-pointer shadow-lg shadow-[#5b8af0]/25"
              >+</button>
            </div>
          </div>
        )}
      </div>

      <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2">Timeline</div>

      {/* Unscheduled / recurring tasks at top */}
      {unscheduled.length > 0 && (
        <div className="mb-2">
          {unscheduled.map(({ t, idx }) => (
            <div
              key={idx}
              onClick={() => toggleTask(dStr, idx)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg mb-1 cursor-pointer border-l-[3px] ${t.done ? 'opacity-45' : ''}`}
              style={{ background: (COLOR_HEX[t.color] || COLOR_HEX.blue) + '11', borderColor: COLOR_HEX[t.color] || COLOR_HEX.blue }}
            >
              <span className={`flex-1 text-[13px] font-medium ${t.done ? 'line-through text-[var(--color-dim)]' : 'text-[var(--color-text)]'}`}>
                {t.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Timeline hours */}
      <div className="relative">
        {HOURS.map(h => {
          const hourTasks = byHour[h] || []
          const isCurrent = isToday && h === nowH
          const label = h < 10 ? `0${h}:00` : `${h}:00`

          return (
            <div key={h} className={`flex items-start min-h-[52px] ${isCurrent ? 'bg-[#5b8af0]/[0.04] rounded-xl' : ''}`}>
              <div className="w-[42px] flex-shrink-0 text-right pr-2.5 pt-1 text-[11px] font-semibold text-[var(--color-dim)] sticky top-0">
                {h % 3 === 0 || hourTasks.length > 0 ? label : ''}
              </div>
              <div className="flex-1 min-w-0 border-l border-white/[0.06] pl-2 pb-0.5 relative">
                {isCurrent && (
                  <div className="absolute left-[-1px] right-0 h-0.5 bg-[#5b8af0] rounded z-10" style={{ top: `${Math.round(nowM / 60 * 52)}px` }}>
                    <div className="absolute left-[-5px] top-[-4px] w-[10px] h-[10px] rounded-full bg-[#5b8af0] shadow-[0_0_8px_rgba(91,138,240,0.6)]" />
                  </div>
                )}
                {hourTasks.map(({ t, idx }) => (
                  <div
                    key={idx}
                    onClick={() => toggleTask(dStr, idx)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg mb-1 cursor-pointer border-l-[3px] ${t.done ? 'opacity-45' : ''}`}
                    style={{ background: (COLOR_HEX[t.color] || COLOR_HEX.blue) + '11', borderColor: COLOR_HEX[t.color] || COLOR_HEX.blue }}
                  >
                    <span className={`flex-1 text-[13px] font-medium ${t.done ? 'line-through text-[var(--color-dim)]' : 'text-[var(--color-text)]'}`}>
                      {t.text}
                    </span>
                    <span className="text-[10px] font-semibold text-[var(--color-dim)] flex-shrink-0">{t.time}</span>
                    <button
                      onClick={e => { e.stopPropagation(); toggleTask(dStr, idx) }}
                      className={`w-[22px] h-[22px] rounded-md flex items-center justify-center text-[11px] cursor-pointer border flex-shrink-0 ${
                        t.done ? 'bg-[#166534] border-[#52b788] text-[#4ade80]' : 'border-[var(--color-border2)]'
                      }`}
                    >
                      {t.done ? '✓' : ''}
                    </button>
                  </div>
                ))}
                {hourTasks.length === 0 && (
                  <div className="py-2 text-[11px] text-white/[0.08]">·</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
