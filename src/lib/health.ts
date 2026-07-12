// Salud conectada: reloj (Garmin/Amazfit) → agregador (Terra/Vital) → webhook (Edge
// Function) → tabla `health_metrics` (migración 010). Es un módulo conectado tipo
// Notas/Comunidad: NO pasa por store_data ni localStorage — requiere sesión (RLS),
// el webhook escribe y el front solo lee de aquí.
import { supabase } from '@/lib/supabase'

export interface HealthMetricRow {
  date: string // YYYY-MM-DD
  metric: string // slug canónico (ver METRICS)
  value: number
  unit: string | null
  source: string | null
}

// Metadatos de las métricas canónicas. Si el agregador manda otras, se guardan en la
// tabla igualmente pero la UI solo pinta las conocidas.
export const METRICS: Record<string, { label: string; icon: string; color: string; format: (v: number) => string }> = {
  steps: { label: 'Pasos', icon: '👣', color: 'var(--color-acc-green)', format: v => Math.round(v).toLocaleString('es-ES') },
  sleep_minutes: { label: 'Sueño', icon: '😴', color: 'var(--color-acc-purple)', format: v => `${Math.floor(v / 60)}h ${String(Math.round(v % 60)).padStart(2, '0')}m` },
  resting_hr: { label: 'FC reposo', icon: '❤️', color: 'var(--color-red)', format: v => `${Math.round(v)} lpm` },
  stress: { label: 'Estrés', icon: '🧠', color: 'var(--color-acc-orange)', format: v => `${Math.round(v)}/100` },
  body_battery: { label: 'Body Battery', icon: '🔋', color: 'var(--color-acc-green)', format: v => `${Math.round(v)}/100` },
  calories: { label: 'Calorías', icon: '🔥', color: 'var(--color-acc-gold)', format: v => `${Math.round(v)} kcal` },
  distance_m: { label: 'Distancia', icon: '📏', color: 'var(--color-acc-blue)', format: v => `${(v / 1000).toFixed(1)} km` },
  spo2: { label: 'SpO₂', icon: '🫁', color: 'var(--color-acc-blue)', format: v => `${Math.round(v)}%` },
  hr_avg: { label: 'FC media', icon: '💓', color: 'var(--color-red)', format: v => `${Math.round(v)} lpm` },
}

export const METRIC_ORDER = Object.keys(METRICS)

// ── Cuentas de reloj (tabla wearable_accounts, migración 011) ──
// El usuario registra su reloj con las credenciales del proveedor; el conector del
// mini PC (service_role) las lee, valida y sincroniza. Aislamiento por RLS. Los select
// llevan SIEMPRE columnas explícitas (sin `secret`): el cliente no necesita la contraseña.

export type WearableProvider = 'garmin' | 'zepp'

export interface WearableAccount {
  provider: WearableProvider
  email: string
  status: 'pending' | 'connected' | 'error'
  error: string | null
  last_sync: string | null
  sync_requested_at: string | null
}

export const PROVIDERS: Record<WearableProvider, { label: string; icon: string; hint: string }> = {
  garmin: { label: 'Garmin', icon: '⌚', hint: 'La cuenta de Garmin Connect (la app del móvil)' },
  zepp: { label: 'Amazfit (Zepp)', icon: '⌚', hint: 'La cuenta de la app Zepp del móvil' },
}

const ACCOUNT_COLS = 'provider, email, status, error, last_sync, sync_requested_at'

export async function fetchWearableAccounts(): Promise<WearableAccount[]> {
  const { data, error } = await supabase.from('wearable_accounts').select(ACCOUNT_COLS)
  if (error) {
    console.warn('[salud] error cargando wearable_accounts:', error.message)
    return []
  }
  return (data ?? []) as WearableAccount[]
}

// Alta o re-alta de un reloj (re-entrar credenciales resetea a 'pending' para revalidar).
export async function saveWearableAccount(provider: WearableProvider, email: string, secret: string): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return 'Necesitas iniciar sesión'
  const { error } = await supabase.from('wearable_accounts').upsert(
    { user_id: session.user.id, provider, email, secret, status: 'pending', sync_requested_at: new Date().toISOString() },
    { onConflict: 'user_id,provider' },
  )
  return error ? error.message : null
}

export async function deleteWearableAccount(provider: WearableProvider): Promise<string | null> {
  const { error } = await supabase.from('wearable_accounts').delete().eq('provider', provider)
  return error ? error.message : null
}

// Botón "Actualizar": deja la señal; el conector (pasa cada ~5 min) sincroniza al verla.
export async function requestWearableSync(): Promise<string | null> {
  const { error } = await supabase
    .from('wearable_accounts')
    .update({ sync_requested_at: new Date().toISOString() })
    .eq('status', 'connected')
  return error ? error.message : null
}

// Últimos `days` días del usuario logueado (RLS filtra por auth.uid()).
export async function fetchHealthMetrics(days = 7): Promise<HealthMetricRow[]> {
  const since = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('health_metrics')
    .select('date, metric, value, unit, source')
    .gte('date', since)
    .order('date', { ascending: false })
  if (error) {
    console.warn('[salud] error cargando health_metrics:', error.message)
    return []
  }
  return (data ?? []) as HealthMetricRow[]
}
