import { saveToStorage, loadFromStorage } from '@/lib/storage'
import { create } from 'zustand'
import type { DistribucionPreset, FastingPreset } from '@/lib/dietPlanner'

export interface FoodEntry { name: string; kcal: number; p: number; c: number; f: number; grams: number; meal: string }
export interface Dish { id: number; name: string; ingredients: { name: string; kcal: number; p: number; c: number; f: number; grams: number }[]; totalKcal: number; totalP: number; totalC: number; totalF: number }
// servings: raciones del plato (por defecto 1 si falta — compat con datos viejos).
export interface MenuDay { day: number; meals: { meal: string; dishName: string; servings?: number }[] }
export interface BodyMetric { date: string; weight: number; fat: number; muscle: number }
export interface MacroCalc { weight: number; height: number; age: number; gender: 'male' | 'female'; activity: number; goal: 'cut' | 'maintain' | 'bulk' }

// Configuración persistente del plan de dieta (mejoras 1–4). Todo opcional con
// defaults razonables para no romper datos existentes.
export interface DietConfig {
  // 1) Déficit guiado por kg a perder.
  kgObjetivo: number
  semanas: number
  deficitCalculado: number
  // 2) Macros personalizables.
  proteinPerKg: number   // g proteína / kg peso (1.2–3.0)
  fatPct: number         // % kcal de grasa (15–40)
  // 3) Ayuno intermitente (ventana de comidas).
  fastingPreset: FastingPreset
  fastingStartHour: number
  fastingWindowHours: number
  // 4) Creador de dietas.
  numMeals: number
  distribucion: DistribucionPreset
  mealPcts: number[]     // % kcal por slot (vacío = derivar de distribucion)
  trainingHour: number
  trainingDays: number[] // días de entreno (0=Domingo … 6=Sábado)
}

export const DEFAULT_DIET_CONFIG: DietConfig = {
  kgObjetivo: 5,
  semanas: 10,
  deficitCalculado: 500,
  proteinPerKg: 2,
  fatPct: 25,
  fastingPreset: '16:8',
  fastingStartHour: 12,
  fastingWindowHours: 8,
  numMeals: 4,
  distribucion: 'equilibrado',
  mealPcts: [],
  trainingHour: 18,
  trainingDays: [1, 3, 5],
}

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
  dietConfig: DietConfig
  addFood: (date: string, entry: FoodEntry) => void
  removeFood: (date: string, idx: number) => void
  addDish: (dish: Dish) => void
  removeDish: (id: number) => void
  setGoals: (g: { kcal: number; p: number; c: number; f: number; mealPcts?: Record<string, number> }) => void
  setMenuDay: (day: number, meals: { meal: string; dishName: string; servings?: number }[]) => void
  addBodyMetric: (m: BodyMetric) => void
  addWater: (date: string, ml: number) => void
  toggleFavorite: (name: string) => void
  setMacroCalc: (m: MacroCalc) => void
  setDietConfig: (c: Partial<DietConfig>) => void
  startFast: () => void
  endFast: () => void
}

const M_TPCTS = { Desayuno: 25, Comida: 35, Cena: 25, Snack: 10, 'Post-entreno': 5 }

// Cálculo puro de TDEE + macros (Mifflin-St Jeor). Fuente única de verdad:
// lo usan tanto setMacroCalc (Herramientas) como la calculadora de Metas.
export function computeMacros(m: MacroCalc): { tdee: number; kcal: number; p: number; c: number; f: number } {
  const bmr = m.gender === 'male'
    ? 10 * m.weight + 6.25 * m.height - 5 * m.age + 5
    : 10 * m.weight + 6.25 * m.height - 5 * m.age - 161
  const tdee = bmr * [1.2, 1.375, 1.55, 1.725, 1.9][m.activity]
  const kcal = m.goal === 'cut' ? Math.round(tdee - 500) : m.goal === 'bulk' ? Math.round(tdee + 300) : Math.round(tdee)
  const p = m.goal === 'cut' ? Math.round(m.weight * 2.2) : Math.round(m.weight * 1.8)
  const f = Math.round(kcal * 0.25 / 9)
  const c = Math.round((kcal - p * 4 - f * 9) / 4)
  return { tdee: Math.round(tdee), kcal, p, c, f }
}

