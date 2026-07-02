import { useState, useMemo, useEffect } from 'react'
import { useAgendaStore, DAYS, MONTHS, COLOR_HEX, SHIFT_COLORS, SHIFT_LABELS, PRIORITY_COLORS } from '@/stores/agendaStore'
import { useToast } from '@/stores/toast'
import { Input } from '@/components/ui'
import { KanbanView } from '@/components/agenda/KanbanView'
import { PlanesView } from '@/components/agenda/PlanesView'
import Pomodoro from '@/pages/Pomodoro'
import Diario from '@/pages/Diario'

export default function Agenda() {
  const [tab, setTab] = useState<'month' | 'week' | 'day' | 'shifts' | 'stats' | 'kanban' | 'planes' | 'pomodoro' | 'diario'>('month')
  const [selDate, setSelDate] = useState(new Date())
  const rollover = useAgendaStore(s => s.rollover)
  useEffect(() => { rollover() }, [])
  useEffect(() => {
    const h = (e: Event) => { const d = (e as CustomEvent<Date>).detail; if (d) { setSelDate(d); setTab('day') } }
    window.addEventListener('agenda-pick-day', h)
    return () => window.removeEventListener('agenda-pick-day', h)
  }, [])
  return (
    <div>
      <div className="page-header">
        <div className="page-module" style={{ color: 'var(--color-acc-blue)' }}>Agenda</div>
        <div className="page-title">Planificación</div>
        <div className="tab-bar">
          {(['month','week','day','shifts','stats','kanban','planes','pomodoro','diario'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`tab-btn${tab === t ? ' active' : ''}`}>
              {{month:'Mes',week:'Semana',day:'Día',shifts:'Turnos',stats:'Stats',kanban:'Kanban',planes:'Planes',pomodoro:'🍅',diario:'📝'}[t]}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: 16 }}>
        {tab === 'month' && <CalendarView onPick={(d: Date) => { setSelDate(d); setTab('day') }} />}
        {tab === 'week' && <WeekView />}
        {tab === 'day' && <DayView date={selDate} />}
        {tab === 'shifts' && <ShiftsView />}
        {tab === 'stats' && <StatsView />}
        {tab === 'kanban' && <KanbanView />}
        {tab === 'planes' && <PlanesView />}
        {tab === 'pomodoro' && <Pomodoro />}
        {tab === 'diario' && <Diario />}
      </div>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button onClick={() => setViewDate(p => new Date(p.getFullYear(), p.getMonth() - 1, 1))} style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-s1)', border: '1px solid var(--color-border)', color: 'var(--color-sub)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>‹</button>
        <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 20, color: 'var(--color-text)' }}>{MONTHS[m]} {y}</div>
        <button onClick={() => setViewDate(p => new Date(p.getFullYear(), p.getMonth() + 1, 1))} style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-s1)', border: '1px solid var(--color-border)', color: 'var(--color-sub)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 6 }}>
        {['L','M','X','J','V','S','D'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 0' }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {Array.from({ length: start }, (_, i) => <div key={`e${i}`} style={{ aspectRatio: '1' }} />)}
        {days.map(({ d, dStr, isToday, dotColors, shift, taskCount }) => (
          <button key={d} onClick={() => onPick(new Date(y, m, d, 12))}
            style={{
              aspectRatio: '1', width: '100%', borderRadius: 10, border: isToday ? '2px solid var(--color-acc-blue)' : '1px solid var(--color-border)',
              background: isToday ? 'rgba(91,138,240,0.1)' : 'var(--color-s1)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--color-acc-blue)' : 'var(--color-sub)',
              transition: 'all 0.15s', position: 'relative',
            }}>
            <span style={{ lineHeight: 1 }}>{d}</span>
            {shift && <span style={{ fontSize: 8, fontWeight: 700, color: SHIFT_COLORS[shift], lineHeight: 1, marginTop: 1 }}>{shift}</span>}
            {dotColors.length > 0 && <div style={{ position: 'absolute', bottom: 3, display: 'flex', gap: 2 }}>{dotColors.slice(0, 3).map(c => <div key={c} style={{ width: 4, height: 4, borderRadius: '50%', background: COLOR_HEX[c] || '#8a8d96' }} />)}</div>}
            {taskCount > 3 && <div style={{ position: 'absolute', top: 2, right: 3, fontSize: 8, color: 'var(--color-dim)', fontWeight: 700 }}>{taskCount}</div>}
          </button>
        ))}
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
  const [pColor, setPColor] = useState('blue')
  const [pPriority, setPPriority] = useState('')

  // Recurring section
  const [rText, setRText] = useState('')
  const [rDay, setRDay] = useState('1')
  const [rColor, setRColor] = useState('blue')
  const [rTime, setRTime] = useState('')
  const [subTab, setSubTab] = useState<'pending' | 'recurring'>('pending')

  function handleAddPending() { if (!pText.trim()) return; addPending({ text: pText.trim(), color: pColor, priority: pPriority }); setPText(''); toast.show('✓ Tarea pendiente añadida') }
  function handleAddRecurring() { if (!rText.trim()) return; addRecurring(+rDay, { text: rText.trim(), color: rColor, time: rTime }); setRText(''); setRTime(''); toast.show('✓ Tarea fija añadida') }

  // Filtered pending
  const filteredPending = search.trim()
    ? pending.filter(p => p.text.toLowerCase().includes(search.toLowerCase()))
    : pending

  return (
    <div>
      {/* Search */}
      <Input value={search} onChange={setSearch} placeholder="🔍 Buscar en pendientes..." className="mb-3" />

      {/* Sub tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <button onClick={() => setSubTab('pending')} style={{ flex: 1, padding: '9px 4px', borderRadius: 10, fontSize: 12, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid', background: subTab === 'pending' ? 'rgba(91,138,240,0.15)' : 'transparent', color: subTab === 'pending' ? 'var(--color-acc-blue)' : 'var(--color-dim)', borderColor: subTab === 'pending' ? 'rgba(91,138,240,0.3)' : 'var(--color-border)' }}>✅ Pendientes ({filteredPending.length})</button>
        <button onClick={() => setSubTab('recurring')} style={{ flex: 1, padding: '9px 4px', borderRadius: 10, fontSize: 12, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid', background: subTab === 'recurring' ? 'rgba(91,138,240,0.15)' : 'transparent', color: subTab === 'recurring' ? 'var(--color-acc-blue)' : 'var(--color-dim)', borderColor: subTab === 'recurring' ? 'rgba(91,138,240,0.3)' : 'var(--color-border)' }}>🔄 Fijas</button>
      </div>

      {subTab === 'pending' && (
        <>
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div className="sec-label" style={{ marginBottom: 10 }}>Nueva tarea pendiente</div>
            <Input value={pText} onChange={setPText} placeholder="¿Qué tienes que hacer?" className="mb-2" />
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {Object.entries(COLOR_HEX).map(([k, h]) => (
                <button key={k} onClick={() => setPColor(k)} style={{ width: 28, height: 28, borderRadius: '50%', border: pColor === k ? '2.5px solid var(--color-text)' : '2.5px solid transparent', background: h, cursor: 'pointer', transition: 'all 0.12s' }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {[{ v: 'high', l: '🔴 Alta' }, { v: 'medium', l: '🟡 Media' }, { v: 'low', l: '🟢 Baja' }].map(p => (
                <button key={p.v} onClick={() => setPPriority(p.v)} style={{ flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid', background: pPriority === p.v ? PRIORITY_COLORS[p.v] + '22' : 'var(--color-s2)', color: pPriority === p.v ? PRIORITY_COLORS[p.v] : 'var(--color-dim)', borderColor: pPriority === p.v ? PRIORITY_COLORS[p.v] + '44' : 'var(--color-border)' }}>{p.l}</button>
              ))}
              <button onClick={() => setPPriority('')} style={{ padding: '6px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid', background: !pPriority ? 'rgba(91,138,240,0.1)' : 'var(--color-s2)', color: !pPriority ? 'var(--color-acc-blue)' : 'var(--color-dim)', borderColor: !pPriority ? 'rgba(91,138,240,0.2)' : 'var(--color-border)' }}>—</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={handleAddPending} className="btn-ghost" style={{ fontSize: 13 }}>📋 Dejar pendiente</button>
              <button onClick={() => { if (!pText.trim()) return; addTask(new Date().toISOString().slice(0, 10), { text: pText.trim(), time: '', color: pColor, done: false, priority: pPriority || undefined }); setPText(''); toast.show('✓ Tarea añadida a hoy') }} className="btn-primary" style={{ fontSize: 13 }}>📅 Añadir a hoy</button>
            </div>
          </div>

          {filteredPending.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, fontSize: 13, color: 'var(--color-dim)' }}>Sin tareas pendientes.</div>
          ) : filteredPending.map((p, i) => (
            <div key={i} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: COLOR_HEX[p.color] || '#8a8d96' }} />
              {p.priority && <span style={{ fontSize: 10, fontWeight: 700, color: PRIORITY_COLORS[p.priority], background: PRIORITY_COLORS[p.priority] + '18', borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>{p.priority === 'high' ? 'Alta' : p.priority === 'medium' ? 'Media' : 'Baja'}</span>}
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>{p.text}</span>
              <button onClick={() => { addTask(new Date().toISOString().slice(0, 10), { text: p.text, time: '', color: p.color, done: false, priority: p.priority }); removePending(i); toast.show('→ Movida a hoy') }} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', background: 'rgba(82,183,136,0.1)', color: 'var(--color-acc-green)', border: '1px solid rgba(82,183,136,0.2)' }}>→ Hoy</button>
              <button onClick={() => { removePending(i); toast.show('Eliminada') }} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(224,95,95,0.08)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.15)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
            </div>
          ))}

          {/* Weekly task view */}
          <div className="sec-label" style={{ marginTop: 20, marginBottom: 10 }}>Vista rápida de la semana</div>
          {weekDays.map((d, i) => {
            const dStr = d.toISOString().slice(0, 10)
            const dayTasks = tasks[dStr] || []
            return (
              <div key={i} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ padding: '8px 14px', borderBottom: dayTasks.length > 0 ? '1px solid var(--color-border)' : 'none', fontSize: 11, fontWeight: 600, color: 'var(--color-sub)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {DAYS[d.getDay()].slice(0, 3)} {d.getDate()}
                  {dayTasks.length > 0 && <span style={{ marginLeft: 8, color: 'var(--color-dim)', fontWeight: 500 }}>{dayTasks.filter(t => t.done).length}/{dayTasks.length}</span>}
                </div>
                {dayTasks.map((t, j) => (
                  <div key={j} style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 8, opacity: t.done ? 0.45 : 1 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: COLOR_HEX[t.color] || '#8a8d96' }} />
                    <span style={{ flex: 1, fontSize: 12, color: t.done ? 'var(--color-dim)' : 'var(--color-text)', textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</span>
                    {t.priority && <span style={{ fontSize: 9, color: PRIORITY_COLORS[t.priority] }}>{t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '🟢'}</span>}
                  </div>
                ))}
              </div>
            )
          })}
        </>
      )}

      {subTab === 'recurring' && (
        <>
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div className="sec-label" style={{ marginBottom: 10 }}>Nueva tarea fija</div>
            <Input value={rText} onChange={setRText} placeholder="Tarea fija..." className="mb-2" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
              <select className="inp" value={rDay} onChange={e => setRDay(e.target.value)} style={{ marginBottom: 0 }}>{DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}</select>
              <select className="inp" value={rColor} onChange={e => setRColor(e.target.value)} style={{ marginBottom: 0 }}>{Object.keys(COLOR_HEX).map(k => <option key={k} value={k}>{k}</option>)}</select>
              <input className="inp" value={rTime} onChange={e => setRTime(e.target.value)} type="time" placeholder="Hora" style={{ marginBottom: 0 }} />
            </div>
            <button onClick={handleAddRecurring} className="btn-ghost">+ Añadir tarea fija</button>
          </div>
          {order.map(dow => {
            const rt = recurring[dow] || []
            if (!rt.length) return null
            return (
              <div key={dow} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', fontSize: 11, fontWeight: 600, color: 'var(--color-sub)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{DAYS[dow]}</div>
                {rt.map((t, i) => (
                  <div key={i} style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLOR_HEX[t.color] || '#8a8d96' }} />
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
  const { getTasksForDate, toggleTask, toggleSubtask, addTask, updateTask, removeTask, moveTask, shifts } = useAgendaStore()
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
  const [newColor, setNewColor] = useState('blue')
  const [newPriority, setNewPriority] = useState('')
  const [newSubtasks, setNewSubtasks] = useState<string[]>([])
  const [subInput, setSubInput] = useState('')
  const [editingNotes, setEditingNotes] = useState<number | null>(null)
  const [noteText, setNoteText] = useState('')

  // Move target date picker
  const [moveModal, setMoveModal] = useState<{ idx: number } | null>(null)
  const [moveDate, setMoveDate] = useState('')

  const HOURS = Array.from({ length: 18 }, (_, i) => i + 6)
  const now = new Date(); const nowH = now.getHours(); const nowM = now.getMinutes()
  const isToday = dStr === new Date().toISOString().slice(0, 10)

  const byHour: Record<number, { t: typeof allTasks[0]; idx: number }[]> = {}
  const unscheduled: { t: typeof allTasks[0]; idx: number }[] = []
  allTasks.forEach((t, idx) => { if (!t.time) { unscheduled.push({ t, idx }); return }; const h = parseInt(t.time.split(':')[0]); if (!byHour[h]) byHour[h] = []; byHour[h].push({ t, idx }) })

  function handleAdd() { if (!newText.trim()) return; const task = { text: newText.trim(), time: newTime, color: newColor, done: false, priority: newPriority || undefined, subtasks: newSubtasks.length > 0 ? newSubtasks.map(s => ({ text: s, done: false })) : undefined }; addTask(dStr, task); setNewText(''); setNewTime(''); setNewSubtasks([]); setShowForm(false); toast.show('✓ Tarea añadida') }

  function saveTemplate() {
    const dayTasks = getTasksForDate(dStr)
    if (!dayTasks.length) { toast.show('No hay tareas para guardar'); return }
    const name = prompt('Nombre de la plantilla:', `Día ${date.getDate()}/${date.getMonth()+1}`)
    if (!name) return
    const templates = JSON.parse(localStorage.getItem('agenda_templates') || '[]')
    templates.push({ name, date: dStr, tasks: dayTasks })
    localStorage.setItem('agenda_templates', JSON.stringify(templates))
    toast.show('✓ Plantilla guardada')
  }

  function loadTemplate() {
    const templates = JSON.parse(localStorage.getItem('agenda_templates') || '[]')
    if (!templates.length) { toast.show('No hay plantillas guardadas'); return }
    const names = templates.map((t: { name: string }, i: number) => `${i+1}. ${t.name}`).join('\n')
    const idx = prompt(`Elige plantilla:\n${names}\n\nNúmero:`)
    if (!idx) return
    const t = templates[parseInt(idx) - 1]
    if (!t) return
    t.tasks.forEach((task: { text: string; time: string; color: string; priority?: string; subtasks?: { text: string; done: boolean }[] }) => {
      addTask(dStr, { ...task, done: false })
    })
    toast.show(`✓ Plantilla "${t.name}" cargada`)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 1); window.dispatchEvent(new CustomEvent('agenda-pick-day', { detail: d })) }} style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-s1)', border: '1px solid var(--color-border)', color: 'var(--color-sub)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>‹</button>
        <div><div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 18, color: 'var(--color-text)' }}>{DAYS[date.getDay()]}, {date.getDate()} {MONTHS[date.getMonth()]}</div><div style={{ fontSize: 11, color: 'var(--color-sub)', textAlign: 'center' }}>{date.getFullYear()}</div></div>
        <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 1); window.dispatchEvent(new CustomEvent('agenda-pick-day', { detail: d })) }} style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-s1)', border: '1px solid var(--color-border)', color: 'var(--color-sub)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>›</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '10px 14px' }}>
          <span style={{ fontSize: 16 }}>🏭</span>
          <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Turno</div><div style={{ fontSize: 14, fontWeight: 600, color: shift ? SHIFT_COLORS[shift] : 'var(--color-dim)' }}>{shift ? SHIFT_LABELS[shift] : '—'}</div></div>
        </div>
        {total > 0 && (
          <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '10px 14px' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-sub)' }}>{done}/{total}</span>
            <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}><div style={{ height: '100%', background: 'var(--color-acc-blue)', borderRadius: 99, transition: 'width 0.4s', width: `${pct}%` }} /></div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-acc-blue)' }}>{pct}%</span>
          </div>
        )}
      </div>

      {!showForm ? (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={() => setShowForm(true)} style={{ flex: 1, padding: 11, borderRadius: 12, background: 'rgba(91,138,240,0.1)', color: 'var(--color-acc-blue)', border: '1px solid rgba(91,138,240,0.2)', fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>+ Añadir tarea</button>
          <button onClick={saveTemplate} style={{ padding: '11px 14px', borderRadius: 12, background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-dim)', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>💾</button>
          <button onClick={loadTemplate} style={{ padding: '11px 14px', borderRadius: 12, background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-dim)', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>📂</button>
        </div>
      ) : (
        <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 14, marginBottom: 12 }}>
          <Input value={newText} onChange={setNewText} placeholder="¿Qué tienes que hacer?" className="mb-2" />
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input className="inp" value={newTime} onChange={e => setNewTime(e.target.value)} type="time" style={{ width: 96, marginBottom: 0 }} />
            <select className="inp" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ flex: 1, marginBottom: 0 }}>{Object.keys(COLOR_HEX).map(k => <option key={k} value={k}>{k}</option>)}</select>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {[{ v: 'high', l: '🔴 Alta' }, { v: 'medium', l: '🟡 Media' }, { v: 'low', l: '🟢 Baja' }].map(p => (
              <button key={p.v} onClick={() => setNewPriority(p.v)} style={{ flex: 1, padding: '5px 4px', borderRadius: 6, fontSize: 10, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid', background: newPriority === p.v ? PRIORITY_COLORS[p.v] + '22' : 'var(--color-s2)', color: newPriority === p.v ? PRIORITY_COLORS[p.v] : 'var(--color-dim)', borderColor: newPriority === p.v ? PRIORITY_COLORS[p.v] + '44' : 'var(--color-border)' }}>{p.l}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input className="inp" value={subInput} onChange={e => setSubInput(e.target.value)} placeholder="Subtarea..." style={{ marginBottom: 0 }} />
            <button onClick={() => { if (subInput.trim()) { setNewSubtasks(p => [...p, subInput.trim()]); setSubInput('') } }} style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(155,127,224,0.1)', color: 'var(--color-acc-purple)', border: '1px solid rgba(155,127,224,0.2)', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>+</button>
          </div>
          {newSubtasks.length > 0 && <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>{newSubtasks.map((s, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-sub)' }}><span>◦ {s}</span><button onClick={() => setNewSubtasks(p => p.filter((_, ii) => ii !== i))} style={{ color: 'var(--color-dim)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 10 }}>✕</button></div>)}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowForm(false)} style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(224,95,95,0.08)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.15)', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>✕ Cancelar</button>
            <button onClick={handleAdd} style={{ flex: 1, padding: '8px 14px', borderRadius: 10, background: 'var(--color-acc-blue)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>+ Añadir</button>
          </div>
        </div>
      )}

      <div className="sec-label" style={{ marginBottom: 8 }}>Timeline</div>

      {/* Unscheduled + overdue */}
      {unscheduled.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {unscheduled.map(({ t, idx }) => (
            <TaskItem key={idx} task={t} idx={idx} date={dStr} />
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
              {hTasks.map(({ t, idx }) => (
                <TaskItem key={idx} task={t} idx={idx} date={dStr} />
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
            <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 18, marginBottom: 12 }}>Notas</div>
            <textarea className="inp" value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Notas de la tarea..." style={{ height: 120, resize: 'none', fontFamily: 'DM Sans,sans-serif', fontSize: 14 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              <button onClick={() => setEditingNotes(null)} className="btn-ghost" style={{ width: '100%' }}>Cancelar</button>
              <button onClick={() => { updateTask(dStr, editingNotes, { notes: noteText }); setEditingNotes(null); toast.show('✓ Notas guardadas') }} className="btn-primary" style={{ background: 'var(--color-acc-blue)', width: 'auto' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  function TaskItem({ task: t, idx, date: d }: { task: { text: string; time: string; color: string; done: boolean; isOverdue?: boolean; subtasks?: { text: string; done: boolean }[]; priority?: string; notes?: string }; idx: number; date: string }) {
    const [expanded, setExpanded] = useState(false)
    const hasSubtasks = t.subtasks && t.subtasks.length > 0
    const col = COLOR_HEX[t.color] || '#5b8af0'

    return (
      <div style={{ marginBottom: 4 }}>
        <div
          onClick={() => toggleTask(d, idx)}
          style={{
            borderRadius: 8, padding: '6px 10px', borderLeft: `3px solid ${col}`,
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            background: col + '11', opacity: t.done ? 0.45 : 1, transition: 'opacity 0.15s',
          }}>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: t.done ? 'var(--color-dim)' : 'var(--color-text)', textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</div>
          {t.priority && <span style={{ fontSize: 10, color: PRIORITY_COLORS[t.priority] }}>{t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '🟢'}</span>}
          {t.time && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-dim)' }}>{t.time}</span>}
          {hasSubtasks && <button onClick={e => { e.stopPropagation(); setExpanded(!expanded) }} style={{ background: 'none', border: 'none', color: 'var(--color-dim)', fontSize: 11, cursor: 'pointer' }}>{expanded ? '▲' : '▼'}</button>}
          {t.notes && <span style={{ fontSize: 10, color: 'var(--color-dim)' }}>📝</span>}
          <button onClick={e => { e.stopPropagation(); setEditingNotes(idx); setNoteText(t.notes || '') }} style={{ background: 'none', border: 'none', color: 'var(--color-dim)', fontSize: 10, cursor: 'pointer' }}>✎</button>
          <button onClick={e => { e.stopPropagation(); const nd = prompt('Mover a fecha (YYYY-MM-DD):', new Date().toISOString().slice(0,10)); if (nd) { moveTask(d, idx, nd); toast.show('✓ Tarea movida') } }} style={{ background: 'none', border: 'none', color: 'var(--color-dim)', fontSize: 10, cursor: 'pointer' }}>↗</button>
          <button onClick={e => { e.stopPropagation(); removeTask(d, idx); toast.show('Eliminada') }} style={{ background: 'none', border: 'none', color: 'var(--color-dim)', fontSize: 12, cursor: 'pointer' }}>✕</button>
        </div>
        {expanded && hasSubtasks && (
          <div style={{ marginLeft: 4, paddingLeft: 12, borderLeft: '2px solid rgba(255,255,255,0.07)', marginTop: 8 }}>
            {t.subtasks!.map((st, si) => (
              <div key={si} onClick={() => toggleSubtask(d, idx, si)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', cursor: 'pointer' }}>
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
  const { shifts, setShift } = useAgendaStore()
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
    else { const s = { ...shifts }; delete s[dStr]; useAgendaStore.setState({ shifts: s }); localStorage.setItem('agenda_shifts', JSON.stringify(s)) }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="sec-label" style={{ marginBottom: 0 }}>Turnos</div>
        <button onClick={() => { setEditMode(!editMode); toast.show(editMode ? 'Edición desactivada' : '✏️ Modo edición: toca un día para cambiar turno') }}
          style={{ padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid',
            background: editMode ? 'rgba(91,138,240,0.15)' : 'var(--color-s2)',
            color: editMode ? 'var(--color-acc-blue)' : 'var(--color-dim)',
            borderColor: editMode ? 'rgba(91,138,240,0.3)' : 'var(--color-border)' }}>
          ✏️ {editMode ? 'Editando' : 'Editar'}
        </button>
      </div>

      {editMode && (
        <div style={{ background: 'rgba(91,138,240,0.06)', border: '1px solid rgba(91,138,240,0.15)', borderRadius: 10, padding: '8px 12px', marginBottom: 12, fontSize: 11, color: 'var(--color-sub)', display: 'flex', gap: 12, justifyContent: 'center' }}>
          <span>1 toque → <b style={{ color: '#5b8af0' }}>TM</b></span>
          <span>2 toques → <b style={{ color: '#c9a84c' }}>TT</b></span>
          <span>3 toques → <b style={{ color: '#9b7fe0' }}>TN</b></span>
          <span>4 toques → <b style={{ color: '#52b788' }}>L</b></span>
          <span>5 toques → sin turno</span>
        </div>
      )}

      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button onClick={() => setViewDate(p => new Date(p.getFullYear(), p.getMonth() - 1, 1))} style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-sub)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>‹</button>
          <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 18, color: 'var(--color-text)' }}>{MONTHS[m]} {y}</div>
          <button onClick={() => setViewDate(p => new Date(p.getFullYear(), p.getMonth() + 1, 1))} style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-sub)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>›</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 6 }}>
          {['L','M','X','J','V','S','D'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 0' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
          {Array.from({ length: start }, (_, i) => <div key={`e${i}`} style={{ aspectRatio: '1' }} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = i + 1
            const dStr = new Date(y, m, d, 12).toISOString().slice(0, 10)
            const s = shifts[dStr]
            return (
              <button key={d} onClick={() => handleTap(dStr)}
                style={{
                  aspectRatio: '1', width: '100%', borderRadius: 10, border: dStr === today ? '2px solid rgba(255,255,255,0.2)' : '1px solid var(--color-border)',
                  background: s ? (SHIFT_COLORS[s] || '#333') + '22' : 'var(--color-s2)',
                  cursor: editMode ? 'pointer' : 'default',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: dStr === today ? 700 : 500,
                  color: s ? SHIFT_COLORS[s] : 'var(--color-dim)',
                  transition: 'all 0.12s',
                  fontFamily: 'DM Sans,sans-serif',
                }}>
                <span style={{ lineHeight: 1 }}>{d}</span>
                {s && <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1, marginTop: 2 }}>{s}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14 }}>
        <div className="sec-label" style={{ marginBottom: 10 }}>Leyenda</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(['TM','TT','TN','L'] as const).map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span style={{ fontWeight: 700, color: SHIFT_COLORS[t], fontSize: 11, background: (SHIFT_COLORS[t] || '#333') + '1a', border: `1px solid ${(SHIFT_COLORS[t] || '#333') + '33'}`, borderRadius: 5, padding: '2px 7px' }}>{t}</span>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 12, right: '40%', height: 2, borderRadius: '0 0 2px 2px', background: '#5b8af0' }} />
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Tareas completadas</div>
          <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 28, color: '#5b8af0', lineHeight: 1 }}>{totalDone}</div>
          <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 4 }}>de {totalAll} totales</div>
        </div>
        <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 12, right: '40%', height: 2, borderRadius: '0 0 2px 2px', background: '#52b788' }} />
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Tasa de éxito</div>
          <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 28, color: '#52b788', lineHeight: 1 }}>{rate}%</div>
          <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 4 }}>histórico</div>
        </div>
        <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 12, right: '40%', height: 2, borderRadius: '0 0 2px 2px', background: '#e05f5f' }} />
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Tareas vencidas</div>
          <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 28, color: '#e05f5f', lineHeight: 1 }}>{overdue}</div>
          <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 4 }}>sin completar</div>
        </div>
        <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 12, right: '40%', height: 2, borderRadius: '0 0 2px 2px', background: '#c9a84c' }} />
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Media diaria</div>
          <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 28, color: '#c9a84c', lineHeight: 1 }}>{last7.length > 0 ? Math.round(last7.reduce((s, d) => s + d.done, 0) / last7.length) : 0}</div>
          <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 4 }}>última semana</div>
        </div>
      </div>

      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-sub)', letterSpacing: '0.3px', marginBottom: 10 }}>Tareas por día (última semana)</div>
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
