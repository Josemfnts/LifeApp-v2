import { create } from 'zustand'
import type { Task, ShiftRecord } from '@/types'

function getStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayStr(): string {
  return getStr(new Date())
}

export const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
export const DAYS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
export const COLOR_HEX: Record<string, string> = { blue:'#5b8af0', red:'#e05f5f', yellow:'#c9a84c', purple:'#9b7fe0', green:'#52b788' }
export const SHIFT_COLORS: Record<string, string> = { TM:'#5b8af0', TT:'#c9a84c', TN:'#9b7fe0', L:'#52b788' }
export const SHIFT_LABELS: Record<string, string> = { TM:'Mañana', TT:'Tarde', TN:'Noche', L:'Libre' }

export interface RecurringTask { text: string; color: string }
export interface PendingTask { text: string; color: string }

interface AgendaStore {
  tasks: Record<string, Task[]>
  recurring: Record<number, RecurringTask[]>
  pending: PendingTask[]
  shifts: ShiftRecord
  addTask: (date: string, task: Task) => void
  toggleTask: (date: string, idx: number) => void
  removeTask: (date: string, idx: number) => void
  addRecurring: (dow: number, task: RecurringTask) => void
  removeRecurring: (dow: number, idx: number) => void
  addPending: (task: PendingTask) => void
  removePending: (idx: number) => void
  setShift: (date: string, type: string) => void
  getTasksForDate: (date: string) => Task[]
  rollover: () => void
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

function save(key: string, val: unknown) {
  localStorage.setItem(key, JSON.stringify(val))
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

  toggleTask: (date, idx) => set(state => {
    const next = { ...state.tasks }
    if (next[date]) {
      next[date] = [...next[date]]
      next[date][idx] = { ...next[date][idx], done: !next[date][idx].done }
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
    const next = { ...state.shifts, [date]: type as 'TM'|'TT'|'TN'|'L' }
    save('agenda_shifts', next)
    return { shifts: next }
  }),

  getTasksForDate: (date) => {
    const state = get()
    const direct = state.tasks[date] || []
    const dow = new Date(date + 'T12:00:00').getDay()
    const recTasks = (state.recurring[dow] || []).map(r => ({
      text: r.text, time: '', color: r.color, done: false,
    }))
    return [...recTasks, ...direct]
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
    if (changed) {
      save('agenda_tasks', next)
      set({ tasks: next })
    }
  },
}))
