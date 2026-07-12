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
