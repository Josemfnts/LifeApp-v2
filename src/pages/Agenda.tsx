import { useState, useMemo, useEffect, type ReactNode } from 'react'
import { useAgendaStore, DAYS, MONTHS, COLOR_HEX, SHIFT_COLORS, SHIFT_LABELS, PRIORITY_COLORS } from '@/stores/agendaStore'
import { useToast } from '@/stores/toast'
import { Input } from '@/components/ui'
import { KanbanView } from '@/components/agenda/KanbanView'
import { PlanesView } from '@/components/agenda/PlanesView'
import { useNavigate } from 'react-router-dom'
import Pomodoro from '@/pages/Pomodoro'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import '@/styles/agenda.css'

export default function Agenda() {
  const [tab, setTab] = useState<'month' | 'week' | 'day' | 'shifts' | 'stats' | 'kanban' | 'planes' | 'notas' | 'pomodoro' | 'diario'>('month')
  const [selDate, setSelDate] = useState(new Date())
  const [openTurnos, setOpenTurnos] = useState(false)
  const [openSemana, setOpenSemana] = useState(false)
  const navigate = useNavigate()
  const rollover = useAgendaStore(s => s.rollover)
  useEffect(() => { rollover() }, [])
  useEffect(() => {
    const h = (e: Event) => { const d = (e as CustomEvent<Date>).detail; if (d) { setSelDate(d); setTab('day') } }
    window.addEventListener('agenda-pick-day', h)
    return () => window.removeEventListener('agenda-pick-day', h)
  }, [])
  return (
    <div>
      <div className="page-header agenda-head">
        <div className="page-title agenda-title">Agenda</div>
        <div className="agenda-sub">Organiza tu día</div>
      <div className="agenda-tabs-row">
        <div className="tab-bar">
          {/* 'day' se abre tocando un día del calendario (sin pestaña). Turnos y Semana viven
              dentro de 'Mes'. Diario vive dentro de Notas. 'pomodoro' desactivado: el componente
              y el render siguen abajo para reactivarlo fácil. */}
          {(['month','stats','kanban','planes','notas'] as const).map(t => (
            <button key={t} onClick={() => t === 'notas' ? navigate('/notas') : setTab(t)} className={`tab-btn${tab === t ? ' active' : ''}`}>
              {{month:'Mes',week:'Semana',day:'Día',shifts:'Turnos',stats:'Stats',kanban:'Kanban',planes:'Planes',notas:'Notas',pomodoro:'🍅',diario:'📝'}[t]}
            </button>
          ))}
        </div>
      </div>
      </div>
      <div key={tab} className="animate-tab" style={{ padding: '8px 16px 16px' }}>
        {tab === 'month' && (
          // Calendario + filas plegables (Turnos / Semana).
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <CalendarView onPick={(d: Date) => { setSelDate(d); setTab('day') }} />
            <DaySummary date={selDate} onOpen={() => setTab('day')} />
            <CollapsibleRow title="Turnos" hint={openTurnos ? 'Cerrar' : 'Editar'} open={openTurnos} onToggle={() => setOpenTurnos(v => !v)}>
              <ShiftsView />
            </CollapsibleRow>
            <CollapsibleRow title="Semana" hint={openSemana ? 'Cerrar' : 'Ver'} open={openSemana} onToggle={() => setOpenSemana(v => !v)}>
              <WeekView />
            </CollapsibleRow>
          </div>
        )}
        {tab === 'day' && <DayView date={selDate} />}
        {tab === 'stats' && <StatsView />}
        {tab === 'kanban' && <KanbanView />}
        {tab === 'planes' && <PlanesView />}
        {tab === 'pomodoro' && <Pomodoro />}
      </div>
    </div>
  )
}

