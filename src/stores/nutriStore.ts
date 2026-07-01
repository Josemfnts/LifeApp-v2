import { create } from 'zustand'

function load<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback } catch { return fallback }
}
function save(key: string, val: unknown) { localStorage.setItem(key, JSON.stringify(val)) }

export interface FoodEntry {
  name: string
  kcal: number
  p: number
  c: number
  f: number
  grams: number
  meal: string
}

export interface Dish {
  id: number
  name: string
  ingredients: { name: string; kcal: number; p: number; c: number; f: number; grams: number }[]
  totalKcal: number
  totalP: number
  totalC: number
  totalF: number
}

export interface MenuDay {
  day: number
  meals: { meal: string; dishName: string }[]
}

export interface BodyMetric {
  date: string
  weight: number
  fat: number
  muscle: number
}

interface NutriStore {
  log: Record<string, FoodEntry[]>
  dishes: Dish[]
  goals: { kcal: number; p: number; c: number; f: number }
  menu: MenuDay[]
  bodyMetrics: BodyMetric[]
  water: Record<string, number>
  addFood: (date: string, entry: FoodEntry) => void
  removeFood: (date: string, idx: number) => void
  addDish: (dish: Dish) => void
  removeDish: (id: number) => void
  setGoals: (g: { kcal: number; p: number; c: number; f: number }) => void
  setMenuDay: (day: number, meals: { meal: string; dishName: string }[]) => void
  addBodyMetric: (m: BodyMetric) => void
  addWater: (date: string, ml: number) => void
}

export const useNutriStore = create<NutriStore>((set) => ({
  log: load('nutri_log', {}),
  dishes: load('nutri_dishes', []),
  goals: load('nutri_goals', { kcal: 2500, p: 150, c: 250, f: 80 }),
  menu: load('nutri_menu', []),
  bodyMetrics: load('nutri_body', []),
  water: load('nutri_water', {}),

  addFood: (date, entry) => set(state => {
    const next = { ...state.log }
    if (!next[date]) next[date] = []
    next[date] = [...next[date], entry]
    save('nutri_log', next)
    return { log: next }
  }),
  removeFood: (date, idx) => set(state => {
    const next = { ...state.log }
    if (next[date]) next[date] = next[date].filter((_, i) => i !== idx)
    if (next[date]?.length === 0) delete next[date]
    save('nutri_log', next)
    return { log: next }
  }),
  addDish: (dish) => set(state => {
    const dishes = [...state.dishes, dish]
    save('nutri_dishes', dishes)
    return { dishes }
  }),
  removeDish: (id) => set(state => {
    const dishes = state.dishes.filter(d => d.id !== id)
    save('nutri_dishes', dishes)
    return { dishes }
  }),
  setGoals: (g) => { save('nutri_goals', g); set({ goals: g }) },
  setMenuDay: (day, meals) => set(state => {
    const menu = state.menu.filter(m => m.day !== day)
    menu.push({ day, meals })
    save('nutri_menu', menu)
    return { menu }
  }),
  addBodyMetric: (m) => set(state => {
    const bodyMetrics = [...state.bodyMetrics, m]
    save('nutri_body', bodyMetrics)
    return { bodyMetrics }
  }),
  addWater: (date, ml) => set(state => {
    const water = { ...state.water }
    water[date] = (water[date] || 0) + ml
    save('nutri_water', water)
    return { water }
  }),
}))
