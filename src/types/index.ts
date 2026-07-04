export interface XPArea {
  total: number
  log: XPEntry[]
}

export interface XPEntry {
  amount: number
  concept: string
  date: string
}

export type AreaStat = 'disc' | 'fuerza' | 'intel' | 'riqueza'

export interface LevelInfo {
  level: number
  current: number
  needed: number
  pct: number
}

export interface Goal {
  name: string
  current: number
  goal: number
  stat: AreaStat
}

export interface Habit {
  id: number
  name: string
  emoji: string
  color: string
  type: 'bool' | 'count' | 'avoid'
  freq: 'daily' | 'weekdays' | 'weekend' | 'custom'
  goal: number
  unit: string
  note: string
  days: number[]
  createdAt: string
}

export interface HabitLog {
  [date: string]: {
    [habitId: number]: number
  }
}

export interface Task {
  text: string
  time: string
  color: string
  done: boolean
  isOverdue?: boolean
  subtasks?: SubTask[]
}

export interface SubTask {
  text: string
  done: boolean
}

export interface RecurringTask {
  text: string
  color: string
}

export interface ShiftRecord {
  [date: string]: 'TM' | 'TT' | 'TN' | 'L'
}

export interface Exercise {
  name: string
  group: string
  sets: number
}

export interface SessionSet {
  setNumber: number
  weight: number
  reps: number
  done: boolean
}

export interface SessionExercise {
  name: string
  group: string
  color: string
  sets: SessionSet[]
}

export interface TrainingSession {
  name: string
  date: string
  duration: number
  totalKg: number
  exercises: SessionExercise[]
  notes: string
}

export interface Routine {
  id: number
  name: string
  exercises: RoutineExercise[]
}

export interface RoutineExercise {
  name: string
  group: string
  color: string
  sets: number
}

export interface Food {
  name: string
  cat: string
  kcal: number
  p: number
  f: number
  c: number
}

export interface Recipe {
  name: string
  cat: string
  kcal: number
  p: number
  c: number
  f: number
  servings: number
  ingredients: { food: string; grams: number }[]
}

export interface MealEntry {
  food: string
  grams: number
  kcal: number
  p: number
  f: number
  c: number
}

export interface Transaction {
  id?: number
  date: string
  amount: number
  type: 'income' | 'expense'
  category: string
  description: string
}

export interface Hucha {
  name: string
  target: number
  current: number
  color: string
}

export interface Pufo {
  name: string
  total: number
  paid: number
  creditor: string
}

export const AREA_COLORS: Record<AreaStat, string> = {
  disc: 'var(--color-acc-blue)',
  fuerza: 'var(--color-acc-green)',
  intel: 'var(--color-acc-orange)',
  riqueza: 'var(--color-acc-gold)',
}

export const AREA_ICONS: Record<AreaStat, string> = {
  disc: '📋',
  fuerza: '🥗',
  intel: '🏋️',
  riqueza: '💶',
}

export const AREA_NAMES: Record<AreaStat, string> = {
  disc: 'Disciplina',
  fuerza: 'Salud',
  intel: 'Físico',
  riqueza: 'Finanzas',
}

export const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export const MONTHS_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

export const DAYS = [
  'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado',
]

export const COLOR_HEX: Record<string, string> = {
  blue: 'var(--color-acc-blue)',
  red: 'var(--color-red)',
  yellow: 'var(--color-acc-gold)',
  purple: 'var(--color-acc-purple)',
  green: 'var(--color-acc-green)',
}

export const STORAGE_KEYS = {
  XP: 'josema_rpg_xp_v1',
  MISSIONS: 'josema_rpg_missions_v1',
  USERNAME: 'lifeos_username_v1',
  TIME: 'josema_rpg_time_v4',
  RECURRING: 'josema_rpg_rec_v4',
  PENDING: 'lifeos_agenda_pending_v1',
  SHIFTS: 'lifeos_agenda_shifts_v1',
  NUTRI_LOG: 'josema_rpg_nutri_log',
  SESSIONS: 'lifeos_sessions_v1',
  ROUTINES: 'lifeos_routines_v1',
  EXERCISES: 'lifeos_exercises_v1',
  PRS: 'lifeos_prs_v1',
  FINANCES_TX: 'lifeos_finances_tx_v1',
  FINANCES_HUCHAS: 'lifeos_finances_huchas_v1',
  FINANCES_PUFOS: 'lifeos_finances_pufos_v1',
  HABITS: 'lifeos_habits_v1',
  HABITS_LOG: 'lifeos_habits_log_v1',
  NUTRI_BODY: 'lifeos_nutri_body_v1',
  NUTRI_MENU: 'lifeos_nutri_menu_v1',
  NUTRI_MENU_PLANS: 'lifeos_nutri_menu_plans_v1',
  NUTRI_FOODS: 'josema_rpg_foods',
  NUTRI_RECIPES: 'josema_rpg_nutri_recipes',
} as const