/* ── Fila plegable (Turnos / Semana dentro de Mes) ── */
function CollapsibleRow({ title, hint, open, onToggle, children }: { title: string; hint?: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div style={{ marginTop: 12 }}>
      <button onClick={onToggle} className="agenda-fold">
        <span>{title}</span>
        <span className="agenda-fold-hint">{hint}{open ? ' ▴' : ' ▾'}</span>
      </button>
      {open && <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  )
}

/* ── CALENDAR ── */
function CalendarView({ onPick }: { onPick: (d: Date) => void }) {
  const [viewDate, setViewDate] = useState(new Date())
  const tasks = useAgendaStore(s => s.tasks)
  const recurring = useAgendaStore(s => s.recurring)
  const shifts = useAgendaStore(s => s.shifts)
  const y = viewDate.getFullYear(); const m = viewDate.getMonth()
  const firstDow = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const start = firstDow === 0 ? 6 : firstDow - 1
  const today = new Date().toISOString().slice(0, 10)
  const days: { d: number; dStr: string; isToday: boolean; dotColors: string[]; shift: string | null; taskCount: number }[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const iter = new Date(y, m, d, 12, 0, 0)
    const dStr = iter.toISOString().slice(0, 10)
    const dow = iter.getDay()
    const cols: string[] = []
    if (recurring[dow]) recurring[dow].forEach(r => cols.push(r.color))
    if (tasks[dStr]) tasks[dStr].filter(t => !t.done).forEach(t => cols.push(t.color))
    days.push({ d, dStr, isToday: dStr === today, dotColors: [...new Set(cols)], shift: shifts[dStr] || null, taskCount: (tasks[dStr] || []).length })
  }
  return (
    <div>
      <div className="cal-card">
        <div className="cal-head">
          <button
            onClick={() => setViewDate(p => new Date(p.getFullYear(), p.getMonth() - 1, 1))}
            className="cal-nav-btn"
            aria-label="Mes anterior"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <div className="cal-title">{MONTHS[m]} <span className="cal-title-year">{y}</span></div>
          <button
            onClick={() => setViewDate(p => new Date(p.getFullYear(), p.getMonth() + 1, 1))}
            className="cal-nav-btn"
            aria-label="Mes siguiente"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
        <div className="cal-dow-row">
          {['L','M','X','J','V','S','D'].map(d => <div key={d} className="cal-dow">{d}</div>)}
        </div>
        <div className="cal-grid">
          {Array.from({ length: start }, (_, i) => <div key={`e${i}`} className="cal-cell empty" aria-hidden="true" />)}
          {days.map(({ d, isToday, dotColors, shift, taskCount }) => (
            <button
              key={d}
              onClick={() => onPick(new Date(y, m, d, 12))}
              className={`cal-cell${isToday ? ' today' : ''}${shift ? ` shift-${shift}` : ''}`}
              aria-label={`${d} de ${MONTHS[m]}${shift ? `, turno ${shift}` : ''}${taskCount ? `, ${taskCount} tareas` : ''}`}
            >
              <span className="cal-cell-num">{d}</span>
              {shift && <span className="cal-shift-code">{shift}</span>}
              {dotColors.length > 0 && (
                <span className="cal-cell-dots" aria-hidden="true">
                  {dotColors.slice(0, 3).map(c => <span key={c} className="cal-dot" style={{ background: COLOR_HEX[c] || '#8a8d96' }} />)}
                </span>
              )}
              {taskCount > 3 && <span className="cal-cell-count" aria-hidden="true">{taskCount}</span>}
            </button>
          ))}
        </div>
        <div className="cal-legend" aria-label="Leyenda de turnos">
          <div className="cal-legend-item"><span className="cal-legend-dot L" /><span><span className="cal-legend-code">L</span> Libre</span></div>
          <div className="cal-legend-item"><span className="cal-legend-dot TM" /><span><span className="cal-legend-code">TM</span> Mañana</span></div>
          <div className="cal-legend-item"><span className="cal-legend-dot TT" /><span><span className="cal-legend-code">TT</span> Tarde</span></div>
          <div className="cal-legend-item"><span className="cal-legend-dot TN" /><span><span className="cal-legend-code">TN</span> Noche</span></div>
        </div>
      </div>
    </div>
  )
}

/* ── Resumen del día bajo el calendario ── */
function DaySummary({ date, onOpen }: { date: Date; onOpen: () => void }) {
  const { tasks, recurring } = useAgendaStore()
  const dStr = date.toISOString().slice(0, 10)
  const direct = tasks[dStr] || []
  const dow = date.getDay()
  const recs = (recurring[dow] || []).filter(r => !direct.some(t => t.text === r.text && t.fromRecurring))
  const events = [
    ...direct.map(t => ({ text: t.text, time: t.time, color: t.color, key: `d${direct.indexOf(t)}`, done: t.done })),
    ...recs.map((r, i) => ({ text: r.text, time: r.time || '', color: r.color, key: `r${i}`, done: false })),
  ].filter(e => !e.done)
  const dateLabel = `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`
  return (
    <div className="day-summary">
      <div className="day-summary-head">
        <span className="day-summary-bar" aria-hidden="true" />
        <div className="day-summary-title">{dateLabel}</div>
        <div className="day-summary-count">{events.length} {events.length === 1 ? 'evento' : 'eventos'}</div>
      </div>
      <div className="day-summary-events">
        {events.length === 0 ? (
          <div className="day-summary-empty">Sin eventos. Toca un día del mes o abre el día para añadir tareas.</div>
        ) : events.slice(0, 4).map(ev => (
          <button key={ev.key} className="day-summary-event" onClick={onOpen} aria-label={`Abrir día ${dateLabel}: ${ev.text}`}>
            <span className="day-summary-event-dot" style={{ background: COLOR_HEX[ev.color] || '#8a8d96' }} aria-hidden="true" />
            <span className="day-summary-event-body">
              <div className="day-summary-event-text">{ev.text}</div>
            </span>
            {ev.time && <span className="day-summary-event-time">{ev.time}</span>}
          </button>
        ))}
        {events.length > 4 && (
          <button className="day-summary-event" onClick={onOpen}>
            <span className="day-summary-event-body">
              <div className="day-summary-event-text" style={{ color: 'var(--color-sub)' }}>+ {events.length - 4} más</div>
            </span>
          </button>
        )}
      </div>
    </div>
  )
}

/* ── WEEK VIEW ── */
function WeekView() {
  const { tasks, recurring, pending, addRecurring, removeRecurring, addPending, removePending, addTask } = useAgendaStore()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const order = [1, 2, 3, 4, 5, 6, 0]

  // Build this week's days
  const today = new Date()
  const weekDays = useMemo(() => {
    const monday = new Date(today)
    monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1))
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d
    })
  }, [today.getDate()])

  // Pending section
  const [pText, setPText] = useState('')
  const pColor = 'blue'
  const [pPriority, setPPriority] = useState('')

  // Recurring section
  const [rText, setRText] = useState('')
  const [rDay, setRDay] = useState('1')
  const rColor = 'blue'
  const [rTime, setRTime] = useState('')
  const [subTab, setSubTab] = useState<'pending' | 'recurring'>('pending')

  function handleAddPending() { if (!pText.trim()) return; addPending({ text: pText.trim(), color: pColor, priority: pPriority }); setPText(''); toast.show('✓ Tarea pendiente añadida') }
  function handleAddRecurring() { if (!rText.trim()) return; addRecurring(+rDay, { text: rText.trim(), color: rColor, time: rTime }); setRText(''); setRTime(''); toast.show('✓ Tarea fija añadida') }

  // Filtered pending
  const filteredPending = search.trim()
    ? pending.filter(p => p.text.toLowerCase().includes(search.toLowerCase()))
    : pending

  return (
    <div className="agenda-section">
      {/* Search */}
      <Input value={search} onChange={setSearch} placeholder="Buscar en pendientes" className="mb-4" />

      {/* Sub tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <button onClick={() => setSubTab('pending')} style={{ flex: 1, padding: '10px 4px', borderRadius: 10, fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-sans)', cursor: 'pointer', border: '1px solid', background: subTab === 'pending' ? 'color-mix(in srgb, var(--color-acc-blue) 14%, transparent)' : 'transparent', color: subTab === 'pending' ? 'var(--color-acc-blue)' : 'var(--color-dim)', borderColor: subTab === 'pending' ? 'color-mix(in srgb, var(--color-acc-blue) 30%, transparent)' : 'var(--color-border)' }}>Pendientes ({filteredPending.length})</button>
        <button onClick={() => setSubTab('recurring')} style={{ flex: 1, padding: '10px 4px', borderRadius: 10, fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-sans)', cursor: 'pointer', border: '1px solid', background: subTab === 'recurring' ? 'color-mix(in srgb, var(--color-acc-blue) 14%, transparent)' : 'transparent', color: subTab === 'recurring' ? 'var(--color-acc-blue)' : 'var(--color-dim)', borderColor: subTab === 'recurring' ? 'color-mix(in srgb, var(--color-acc-blue) 30%, transparent)' : 'var(--color-border)' }}>Fijas</button>
      </div>

      {subTab === 'pending' && (
        <>
          <div style={{ background: 'var(--color-s2)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div className="sec-label" style={{ marginBottom: 10 }}>Nueva tarea pendiente</div>
            <Input value={pText} onChange={setPText} placeholder="¿Qué tienes que hacer?" className="mb-3" />
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {[{ v: 'high', l: 'Alta' }, { v: 'medium', l: 'Media' }, { v: 'low', l: 'Baja' }].map(p => (
                <button key={p.v} onClick={() => setPPriority(pPriority === p.v ? '' : p.v)} style={{ flex: 1, padding: '8px 4px', borderRadius: 9, fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', border: '1px solid', background: pPriority === p.v ? PRIORITY_COLORS[p.v] + '22' : 'var(--color-s1)', color: pPriority === p.v ? PRIORITY_COLORS[p.v] : 'var(--color-dim)', borderColor: pPriority === p.v ? PRIORITY_COLORS[p.v] + '44' : 'var(--color-border)' }}>{p.l}</button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={handleAddPending} className="btn-ghost" style={{ fontSize: 13 }}>Dejar pendiente</button>
              <button onClick={() => { if (!pText.trim()) return; addTask(new Date().toISOString().slice(0, 10), { text: pText.trim(), time: '', color: pColor, done: false, priority: pPriority || undefined }); setPText(''); toast.show('✓ Tarea añadida a hoy') }} className="btn-primary" style={{ fontSize: 13 }}>Añadir a hoy</button>
            </div>
          </div>

          {filteredPending.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, fontSize: 13, color: 'var(--color-dim)' }}>Sin tareas pendientes.</div>
          ) : filteredPending.map((p, i) => (
            <div key={i} style={{ background: 'var(--color-s2)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: COLOR_HEX[p.color] || '#8a8d96' }} />
              {p.priority && <span style={{ fontSize: 10, fontWeight: 700, color: PRIORITY_COLORS[p.priority], background: PRIORITY_COLORS[p.priority] + '18', borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>{p.priority === 'high' ? 'Alta' : p.priority === 'medium' ? 'Media' : 'Baja'}</span>}
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>{p.text}</span>
              <button onClick={() => { addTask(new Date().toISOString().slice(0, 10), { text: p.text, time: '', color: p.color, done: false, priority: p.priority }); removePending(i); toast.show('→ Movida a hoy') }} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', background: 'rgba(82,183,136,0.1)', color: 'var(--color-acc-green)', border: '1px solid rgba(82,183,136,0.2)' }}>→ Hoy</button>
              <button onClick={() => { removePending(i); toast.show('Eliminada') }} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(224,95,95,0.08)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.15)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
            </div>
          ))}

          {/* Weekly task view */}
          <div className="agenda-section-title" style={{ marginTop: 20, marginBottom: 10 }}>Vista rápida de la semana</div>
          {weekDays.map((d, i) => {
            const dStr = d.toISOString().slice(0, 10)
            const dayTasks = tasks[dStr] || []
            return (
              <details key={i} className="agenda-week-day" open={dayTasks.length > 0}>
              <summary className="agenda-section-row">
                <div className="agenda-section-dot" style={{ background: 'var(--color-acc-blue)' }} aria-hidden="true" />
                <span className="agenda-section-name">{DAYS[d.getDay()].slice(0, 3)} {d.getDate()}</span>
                <span className="agenda-section-meta">
                  {dayTasks.length > 0 ? `${dayTasks.filter(t => t.done).length}/${dayTasks.length} hechas` : '—'}
                </span>
              </summary>
              {dayTasks.map((task, taskIdx) => (
                <div key={taskIdx} className="agenda-week-task">
                  <span style={{ flex: 1, textDecoration: task.done ? 'line-through' : 'none', color: task.done ? 'var(--color-dim)' : 'var(--color-text)' }}>{task.text}</span>
                  {task.priority && <span style={{ color: PRIORITY_COLORS[task.priority] }}>{task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}</span>}
                </div>
              ))}
              </details>
            )
          })}
        </>
      )}

      {subTab === 'recurring' && (
        <>
          <div style={{ background: 'var(--color-s2)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div className="sec-label" style={{ marginBottom: 10 }}>Nueva tarea fija</div>
            <Input value={rText} onChange={setRText} placeholder="Tarea fija..." className="mb-2" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <select className="inp" value={rDay} onChange={e => setRDay(e.target.value)} style={{ marginBottom: 0 }}>{DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}</select>
              <input className="inp" value={rTime} onChange={e => setRTime(e.target.value)} type="time" placeholder="Hora" style={{ marginBottom: 0 }} />
            </div>
            <button onClick={handleAddRecurring} className="btn-ghost">+ Añadir tarea fija</button>
          </div>
          {order.map(dow => {
            const rt = recurring[dow] || []
            if (!rt.length) return null
            return (
              <div key={dow} style={{ background: 'var(--color-s2)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '12px 14px', marginBottom: 8 }}>
                <div className="agenda-section-title" style={{ marginBottom: 6 }}>{DAYS[dow]}</div>
                {rt.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: COLOR_HEX[t.color] || '#8a8d96' }} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>{t.text}</span>
                    {t.time && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-dim)' }}>{t.time}</span>}
                    <button onClick={() => { removeRecurring(dow, i); toast.show('Eliminada') }} style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(224,95,95,0.08)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.15)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

/* ── DAY VIEW ── */
function DayView({ date }: { date: Date }) {
  const { getTasksForDate, toggleTask, toggleSubtask, addTask, updateTask, removeTask, moveTask, materializeRecurring, shifts } = useAgendaStore()
  const toast = useToast()
  const dStr = date.toISOString().slice(0, 10)
  const allTasks = getTasksForDate(dStr)
  const done = allTasks.filter(t => t.done).length
  const total = allTasks.length
  const pct = total > 0 ? Math.round(done / total * 100) : 0
  const shift = shifts[dStr]
  const [showForm, setShowForm] = useState(false)
  const [newText, setNewText] = useState('')
  const [newTime, setNewTime] = useState('')
  const newColor = 'blue'
  const [newPriority, setNewPriority] = useState('')
  const [newSubtasks, setNewSubtasks] = useState<string[]>([])
  const [subInput, setSubInput] = useState('')
  const [editingNotes, setEditingNotes] = useState<number | null>(null)
  const [noteText, setNoteText] = useState('')

  // Move target date picker
  const [moveModal, setMoveModal] = useState<{ idx: number } | null>(null)
  const [moveDate, setMoveDate] = useState('')

  // Template save/load modals
  const [templateNameModal, setTemplateNameModal] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [loadTemplateModal, setLoadTemplateModal] = useState(false)

  const HOURS = Array.from({ length: 18 }, (_, i) => i + 6)
  const now = new Date(); const nowH = now.getHours(); const nowM = now.getMinutes()
  const isToday = dStr === new Date().toISOString().slice(0, 10)

  const byHour: Record<number, typeof allTasks> = {}
  const unscheduled: typeof allTasks = []
  allTasks.forEach(t => { if (!t.time) { unscheduled.push(t); return }; const h = parseInt(t.time.split(':')[0]); if (!byHour[h]) byHour[h] = []; byHour[h].push(t) })

  function handleAdd() { if (!newText.trim()) return; const task = { text: newText.trim(), time: newTime, color: newColor, done: false, priority: newPriority || undefined, subtasks: newSubtasks.length > 0 ? newSubtasks.map(s => ({ text: s, done: false })) : undefined }; addTask(dStr, task); setNewText(''); setNewTime(''); setNewSubtasks([]); setShowForm(false); toast.show('✓ Tarea añadida') }

  function openSaveTemplate() {
    const dayTasks = getTasksForDate(dStr)
    if (!dayTasks.length) { toast.show('No hay tareas para guardar'); return }
    setTemplateName(`Día ${date.getDate()}/${date.getMonth() + 1}`)
    setTemplateNameModal(true)
  }

  function confirmSaveTemplate() {
    if (!templateName.trim()) return
    const dayTasks = getTasksForDate(dStr).map(t => ({
      text: t.text, time: t.time, color: t.color, priority: t.priority,
      subtasks: t.subtasks?.map(s => ({ text: s.text, done: false })),
    }))
    const templates = JSON.parse(localStorage.getItem('agenda_templates') || '[]')
    templates.push({ name: templateName.trim(), date: dStr, tasks: dayTasks })
    localStorage.setItem('agenda_templates', JSON.stringify(templates))
    setTemplateNameModal(false)
    toast.show('✓ Plantilla guardada')
  }

  function openLoadTemplate() {
    const templates = JSON.parse(localStorage.getItem('agenda_templates') || '[]')
    if (!templates.length) { toast.show('No hay plantillas guardadas'); return }
    setLoadTemplateModal(true)
  }

  function applyTemplate(t: { name: string; tasks: { text: string; time: string; color: string; priority?: string; subtasks?: { text: string; done: boolean }[] }[] }) {
    t.tasks.forEach(task => addTask(dStr, { ...task, done: false }))
    setLoadTemplateModal(false)
    toast.show(`✓ Plantilla "${t.name}" cargada`)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 1); window.dispatchEvent(new CustomEvent('agenda-pick-day', { detail: d })) }} className="cal-nav-btn" aria-label="Día anterior">
          <ChevronLeft aria-hidden="true" />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--color-text)' }}>{DAYS[date.getDay()]}, {date.getDate()} {MONTHS[date.getMonth()]}</div>
          <div style={{ fontSize: 11, color: 'var(--color-sub)' }}>
            {date.getFullYear()}
            {shift && <span style={{ marginLeft: 8, color: SHIFT_COLORS[shift], fontWeight: 700 }}>· {SHIFT_LABELS[shift]}</span>}
          </div>
        </div>
        <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 1); window.dispatchEvent(new CustomEvent('agenda-pick-day', { detail: d })) }} className="cal-nav-btn" aria-label="Día siguiente">
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

      {total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '10px 14px' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-sub)' }}>{done}/{total}</span>
          <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}><div style={{ height: '100%', background: 'var(--color-acc-blue)', borderRadius: 99, transition: 'width 0.4s', width: `${pct}%` }} /></div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-acc-blue)' }}>{pct}%</span>
        </div>
      )}

      {!showForm ? (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={() => setShowForm(true)} className="btn-primary" style={{ flex: 1, fontSize: 14 }}>+ Añadir tarea</button>
          <button onClick={openSaveTemplate} style={{ padding: '11px 14px', borderRadius: 14, background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-dim)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }} aria-label="Guardar plantilla">💾</button>
          <button onClick={openLoadTemplate} style={{ padding: '11px 14px', borderRadius: 14, background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-dim)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }} aria-label="Cargar plantilla">📂</button>
        </div>
      ) : (
        <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 14, marginBottom: 12 }}>
          <Input value={newText} onChange={setNewText} placeholder="¿Qué tienes que hacer?" className="mb-2" />
          <input className="inp" value={newTime} onChange={e => setNewTime(e.target.value)} type="time" style={{ marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {[{ v: 'high', l: 'Alta' }, { v: 'medium', l: 'Media' }, { v: 'low', l: 'Baja' }].map(p => (
              <button key={p.v} onClick={() => setNewPriority(p.v)} style={{ flex: 1, padding: '5px 4px', borderRadius: 6, fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', border: '1px solid', background: newPriority === p.v ? PRIORITY_COLORS[p.v] + '22' : 'var(--color-s2)', color: newPriority === p.v ? PRIORITY_COLORS[p.v] : 'var(--color-dim)', borderColor: newPriority === p.v ? PRIORITY_COLORS[p.v] + '44' : 'var(--color-border)' }}>{p.l}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input className="inp" value={subInput} onChange={e => setSubInput(e.target.value)} placeholder="Subtarea..." style={{ marginBottom: 0 }} />
            <button onClick={() => { if (subInput.trim()) { setNewSubtasks(p => [...p, subInput.trim()]); setSubInput('') } }} style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(155,127,224,0.1)', color: 'var(--color-acc-purple)', border: '1px solid rgba(155,127,224,0.2)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>+</button>
          </div>
          {newSubtasks.length > 0 && <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>{newSubtasks.map((s, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-sub)' }}><span>◦ {s}</span><button onClick={() => setNewSubtasks(p => p.filter((_, ii) => ii !== i))} style={{ color: 'var(--color-dim)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 10 }}>✕</button></div>)}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowForm(false)} style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(224,95,95,0.08)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.15)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>✕ Cancelar</button>
            <button onClick={handleAdd} className="btn-primary" style={{ flex: 1, fontSize: 14 }}>+ Añadir</button>
          </div>
        </div>
      )}

      <div className="sec-label" style={{ marginBottom: 8 }}>Timeline</div>

      {/* Unscheduled + overdue */}
      {unscheduled.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {unscheduled.map(t => (
            <TaskItem key={t._rec ? `r${t.text}` : `d${t._dir}`} task={t} date={dStr} />
          ))}
        </div>
      )}

      {/* Hours */}
      {HOURS.map(h => {
        const hTasks = byHour[h] || []
        const isCurrent = isToday && h === nowH
        return (
          <div key={h} style={{ display: 'flex', alignItems: 'flex-start', minHeight: 52, background: isCurrent ? 'rgba(91,138,240,0.04)' : 'transparent', borderRadius: 10 }}>
            <div style={{ width: 42, flexShrink: 0, textAlign: 'right', paddingRight: 10, paddingTop: 4, fontSize: 11, fontWeight: 600, color: 'var(--color-dim)' }}>{h % 3 === 0 || hTasks.length > 0 ? `${h < 10 ? '0' + h : h}:00` : ''}</div>
            <div style={{ flex: 1, minWidth: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: 8, paddingBottom: 2, position: 'relative' }}>
              {isCurrent && <div style={{ position: 'absolute', left: -1, right: 0, height: 2, background: 'var(--color-acc-blue)', borderRadius: 1, zIndex: 2, top: `${Math.round(nowM / 60 * 52)}px` }}><div style={{ position: 'absolute', left: -5, top: -4, width: 10, height: 10, borderRadius: '50%', background: 'var(--color-acc-blue)', boxShadow: '0 0 8px rgba(91,138,240,0.6)' }} /></div>}
              {hTasks.map(t => (
                <TaskItem key={t._rec ? `r${t.text}` : `d${t._dir}`} task={t} date={dStr} />
              ))}
              {hTasks.length === 0 && <div style={{ padding: '8px 0', fontSize: 11, color: 'rgba(255,255,255,0.08)' }}>·</div>}
            </div>
          </div>
        )
      })}

      {/* Notes modal */}
      {editingNotes !== null && (
        <div onClick={e => { if (e.target === e.currentTarget) setEditingNotes(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 40px' }}>
            <div style={{ width: 36, height: 4, background: 'var(--color-border2)', borderRadius: 99, margin: '0 auto 16px' }} />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 12 }}>Notas</div>
            <textarea className="inp" value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Notas de la tarea..." style={{ height: 120, resize: 'none', fontFamily: 'var(--font-sans)', fontSize: 14 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              <button onClick={() => setEditingNotes(null)} className="btn-ghost" style={{ width: '100%' }}>Cancelar</button>
              <button onClick={() => { updateTask(dStr, editingNotes, { notes: noteText }); setEditingNotes(null); toast.show('✓ Notas guardadas') }} className="btn-primary" style={{ width: 'auto' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Save template modal */}
      {templateNameModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setTemplateNameModal(false) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 40px' }}>
            <div style={{ width: 36, height: 4, background: 'var(--color-border2)', borderRadius: 99, margin: '0 auto 16px' }} />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 12 }}>Guardar plantilla</div>
            <input className="inp" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Nombre de la plantilla" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              <button onClick={() => setTemplateNameModal(false)} className="btn-ghost" style={{ width: '100%' }}>Cancelar</button>
              <button onClick={confirmSaveTemplate} className="btn-primary" style={{ width: 'auto' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Load template modal */}
      {loadTemplateModal && (() => {
        const templates: { name: string; date: string; tasks: { text: string; time: string; color: string; priority?: string; subtasks?: { text: string; done: boolean }[] }[] }[] = JSON.parse(localStorage.getItem('agenda_templates') || '[]')
        return (
          <div onClick={e => { if (e.target === e.currentTarget) setLoadTemplateModal(false) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 40px', maxHeight: '70dvh', overflowY: 'auto' }}>
              <div style={{ width: 36, height: 4, background: 'var(--color-border2)', borderRadius: 99, margin: '0 auto 16px' }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 12 }}>Cargar plantilla</div>
              {templates.map((t, i) => (
                <button key={i} onClick={() => applyTemplate(t)} style={{ width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 10, background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-sans)', cursor: 'pointer', marginBottom: 8 }}>
                  {t.name} <span style={{ fontSize: 11, color: 'var(--color-dim)' }}>· {t.tasks.length} tareas</span>
                </button>
              ))}
              <button onClick={() => setLoadTemplateModal(false)} className="btn-ghost" style={{ width: '100%', marginTop: 4 }}>Cancelar</button>
            </div>
          </div>
        )
      })()}

      {/* Move task modal */}
      {moveModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setMoveModal(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 40px' }}>
            <div style={{ width: 36, height: 4, background: 'var(--color-border2)', borderRadius: 99, margin: '0 auto 16px' }} />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 12 }}>Mover tarea</div>
            <input className="inp" value={moveDate} onChange={e => setMoveDate(e.target.value)} type="date" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              <button onClick={() => setMoveModal(null)} className="btn-ghost" style={{ width: '100%' }}>Cancelar</button>
              <button onClick={() => { if (moveDate) { moveTask(dStr, moveModal.idx, moveDate); toast.show('✓ Tarea movida') }; setMoveModal(null) }} className="btn-primary" style={{ width: 'auto' }}>Mover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function TaskItem({ task: t, date: d }: { task: import('@/stores/agendaStore').DayTask; date: string }) {
    const [expanded, setExpanded] = useState(false)
    const isRec = !!t._rec
    const dir = t._dir ?? -1
    const hasSubtasks = !isRec && t.subtasks && t.subtasks.length > 0
    const col = COLOR_HEX[t.color] || 'var(--color-acc-blue)'

    function handleToggle() {
      if (isRec) { materializeRecurring(d, t); toast.show('✓ Hecho') }
      else toggleTask(d, dir)
    }

    return (
      <div style={{ marginBottom: 4 }}>
        <div
          onClick={handleToggle}
          style={{
            borderRadius: 8, padding: '6px 10px',
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            background: `color-mix(in srgb, ${col} 7%, transparent)`, opacity: t.done ? 0.45 : 1, transition: 'opacity 0.15s',
          }}>
          <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: col, flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: t.done ? 'var(--color-dim)' : 'var(--color-text)', textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</div>
          {isRec && <span title="Tarea fija" style={{ fontSize: 10, color: 'var(--color-dim)' }}>🔄</span>}
          {t.priority && <span style={{ fontSize: 10, color: PRIORITY_COLORS[t.priority] }}>{t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '🟢'}</span>}
          {t.time && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-dim)' }}>{t.time}</span>}
          {hasSubtasks && <button onClick={e => { e.stopPropagation(); setExpanded(!expanded) }} style={{ background: 'none', border: 'none', color: 'var(--color-dim)', fontSize: 11, cursor: 'pointer' }}>{expanded ? '▲' : '▼'}</button>}
          {t.notes && <span style={{ fontSize: 10, color: 'var(--color-dim)' }}>📝</span>}
          {!isRec && <>
            <button onClick={e => { e.stopPropagation(); setEditingNotes(dir); setNoteText(t.notes || '') }} style={{ background: 'none', border: 'none', color: 'var(--color-dim)', fontSize: 10, cursor: 'pointer' }}>✎</button>
            <button onClick={e => { e.stopPropagation(); setMoveModal({ idx: dir }); setMoveDate(new Date().toISOString().slice(0, 10)) }} style={{ background: 'none', border: 'none', color: 'var(--color-dim)', fontSize: 10, cursor: 'pointer' }}>↗</button>
            <button onClick={e => { e.stopPropagation(); removeTask(d, dir); toast.show('Eliminada') }} style={{ background: 'none', border: 'none', color: 'var(--color-dim)', fontSize: 12, cursor: 'pointer' }}>✕</button>
          </>}
        </div>
        {expanded && hasSubtasks && (
          <div style={{ marginLeft: 4, paddingLeft: 12, borderLeft: '2px solid rgba(255,255,255,0.07)', marginTop: 8 }}>
            {t.subtasks!.map((st, si) => (
              <div key={si} onClick={() => toggleSubtask(d, dir, si)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', cursor: 'pointer' }}>
                <div style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${st.done ? col : 'var(--color-border2)'}`, background: st.done ? col + '44' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0 }}>{st.done ? '✓' : ''}</div>
                <span style={{ fontSize: 12, color: st.done ? 'var(--color-dim)' : 'var(--color-sub)', textDecoration: st.done ? 'line-through' : 'none' }}>{st.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
}

/* ── SHIFTS VIEW ── */
function ShiftsView() {
  const { shifts, setShift, removeShift } = useAgendaStore()
  const toast = useToast()
  const [viewDate, setViewDate] = useState(new Date())
  const [editMode, setEditMode] = useState(false)

  const y = viewDate.getFullYear(); const m = viewDate.getMonth()
  const firstDow = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const start = firstDow === 0 ? 6 : firstDow - 1
  const today = new Date().toISOString().slice(0, 10)

  const CYCLE: (string | null)[] = ['TM', 'TT', 'TN', 'L', null]

  function handleTap(dStr: string) {
    if (!editMode) return
    const current = shifts[dStr]
    const idx = CYCLE.indexOf(current ?? null)
    const next = CYCLE[(idx + 1) % CYCLE.length]
    if (next) setShift(dStr, next)
    else removeShift(dStr)
  }

  return (
    <div className="shifts-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="sec-label" style={{ marginBottom: 0 }}>Turnos</div>
        <button onClick={() => { setEditMode(!editMode); toast.show(editMode ? 'Edición desactivada' : '✏️ Modo edición: toca un día para cambiar turno') }}
          style={{ padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', border: '1px solid',
            background: editMode ? 'color-mix(in srgb, var(--color-volt) 28%, transparent)' : 'var(--color-s2)',
            color: editMode ? 'var(--color-text)' : 'var(--color-dim)',
            borderColor: editMode ? 'color-mix(in srgb, var(--color-volt) 50%, transparent)' : 'var(--color-border)' }}>
          ✏️ {editMode ? 'Editando' : 'Editar'}
        </button>
      </div>

      {editMode && (
        <div style={{ background: 'color-mix(in srgb, var(--color-volt) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--color-volt) 24%, transparent)', borderRadius: 10, padding: '8px 12px', marginBottom: 12, fontSize: 11, color: 'var(--color-sub)', display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <span>1 toque → <b style={{ color: 'var(--color-acc-blue)' }}>TM</b></span>
          <span>2 toques → <b style={{ color: 'var(--color-acc-gold)' }}>TT</b></span>
          <span>3 toques → <b style={{ color: 'var(--color-acc-purple)' }}>TN</b></span>
          <span>4 toques → <b style={{ color: 'var(--color-acc-green)' }}>L</b></span>
          <span>5 toques → sin turno</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={() => setViewDate(p => new Date(p.getFullYear(), p.getMonth() - 1, 1))} className="cal-nav-btn" aria-label="Mes anterior">
          <ChevronLeft aria-hidden="true" />
        </button>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--color-text)' }}>{MONTHS[m]} {y}</div>
        <button onClick={() => setViewDate(p => new Date(p.getFullYear(), p.getMonth() + 1, 1))} className="cal-nav-btn" aria-label="Mes siguiente">
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
      <div className="cal-dow-row">
        {['L','M','X','J','V','S','D'].map(d => <div key={d} className="cal-dow">{d}</div>)}
      </div>
      <div className="shifts-grid">
        {Array.from({ length: start }, (_, i) => <div key={`e${i}`} aria-hidden="true" />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = i + 1
          const dStr = new Date(y, m, d, 12).toISOString().slice(0, 10)
          const s = shifts[dStr]
          return (
            <button key={d} onClick={() => handleTap(dStr)}
              className={`shifts-cell${dStr === today ? ' today' : ''}${s ? ` shift-${s}` : ''}`}
              aria-label={`${d} de ${MONTHS[m]}${s ? `, turno ${s}` : ', sin turno'}`}>
              <span style={{ lineHeight: 1 }}>{d}</span>
              {s && <span className="shift-code" style={{ color: SHIFT_COLORS[s] }}>{s}</span>}
            </button>
          )
        })}
      </div>

      <div style={{ background: 'var(--color-s2)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, marginTop: 14 }}>
        <div className="sec-label" style={{ marginBottom: 10 }}>Leyenda</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(['TM','TT','TN','L'] as const).map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span style={{ fontWeight: 700, color: SHIFT_COLORS[t], fontSize: 11, background: 'color-mix(in srgb, ' + (SHIFT_COLORS[t] || '#333') + ' 10%, transparent)', border: '1px solid color-mix(in srgb, ' + (SHIFT_COLORS[t] || '#333') + ' 22%, transparent)', borderRadius: 5, padding: '2px 7px' }}>{t}</span>
              <span style={{ color: 'var(--color-sub)' }}>{SHIFT_LABELS[t]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── STATS VIEW ── */
function StatsView() {
  const { tasks } = useAgendaStore()
  const allTasks = Object.values(tasks).flat()
  const totalDone = allTasks.filter(t => t.done).length
  const totalAll = allTasks.length
  const rate = totalAll > 0 ? Math.round(totalDone / totalAll * 100) : 0

  // Last 7 days
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000)
    const ds = d.toISOString().slice(0, 10)
    const dayTasks = tasks[ds] || []
    const done = dayTasks.filter(t => t.done).length
    return { label: ['D','L','M','X','J','V','S'][d.getDay()], done, total: dayTasks.length, date: ds }
  })
  const maxT = Math.max(1, ...last7.map(d => d.total))

  // Overdue count
  const today = new Date().toISOString().slice(0, 10)
  const overdue = Object.entries(tasks).filter(([k, v]) => k < today && v.some(t => !t.done)).reduce((s, [_, v]) => s + v.filter(t => !t.done).length, 0)

  return (
    <div>
      <div className="stat-strip" style={{ marginBottom: 12 }}>
        <div>
          <div className="stat-num" style={{ color: 'var(--color-acc-blue)' }}>{totalDone}</div>
          <div className="stat-lbl">Hechas</div>
        </div>
        <div>
          <div className="stat-num" style={{ color: 'var(--color-acc-green)' }}>{rate}%</div>
          <div className="stat-lbl">Tasa</div>
        </div>
        <div>
          <div className="stat-num" style={{ color: 'var(--color-red)' }}>{overdue}</div>
          <div className="stat-lbl">Vencidas</div>
        </div>
        <div>
          <div className="stat-num" style={{ color: 'var(--color-acc-gold)' }}>{last7.length > 0 ? Math.round(last7.reduce((s, d) => s + d.done, 0) / last7.length) : 0}</div>
          <div className="stat-lbl">Media/día</div>
        </div>
      </div>

      <div className="agenda-section">
        <div className="agenda-section-title">Tareas por día (última semana)</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
          {last7.map((d, i) => {
            const h = Math.max(3, (d.total / maxT) * 56)
            const doneH = d.total > 0 ? (d.done / d.total) * h : 0
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ width: '100%', borderRadius: '3px 3px 0 0', height: h, background: 'rgba(255,255,255,0.06)', position: 'relative' }}>
                  <div style={{ position: 'absolute', bottom: 0, width: '100%', borderRadius: '0 0 3px 3px', height: doneH, background: 'var(--color-acc-blue)' }} />
                </div>
                <span style={{ fontSize: 9, color: 'var(--color-dim)', textTransform: 'uppercase' }}>{d.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
