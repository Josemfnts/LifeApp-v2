import { useState, useCallback } from 'react'
import { getItem, setItem } from '@/lib/storage'
import type { Task, ShiftRecord } from '@/types'

function getStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayStr(): string {
  return getStr(new Date())
}

export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
export const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const COLOR_HEX: Record<string, string> = { blue: '#5b8af0', red: '#e05f5f', yellow: '#c9a84c', purple: '#9b7fe0', green: '#52b788' }
export const SHIFT_COLORS: Record<string, string> = { TM: '#5b8af0', TT: '#c9a84c', TN: '#9b7fe0', L: '#52b788' }
export const SHIFT_LABELS: Record<string, string> = { TM: 'Mañana', TT: 'Tarde', TN: 'Noche', L: 'Libre' }

export interface RecurringTask { text: string; color: string }
export interface PendingTask { text: string; color: string }

export function useAgenda() {
  const [tasks, setTasks] = useState<Record<string, Task[]>>(() =>
    getItem<Record<string, Task[]>>('agenda_tasks', {})
  )
  const [recurring, setRecurring] = useState<Record<number, RecurringTask[]>>(() =>
    getItem<Record<number, RecurringTask[]>>('agenda_recurring', { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] })
  )
  const [pending, setPending] = useState<PendingTask[]>(() =>
    getItem<PendingTask[]>('agenda_pending', [])
  )
  const [shifts, setShifts] = useState<ShiftRecord>(() =>
    getItem<ShiftRecord>('agenda_shifts', {})
  )

  const save = useCallback(() => {
    setItem('agenda_tasks', tasks)
    setItem('agenda_recurring', recurring)
    setItem('agenda_pending', pending)
    setItem('agenda_shifts', shifts)
  }, [tasks, recurring, pending, shifts])

  const addTask = useCallback((date: string, task: Task) => {
    setTasks(prev => {
      const next = { ...prev }
      if (!next[date]) next[date] = []
      next[date] = [...next[date], task]
      setItem('agenda_tasks', next)
      return next
    })
  }, [])

  const toggleTask = useCallback((date: string, idx: number) => {
    setTasks(prev => {
      const next = { ...prev }
      if (next[date]) {
        next[date] = [...next[date]]
        next[date][idx] = { ...next[date][idx], done: !next[date][idx].done }
      }
      setItem('agenda_tasks', next)
      return next
    })
  }, [])

  const removeTask = useCallback((date: string, idx: number) => {
    setTasks(prev => {
      const next = { ...prev }
      if (next[date]) {
        next[date] = next[date].filter((_, i) => i !== idx)
        if (next[date].length === 0) delete next[date]
      }
      setItem('agenda_tasks', next)
      return next
    })
  }, [])

  const addRecurring = useCallback((dow: number, task: RecurringTask) => {
    setRecurring(prev => {
      const next = { ...prev }
      next[dow] = [...(next[dow] || []), task]
      setItem('agenda_recurring', next)
      return next
    })
  }, [])

  const removeRecurring = useCallback((dow: number, idx: number) => {
    setRecurring(prev => {
      const next = { ...prev }
      next[dow] = (next[dow] || []).filter((_, i) => i !== idx)
      setItem('agenda_recurring', next)
      return next
    })
  }, [])

  const addPending = useCallback((task: PendingTask) => {
    setPending(prev => {
      const next = [...prev, task]
      setItem('agenda_pending', next)
      return next
    })
  }, [])

  const removePending = useCallback((idx: number) => {
    setPending(prev => {
      const next = prev.filter((_, i) => i !== idx)
      setItem('agenda_pending', next)
      return next
    })
  }, [])

  const setShift = useCallback((date: string, type: string) => {
    setShifts(prev => {
      const next = { ...prev, [date]: type as 'TM' | 'TT' | 'TN' | 'L' }
      setItem('agenda_shifts', next)
      return next
    })
  }, [])

  const getTasksForDate = useCallback((date: string): Task[] => {
    const direct = tasks[date] || []
    const dow = new Date(date + 'T12:00:00').getDay()
    const recTasks = (recurring[dow] || []).map(r => ({
      text: r.text,
      time: '',
      color: r.color,
      done: false,
    } as Task))
    return [...recTasks, ...direct]
  }, [tasks, recurring])

  // Rollover: move undone tasks from past to today
  const rollover = useCallback(() => {
    const ts = todayStr()
    setTasks(prev => {
      const next = { ...prev }
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
      if (changed) setItem('agenda_tasks', next)
      return next
    })
  }, [])

  return {
    tasks, recurring, pending, shifts,
    addTask, toggleTask, removeTask,
    addRecurring, removeRecurring,
    addPending, removePending,
    setShift,
    getTasksForDate,
    rollover,
  }
}
