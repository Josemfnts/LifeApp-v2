import { useState, useCallback } from 'react'
import { getItem, setItem } from '@/lib/storage'
import { useRemoteChange } from '@/lib/mirror'
import { STORE_KEYS } from '@/lib/storageKeys'
import type { Habit, HabitLog } from '@/types'

function getStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function todayStr(): string {
  return getStr(new Date())
}

export function habitActiveOnDay(h: Habit, date: Date): boolean {
  const dow = date.getDay()
  if (h.freq === 'daily') return true
  if (h.freq === 'weekdays') return dow >= 1 && dow <= 5
  if (h.freq === 'weekend') return dow === 0 || dow === 6
  if (h.freq === 'custom') return (h.days || []).includes(dow)
  return true
}

export function getLogValue(log: HabitLog, date: string, habitId: number): number {
  return (log[date] || {})[habitId] || 0
}

export function isHabitDone(h: Habit, val: number): boolean {
  if (h.type === 'bool') return !!val
  if (h.type === 'avoid') return val === 0
  return val >= h.goal
}

export function calcStreak(h: Habit, log: HabitLog, fromDate: Date): number {
  let streak = 0
  const d = new Date(fromDate)
  for (let i = 0; i < 365; i++) {
    const dStr = getStr(d)
    if (h.createdAt && dStr < h.createdAt) break
    if (!habitActiveOnDay(h, d)) {
      d.setDate(d.getDate() - 1)
      continue
    }
    const val = getLogValue(log, dStr, h.id)
    if (!isHabitDone(h, val)) break
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>(() =>
    getItem<Habit[]>('habits', [])
  )
  const [log, setLog] = useState<HabitLog>(() =>
    getItem<HabitLog>('habits_log', {})
  )

  // Espejo vivo: si la nube cambia hábitos o log (CompAI/otro dispositivo),
  // se recargan desde localStorage. getItem añade el prefijo lifeos_.
  useRemoteChange([STORE_KEYS.lifeos_habits, STORE_KEYS.lifeos_habits_log], () => {
    setHabits(getItem<Habit[]>('habits', []))
    setLog(getItem<HabitLog>('habits_log', {}))
  })

  const today = todayStr()

  const saveHabits = useCallback((h: Habit[]) => {
    setHabits(h)
    setItem('habits', h)
  }, [])

  const saveLog = useCallback((l: HabitLog) => {
    setLog(l)
    setItem('habits_log', l)
  }, [])

  const addHabit = useCallback((h: Habit) => {
    const next = [h, ...habits]
    saveHabits(next)
  }, [habits, saveHabits])

  const removeHabit = useCallback((id: number) => {
    saveHabits(habits.filter(h => h.id !== id))
  }, [habits, saveHabits])

  const setLogValue = useCallback((date: string, habitId: number, value: number) => {
    const next = { ...log }
    if (!next[date]) next[date] = {}
    next[date][habitId] = value
    saveLog(next)
  }, [log, saveLog])

  const activeToday = habits.filter(h => habitActiveOnDay(h, new Date()))

  const doneToday = activeToday.filter(h => {
    const val = getLogValue(log, today, h.id)
    return isHabitDone(h, val)
  }).length

  const pctToday = activeToday.length ? Math.round(doneToday / activeToday.length * 100) : 0

  return {
    habits, log, today, activeToday, doneToday, pctToday,
    addHabit, removeHabit, setLogValue, getLogValue: (d: string, id: number) => getLogValue(log, d, id),
  }
}
