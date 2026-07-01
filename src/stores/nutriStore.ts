import { create } from 'zustand'
import type { MealEntry } from '@/types'

function load<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback } catch { return fallback }
}
function save(key: string, val: unknown) { localStorage.setItem(key, JSON.stringify(val)) }

interface NutriStore {
  log: Record<string, Record<string, MealEntry[]>>  // date -> mealType -> entries
  bodyMetrics: { date: string; weight: number; fat: number; muscle: number }[]
  addMeal: (date: string, mealType: string, entry: MealEntry) => void
  removeMeal: (date: string, mealType: string, idx: number) => void
  addBodyMetric: (m: { date: string; weight: number; fat: number; muscle: number }) => void
}

export const useNutriStore = create<NutriStore>((set) => ({
  log: load('nutri_log', {}),
  bodyMetrics: load('nutri_body', []),

  addMeal: (date, mealType, entry) => set(state => {
    const next = { ...state.log }
    if (!next[date]) next[date] = {}
    if (!next[date][mealType]) next[date][mealType] = []
    next[date][mealType] = [...next[date][mealType], entry]
    save('nutri_log', next)
    return { log: next }
  }),

  removeMeal: (date, mealType, idx) => set(state => {
    const next = { ...state.log }
    if (next[date]?.[mealType]) {
      next[date][mealType] = next[date][mealType].filter((_, i) => i !== idx)
      if (next[date][mealType].length === 0) delete next[date][mealType]
      if (Object.keys(next[date]).length === 0) delete next[date]
    }
    save('nutri_log', next)
    return { log: next }
  }),

  addBodyMetric: (m) => set(state => {
    const next = [...state.bodyMetrics, m]
    save('nutri_body', next)
    return { bodyMetrics: next }
  }),
}))
