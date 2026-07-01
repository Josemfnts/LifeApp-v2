import { useState, useEffect } from 'react'
import { useAgendaStore } from '@/stores/agendaStore'
import { Calendar } from '@/components/agenda/Calendar'
import { WeekPlanner } from '@/components/agenda/WeekPlanner'
import { Timeline } from '@/components/agenda/Timeline'
import { ShiftsManager } from '@/components/agenda/ShiftsManager'

export default function Agenda() {
  const [tab, setTab] = useState<'month' | 'tasks' | 'day' | 'shifts'>('month')
  const [selDate, setSelDate] = useState(new Date())
  const rollover = useAgendaStore(s => s.rollover)

  useEffect(() => {
    rollover()
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Date>).detail
      if (detail) {
        setSelDate(detail)
        setTab('day')
      }
    }
    window.addEventListener('agenda-pick-day', handler)
    return () => window.removeEventListener('agenda-pick-day', handler)
  }, [])

  return (
    <div>
      <div className="pt-[52px] px-5 pb-0 border-b border-[var(--color-border)] bg-gradient-to-b from-[#0d0f13] to-[var(--color-bg)]">
        <div className="text-[11px] font-semibold text-[var(--color-acc-blue)] tracking-wide mb-1">Agenda</div>
        <div className="font-serif text-[26px] text-[var(--color-text)] leading-tight">Planificación</div>
        <div className="flex mt-0.5">
          {([
            { key: 'month', label: 'Mes' },
            { key: 'tasks', label: 'Planificación' },
            { key: 'day', label: 'Día' },
            { key: 'shifts', label: 'Turnos' },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-[13px] font-medium text-center cursor-pointer border-b-2 transition-all bg-transparent font-sans whitespace-nowrap ${
                tab === t.key ? 'text-[var(--color-acc-blue)] border-[var(--color-acc-blue)]' : 'text-[var(--color-dim)] border-transparent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {tab === 'month' && <Calendar />}
        {tab === 'tasks' && <WeekPlanner />}
        {tab === 'day' && <Timeline date={selDate} />}
        {tab === 'shifts' && <ShiftsManager />}
      </div>
    </div>
  )
}
