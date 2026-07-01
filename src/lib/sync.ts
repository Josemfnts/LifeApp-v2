import { supabase } from './supabase'

const STORE_KEYS = {
  xp: 'josema_rpg_xp_v1',
  agenda_tasks: 'agenda_tasks',
  agenda_recurring: 'agenda_recurring',
  agenda_pending: 'agenda_pending',
  agenda_shifts: 'agenda_shifts',
  habits: 'lifeos_habits_v1',
  habits_log: 'lifeos_habits_log_v1',
  fisico_sessions: 'fisico_sessions',
  fisico_routines: 'fisico_routines',
  fisico_exercises: 'fisico_exercises',
  fisico_runs: 'fisico_runs',
  fisico_run_plans: 'fisico_run_plans',
  fisico_mob_routines: 'fisico_mob_routines',
  fisico_mob_exercises: 'fisico_mob_exercises',
  fisico_mob_sessions: 'fisico_mob_sessions',
  fisico_prs: 'fisico_prs',
  fisico_templates: 'fisico_templates',
  nutri_log: 'nutri_log',
  nutri_dishes: 'nutri_dishes',
  nutri_goals: 'nutri_goals',
  nutri_menu: 'nutri_menu',
  nutri_body: 'nutri_body',
  nutri_water: 'nutri_water',
  nutri_water_goal: 'nutri_water_goal',
  nutri_favs: 'nutri_favs',
  nutri_fasting: 'nutri_fasting',
  nutri_macro_calc: 'nutri_macro_calc',
  finances_tx: 'finances_tx',
  finances_huchas: 'finances_huchas',
  finances_pufos: 'finances_pufos',
  finances_cuentas: 'finances_cuentas',
  finances_budgets: 'finances_budgets',
  finances_recurring: 'finances_recurring',
}

// Check if user is logged in
async function isLoggedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  return !!data.session
}

// Load data from Supabase or localStorage
export async function loadFromCloud<T>(key: string, fallback: T): Promise<T> {
  try {
    const loggedIn = await isLoggedIn()
    if (!loggedIn) {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : fallback
    }
    // Try Supabase first
    const { data, error } = await supabase.from('store_data').select('value').eq('key', key).single()
    if (!error && data?.value) return JSON.parse(data.value) as T
    // Fallback to localStorage
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  }
}

// Save data to both Supabase and localStorage
export async function saveToCloud(key: string, value: unknown): Promise<void> {
  localStorage.setItem(key, JSON.stringify(value))
  try {
    const loggedIn = await isLoggedIn()
    if (loggedIn) {
      await supabase.from('store_data').upsert(
        { key, value: JSON.stringify(value), updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )
    }
  } catch {
    // Silently fail - data is still in localStorage
  }
}

// Sync all local data to cloud (called after login)
export async function syncAllToCloud(): Promise<void> {
  const loggedIn = await isLoggedIn()
  if (!loggedIn) return
  for (const key of Object.values(STORE_KEYS)) {
    const raw = localStorage.getItem(key)
    if (raw) {
      await supabase.from('store_data').upsert(
        { key, value: raw, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )
    }
  }
}

// Download cloud data to localStorage (called after login on new device)
export async function downloadFromCloud(): Promise<void> {
  const loggedIn = await isLoggedIn()
  if (!loggedIn) return
  const { data } = await supabase.from('store_data').select('key, value')
  if (data) {
    data.forEach((row: { key: string; value: string }) => {
      if (row.value) localStorage.setItem(row.key, row.value)
    })
  }
}
