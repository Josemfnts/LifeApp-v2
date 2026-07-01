import { useState } from 'react'
import { useAgendaStore, SHIFT_COLORS, SHIFT_LABELS, MONTHS } from '@/stores/agendaStore'

export function ShiftsManager() {
  const shifts = useAgendaStore(s => s.shifts)
  const setShift = useAgendaStore(s => s.setShift)
  const [viewDate, setViewDate] = useState(new Date())
  const [bulkFrom, setBulkFrom] = useState('')
  const [bulkTo, setBulkTo] = useState('')

  function changeMonth(delta: number) {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  const y = viewDate.getFullYear()
  const m = viewDate.getMonth()
  const firstDow = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const start = firstDow === 0 ? 6 : firstDow - 1
  const today = new Date().toISOString().slice(0, 10)

  function handleBulkShift(type: string) {
    if (!bulkFrom || !bulkTo) return
    const from = new Date(bulkFrom + 'T00:00:00')
    const to = new Date(bulkTo + 'T00:00:00')
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const dStr = d.toISOString().slice(0, 10)
      setShift(dStr, type)
    }
  }

  const days: { d: number; dStr: string; isToday: boolean }[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const iter = new Date(y, m, d, 12)
    days.push({
      d,
      dStr: iter.toISOString().slice(0, 10),
      isToday: iter.toISOString().slice(0, 10) === today,
    })
  }

  return (
    <div>
      {/* Quick assign */}
      <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2.5">Asignar turno rápido</div>
      <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mb-3.5">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => changeMonth(-1)} className="w-[34px] h-[34px] rounded-xl bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-sub)] text-base flex items-center justify-center cursor-pointer">‹</button>
          <div className="font-serif text-xl text-[var(--color-text)]">{MONTHS[m]} {y}</div>
          <button onClick={() => changeMonth(1)} className="w-[34px] h-[34px] rounded-xl bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-sub)] text-base flex items-center justify-center cursor-pointer">›</button>
        </div>

        <div className="grid grid-cols-7 gap-[2px] mb-2.5">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-[var(--color-dim)] uppercase tracking-wider py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-[2px]">
          {Array.from({ length: start }, (_, i) => (
            <div key={`e${i}`} className="aspect-square" />
          ))}
          {days.map(({ d, dStr, isToday }) => {
            const shift = shifts[dStr]
            return shift ? (
              <div key={d} className="aspect-square rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ background: (SHIFT_COLORS[shift] || '#333') + '22', color: SHIFT_COLORS[shift], border: `1px solid ${(SHIFT_COLORS[shift] || '#333') + '44'}` }}>
                <div className="text-center">
                  <div className={isToday ? 'font-bold' : ''}>{d}</div>
                  <div className="text-[10px]">{shift}</div>
                </div>
              </div>
            ) : (
              <div
                key={d}
                onClick={() => {
                  const sel = prompt('Turno (TM, TT, TN, L):')
                  if (sel && ['TM', 'TT', 'TN', 'L'].includes(sel.toUpperCase())) {
                    setShift(dStr, sel.toUpperCase())
                  }
                }}
                className={`aspect-square rounded-lg flex items-center justify-center text-xs cursor-pointer transition-colors ${
                  isToday ? 'bg-[#5b8af0]/10 border border-[#5b8af0]/30 text-[#5b8af0]' : 'bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-dim)]'
                }`}
              >{d}</div>
            )
          })}
        </div>
      </div>

      {/* Bulk assign */}
      <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2.5">Asignar bloque de días</div>
      <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mb-3.5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-semibold text-[var(--color-dim)] w-8 flex-shrink-0">DE</span>
          <input
            type="date"
            value={bulkFrom}
            onChange={e => setBulkFrom(e.target.value)}
            className="flex-1 bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3 py-2 text-[13px] font-sans outline-none"
          />
        </div>
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-[11px] font-semibold text-[var(--color-dim)] w-8 flex-shrink-0">A</span>
          <input
            type="date"
            value={bulkTo}
            onChange={e => setBulkTo(e.target.value)}
            className="flex-1 bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3 py-2 text-[13px] font-sans outline-none"
          />
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {(['TM', 'TT', 'TN', 'L'] as const).map(type => (
            <button
              key={type}
              onClick={() => handleBulkShift(type)}
              className="py-2.5 rounded-xl text-[13px] font-bold font-sans cursor-pointer border"
              style={{
                background: (SHIFT_COLORS[type] || '#333') + '1a',
                color: SHIFT_COLORS[type],
                borderColor: (SHIFT_COLORS[type] || '#333') + '33',
              }}
            >{type}</button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-3.5">
        <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2.5">Leyenda</div>
        <div className="grid grid-cols-2 gap-2">
          {(['TM', 'TT', 'TN', 'L'] as const).map(type => (
            <div key={type} className="flex items-center gap-2 text-[13px]">
              <span className="text-[11px] font-bold rounded-md px-1.5 py-0.5 border" style={{ color: SHIFT_COLORS[type], background: (SHIFT_COLORS[type] || '#333') + '1a', borderColor: (SHIFT_COLORS[type] || '#333') + '33' }}>
                {type}
              </span>
              <span className="text-[var(--color-sub)]">{SHIFT_LABELS[type]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