export const useNutriStore = create<NutriStore>((set, get) => ({
  log: loadFromStorage('nutri_log', {}),
  dishes: loadFromStorage('nutri_dishes', []),
  goals: loadFromStorage('nutri_goals', { kcal: 2500, p: 150, c: 250, f: 80, mealPcts: M_TPCTS }),
  menu: loadFromStorage('nutri_menu', []),
  bodyMetrics: loadFromStorage('nutri_body', []),
  water: loadFromStorage('nutri_water', {}),
  waterGoal: loadFromStorage('nutri_water_goal', 2000),
  favorites: loadFromStorage('nutri_favs', []),
  fasting: loadFromStorage('nutri_fasting', { startTime: null, targetHours: 16, history: [] }),
  macroCalc: loadFromStorage('nutri_macro_calc', { weight: 75, height: 175, age: 30, gender: 'male', activity: 3, goal: 'maintain' }),
  dietConfig: { ...DEFAULT_DIET_CONFIG, ...loadFromStorage('nutri_diet_config', {}) },

  addFood: (date, entry) => set(s => {
    const next = { ...s.log }; if (!next[date]) next[date] = []; next[date] = [...next[date], entry]
    saveToStorage('nutri_log', next); return { log: next }
  }),
  removeFood: (date, idx) => set(s => {
    const next = { ...s.log }; if (next[date]) next[date] = next[date].filter((_, i) => i !== idx)
    if (next[date]?.length === 0) delete next[date]; saveToStorage('nutri_log', next); return { log: next }
  }),
  addDish: (dish) => set(s => { const d = [...s.dishes, dish]; saveToStorage('nutri_dishes', d); return { dishes: d } }),
  removeDish: (id) => set(s => { const d = s.dishes.filter(x => x.id !== id); saveToStorage('nutri_dishes', d); return { dishes: d } }),
  setGoals: (g) => { saveToStorage('nutri_goals', g); set({ goals: g }) },
  setMenuDay: (day, meals) => set(s => { const m = s.menu.filter(x => x.day !== day); m.push({ day, meals }); saveToStorage('nutri_menu', m); return { menu: m } }),
  addBodyMetric: (m) => set(s => { const b = [...s.bodyMetrics, m]; saveToStorage('nutri_body', b); return { bodyMetrics: b } }),
  addWater: (date, ml) => set(s => { const w = { ...s.water }; w[date] = (w[date] || 0) + ml; saveToStorage('nutri_water', w); return { water: w } }),
  toggleFavorite: (name) => set(s => {
    const f = s.favorites.includes(name) ? s.favorites.filter(x => x !== name) : [...s.favorites, name]
    saveToStorage('nutri_favs', f); return { favorites: f }
  }),
  setMacroCalc: (m) => { saveToStorage('nutri_macro_calc', m); set({ macroCalc: m })
    const { kcal, p, c, f } = computeMacros(m)
    const goals = { kcal, p, c, f, mealPcts: get().goals.mealPcts }
    saveToStorage('nutri_goals', goals); set({ goals })
  },
  setDietConfig: (c) => set(s => {
    const next = { ...s.dietConfig, ...c }
    saveToStorage('nutri_diet_config', next)
    return { dietConfig: next }
  }),
  startFast: () => set(s => {
    const now = new Date().toISOString()
    saveToStorage('nutri_fasting', { ...s.fasting, startTime: now })
    return { fasting: { ...s.fasting, startTime: now } }
  }),
  endFast: () => set(s => {
    if (!s.fasting.startTime) return s
    const start = new Date(s.fasting.startTime)
    const hours = Math.round((Date.now() - start.getTime()) / 3600000 * 10) / 10
    const history = [...s.fasting.history, { date: new Date().toISOString().slice(0, 10), hours }]
    const f2 = { startTime: null, targetHours: s.fasting.targetHours, history }
    saveToStorage('nutri_fasting', f2)
    return { fasting: f2 }
  }),
}))

