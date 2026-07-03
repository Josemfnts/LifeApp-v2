import { create } from 'zustand'
import { saveToCloud } from '@/lib/sync'

function getStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function todayStr(): string { return getStr(new Date()) }

export const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
export const DAYS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
export const COLOR_HEX: Record<string, string> = { blue:'#5b8af0', red:'#e05f5f', yellow:'#c9a84c', purple:'#9b7fe0', green:'#52b788' }
export const SHIFT_COLORS: Record<string, string> = { TM:'#5b8af0', TT:'#c9a84c', TN:'#9b7fe0', L:'#52b788' }
export const SHIFT_LABELS: Record<string, string> = { TM:'Mañana', TT:'Tarde', TN:'Noche', L:'Libre' }
export const PRIORITY_COLORS: Record<string, string> = { high:'#e05f5f', medium:'#c9a84c', low:'#52b788' }

export interface SubTask { text: string; done: boolean }
export interface Task { text: string; time: string; color: string; done: boolean; isOverdue?: boolean; subtasks?: SubTask[]; priority?: string; notes?: string; fromRecurring?: boolean }
export interface RecurringTask { text: string; color: string; time?: string }
export interface PendingTask { text: string; color: string; priority?: string }

// Tarea tal como se muestra en el día: lleva el origen para que los handlers
// sepan si operar sobre el array de tareas directas (_dir) o si es una
// instancia generada de una tarea fija/recurrente (_rec).
export interface DayTask extends Task { _dir?: number; _rec?: boolean }

function load<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback } catch { return fallback }
}
function save(key: string, val: unknown) {
  localStorage.setItem(key, JSON.stringify(val))
  saveToCloud(key, val)
}

interface AgendaStore {
  tasks: Record<string, Task[]>
  recurring: Record<number, RecurringTask[]>
  pending: PendingTask[]
  shifts: Record<string, string>
  addTask: (date: string, task: Task) => void
  updateTask: (date: string, idx: number, task: Partial<Task>) => void
  toggleTask: (date: string, idx: number) => void
  toggleSubtask: (date: string, taskIdx: number, subIdx: number) => void
  removeTask: (date: string, idx: number) => void
  moveTask: (fromDate: string, fromIdx: number, toDate: string) => void
  addRecurring: (dow: number, task: RecurringTask) => void
  removeRecurring: (dow: number, idx: number) => void
  addPending: (task: PendingTask) => void
  removePending: (idx: number) => void
  setShift: (date: string, type: string) => void
  removeShift: (date: string) => void
  materializeRecurring: (date: string, task: Task) => void
  getTasksForDate: (date: string) => DayTask[]
  rollover: () => void
}

