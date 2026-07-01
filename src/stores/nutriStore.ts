import { create } from 'zustand'
import { saveToCloud } from '@/lib/sync'

function load<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback } catch { return fallback }
}
function save(key: string, val: unknown) { localStorage.setItem(key, JSON.stringify(val)); saveToCloud(key, val) }

export interface FoodEntry { name: string; kcal: number; p: number; c: number; f: number; grams: number; meal: string }
export interface Dish { id: number; name: string; ingredients: { name: string; kcal: number; p: number; c: number; f: number; grams: number }[]; totalKcal: number; totalP: number; totalC: number; totalF: number }
export interface MenuDay { day: number; meals: { meal: string; dishName: string }[] }
export interface BodyMetric { date: string; weight: number; fat: number; muscle: number }
export interface MacroCalc { weight: number; height: number; age: number; gender: 'male' | 'female'; activity: number; goal: 'cut' | 'maintain' | 'bulk' }

interface NutriStore {
  log: Record<string, FoodEntry[]>
  dishes: Dish[]
  goals: { kcal: number; p: number; c: number; f: number; mealPcts?: Record<string, number> }
  menu: MenuDay[]
  bodyMetrics: BodyMetric[]
  water: Record<string, number>
  waterGoal: number
  favorites: string[]
  fasting: { startTime: string | null; targetHours: number; history: { date: string; hours: number }[] }
  macroCalc: MacroCalc
  addFood: (date: string, entry: FoodEntry) => void
  removeFood: (date: string, idx: number) => void
  addDish: (dish: Dish) => void
  removeDish: (id: number) => void
  setGoals: (g: { kcal: number; p: number; c: number; f: number; mealPcts?: Record<string, number> }) => void
  setMenuDay: (day: number, meals: { meal: string; dishName: string }[]) => void
  addBodyMetric: (m: BodyMetric) => void
  addWater: (date: string, ml: number) => void
  toggleFavorite: (name: string) => void
  setMacroCalc: (m: MacroCalc) => void
  startFast: () => void
  endFast: () => void
}

const M_TPCTS = { Desayuno: 25, Comida: 35, Cena: 25, Snack: 10, 'Post-entreno': 5 }

export const useNutriStore = create<NutriStore>((set, get) => ({
  log: load('nutri_log', {}),
  dishes: load('nutri_dishes', []),
  goals: load('nutri_goals', { kcal: 2500, p: 150, c: 250, f: 80, mealPcts: M_TPCTS }),
  menu: load('nutri_menu', []),
  bodyMetrics: load('nutri_body', []),
  water: load('nutri_water', {}),
  waterGoal: load('nutri_water_goal', 2000),
  favorites: load('nutri_favs', []),
  fasting: load('nutri_fasting', { startTime: null, targetHours: 16, history: [] }),
  macroCalc: load('nutri_macro_calc', { weight: 75, height: 175, age: 30, gender: 'male', activity: 3, goal: 'maintain' }),

  addFood: (date, entry) => set(s => {
    const next = { ...s.log }; if (!next[date]) next[date] = []; next[date] = [...next[date], entry]
    save('nutri_log', next); return { log: next }
  }),
  removeFood: (date, idx) => set(s => {
    const next = { ...s.log }; if (next[date]) next[date] = next[date].filter((_, i) => i !== idx)
    if (next[date]?.length === 0) delete next[date]; save('nutri_log', next); return { log: next }
  }),
  addDish: (dish) => set(s => { const d = [...s.dishes, dish]; save('nutri_dishes', d); return { dishes: d } }),
  removeDish: (id) => set(s => { const d = s.dishes.filter(x => x.id !== id); save('nutri_dishes', d); return { dishes: d } }),
  setGoals: (g) => { save('nutri_goals', g); set({ goals: g }) },
  setMenuDay: (day, meals) => set(s => { const m = s.menu.filter(x => x.day !== day); m.push({ day, meals }); save('nutri_menu', m); return { menu: m } }),
  addBodyMetric: (m) => set(s => { const b = [...s.bodyMetrics, m]; save('nutri_body', b); return { bodyMetrics: b } }),
  addWater: (date, ml) => set(s => { const w = { ...s.water }; w[date] = (w[date] || 0) + ml; save('nutri_water', w); return { water: w } }),
  toggleFavorite: (name) => set(s => {
    const f = s.favorites.includes(name) ? s.favorites.filter(x => x !== name) : [...s.favorites, name]
    save('nutri_favs', f); return { favorites: f }
  }),
  setMacroCalc: (m) => { save('nutri_macro_calc', m); set({ macroCalc: m })
    const bmr = m.gender === 'male' ? 10 * m.weight + 6.25 * m.height - 5 * m.age + 5 : 10 * m.weight + 6.25 * m.height - 5 * m.age - 161
    const tdee = bmr * [1.2, 1.375, 1.55, 1.725, 1.9][m.activity]
    const kcal = m.goal === 'cut' ? Math.round(tdee - 500) : m.goal === 'bulk' ? Math.round(tdee + 300) : Math.round(tdee)
    const p = m.goal === 'cut' ? Math.round(m.weight * 2.2) : Math.round(m.weight * 1.8)
    const f = Math.round(kcal * 0.25 / 9)
    const c = Math.round((kcal - p * 4 - f * 9) / 4)
    const goals = { kcal, p, c, f, mealPcts: get().goals.mealPcts }
    save('nutri_goals', goals); set({ goals })
  },
  startFast: () => set(s => {
    const now = new Date().toISOString()
    save('nutri_fasting', { ...s.fasting, startTime: now })
    return { fasting: { ...s.fasting, startTime: now } }
  }),
  endFast: () => set(s => {
    if (!s.fasting.startTime) return s
    const start = new Date(s.fasting.startTime)
    const hours = Math.round((Date.now() - start.getTime()) / 3600000 * 10) / 10
    const history = [...s.fasting.history, { date: new Date().toISOString().slice(0, 10), hours }]
    const f2 = { startTime: null, targetHours: s.fasting.targetHours, history }
    save('nutri_fasting', f2)
    return { fasting: f2 }
  }),
}))

