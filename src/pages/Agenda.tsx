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

  useEffect(() => { rollover() }, [])
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Date>).detail
      if (detail) { setSelDate(detail); setTab('day') }
    }
    window.addEventListener('agenda-pick-day', handler)
    return () => window.removeEventListener('agenda-pick-day', handler)
  }, [])

  const tabs = [
    { key: 'month' as const, label: 'Mes' },
    { key: 'tasks' as const, label: 'Planificación' },
    { key: 'day' as const, label: 'Día' },
    { key: 'shifts' as const, label: 'Turnos' },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="page-module" style={{ color: 'var(--color-acc-blue)' }}>Agenda</div>
        <div className="page-title">Planificación</div>
        <div className="tab-bar">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`tab-btn${tab === t.key ? ' active' : ''}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: 16 }}>
        {tab === 'month' && <Calendar />}
        {tab === 'tasks' && <WeekPlanner />}
        {tab === 'day' && <Timeline date={selDate} />}
        {tab === 'shifts' && <ShiftsManager />}
      </div>
    </div>
  )
}