export const useAgendaStore = create<AgendaStore>((set, get) => ({
  tasks: load('agenda_tasks', {}),
  recurring: load('agenda_recurring', { 0:[],1:[],2:[],3:[],4:[],5:[],6:[] }),
  pending: load('agenda_pending', []),
  shifts: load('agenda_shifts', {}),

  addTask: (date, task) => set(state => {
    const next = { ...state.tasks }
    if (!next[date]) next[date] = []
    next[date] = [...next[date], task]
    save('agenda_tasks', next)
    return { tasks: next }
  }),
  updateTask: (date, idx, partial) => set(state => {
    const next = { ...state.tasks }
    if (next[date]) {
      next[date] = [...next[date]]
      next[date][idx] = { ...next[date][idx], ...partial }
    }
    save('agenda_tasks', next)
    return { tasks: next }
  }),
  toggleTask: (date, idx) => set(state => {
    const next = { ...state.tasks }
    if (next[date]) {
      next[date] = [...next[date]]
      next[date][idx] = { ...next[date][idx], done: !next[date][idx].done }
    }
    save('agenda_tasks', next)
    return { tasks: next }
  }),
  toggleSubtask: (date, taskIdx, subIdx) => set(state => {
    const next = { ...state.tasks }
    if (next[date]?.[taskIdx]?.subtasks) {
      next[date] = [...next[date]]
      next[date][taskIdx] = { ...next[date][taskIdx], subtasks: [...next[date][taskIdx].subtasks!] }
      next[date][taskIdx].subtasks![subIdx] = { ...next[date][taskIdx].subtasks![subIdx], done: !next[date][taskIdx].subtasks![subIdx].done }
    }
    save('agenda_tasks', next)
    return { tasks: next }
  }),
  removeTask: (date, idx) => set(state => {
    const next = { ...state.tasks }
    if (next[date]) {
      next[date] = next[date].filter((_, i) => i !== idx)
      if (next[date].length === 0) delete next[date]
    }
    save('agenda_tasks', next)
    return { tasks: next }
  }),
  moveTask: (fromDate, fromIdx, toDate) => set(state => {
    const next = { ...state.tasks }
    if (next[fromDate]) {
      const task = next[fromDate][fromIdx]
      next[fromDate] = next[fromDate].filter((_, i) => i !== fromIdx)
      if (next[fromDate].length === 0) delete next[fromDate]
      if (!next[toDate]) next[toDate] = []
      next[toDate] = [...next[toDate], task]
    }
    save('agenda_tasks', next)
    return { tasks: next }
  }),
  addRecurring: (dow, task) => set(state => {
    const next = { ...state.recurring }
    next[dow] = [...(next[dow] || []), task]
    save('agenda_recurring', next)
    return { recurring: next }
  }),
  removeRecurring: (dow, idx) => set(state => {
    const next = { ...state.recurring }
    next[dow] = (next[dow] || []).filter((_, i) => i !== idx)
    save('agenda_recurring', next)
    return { recurring: next }
  }),
  addPending: (task) => set(state => {
    const next = [...state.pending, task]
    save('agenda_pending', next)
    return { pending: next }
  }),
  removePending: (idx) => set(state => {
    const next = state.pending.filter((_, i) => i !== idx)
    save('agenda_pending', next)
    return { pending: next }
  }),
  setShift: (date, type) => set(state => {
    const next = { ...state.shifts, [date]: type }
    save('agenda_shifts', next)
    return { shifts: next }
  }),
  removeShift: (date) => set(state => {
    const next = { ...state.shifts }
    delete next[date]
    save('agenda_shifts', next)
    return { shifts: next }
  }),
  materializeRecurring: (date, task) => set(state => {
    const next = { ...state.tasks }
    if (!next[date]) next[date] = []
    next[date] = [...next[date], { text: task.text, time: task.time, color: task.color, done: true, fromRecurring: true }]
    save('agenda_tasks', next)
    return { tasks: next }
  }),
  getTasksForDate: (date) => {
    const state = get()
    const direct = state.tasks[date] || []
    // Una recurrente ya "materializada" (marcada como hecha ese día) vive como
    // tarea directa con fromRecurring=true; no la volvemos a generar desde la
    // plantilla para no duplicarla.
    const materialized = new Set(direct.filter(t => t.fromRecurring).map(t => t.text))
    const dow = new Date(date + 'T12:00:00').getDay()
    const recTasks: DayTask[] = (state.recurring[dow] || [])
      .filter(r => !materialized.has(r.text))
      .map(r => ({ text: r.text, time: r.time || '', color: r.color, done: false, _rec: true }))
    const directTasks: DayTask[] = direct.map((t, i) => ({ ...t, _dir: i }))
    return [...recTasks, ...directTasks]
  },
  rollover: () => {
    const state = get()
    const ts = todayStr()
    const next = { ...state.tasks }
    if (!next[ts]) next[ts] = []
    let changed = false
    for (const k in next) {
      if (k < ts) {
        const pending2 = next[k].filter(t => !t.done)
        const done2 = next[k].filter(t => t.done)
        if (pending2.length > 0) {
          pending2.forEach(t => { t.isOverdue = true; t.time = ''; next[ts].push(t) })
          if (done2.length > 0) next[k] = done2
          else delete next[k]
          changed = true
        }
      }
    }
    if (changed) { save('agenda_tasks', next); set({ tasks: next }) }
  },
}))
