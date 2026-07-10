// Mapeadores entidad → post social. Convierten los datos reales de la app
// (entrenos, rutinas, PRs, carreras, platos, menú, peso) en el NewPost
// estructurado que renderiza la Comunidad. Compartir nace donde está el dato:
// las páginas llaman a estos mapeadores y abren <ShareSheet post={...}/>.
import type { NewPost } from './social'
import type {
  RoutinePayload, RecipePayload, DietPayload, WorkoutPayload, ProgressPayload,
} from '@/types/social'
import type { TrainingSession, Routine, PR, RunRecord } from '@/stores/fisicoStore'
import type { Dish, MenuDay } from '@/stores/nutriStore'

// menu.day usa el convenio de Date.getDay(): 0=Domingo … 6=Sábado.
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
// Para leer la semana al estilo español (Lunes primero, Domingo al final).
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

function fmtTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.round(totalSeconds % 60)
  return h > 0 ? `${h}h ${m}m` : `${m}:${String(s).padStart(2, '0')}`
}

/** Entreno de fuerza terminado → post 'workout' con resumen y ejercicios. */
export function sessionToPost(s: TrainingSession, unit: 'kg' | 'lb' = 'kg'): NewPost {
  let maxWeight = 0
  const exerciseList = s.exercises
    .map(ex => {
      const done = ex.sets.filter(st => st.done && st.type !== 'warmup')
      const top = done.reduce((m, st) => Math.max(m, st.weight), 0)
      maxWeight = Math.max(maxWeight, top)
      return { name: ex.name, sets: done.length, topWeight: top || undefined }
    })
    .filter(e => e.sets > 0)
  const data: WorkoutPayload = {
    routineName: s.name,
    totalKg: Math.round(s.totalKg),
    exercises: exerciseList.length || s.exercises.length,
    maxWeight: maxWeight || undefined,
    durationMin: s.duration || undefined,
    unit,
    exerciseList: exerciseList.length ? exerciseList : undefined,
  }
  return { type: 'workout', title: s.name, body: '', data: data as unknown as NewPost['data'] }
}

/** Rutina guardada → post 'routine' con la lista de ejercicios. */
export function routineToPost(r: Routine): NewPost {
  const data: RoutinePayload = {
    name: r.name,
    exercises: r.exercises.map(e => ({
      name: e.name, group: e.group, sets: e.sets, reps: '', restSeconds: e.restSeconds,
    })),
  }
  return { type: 'routine', title: r.name, body: '', data: data as unknown as NewPost['data'] }
}

/** Récord personal → post 'pr' (texto: el tipo ya lleva 🏅 en la Comunidad). */
export function prToPost(pr: PR, unit: 'kg' | 'lb' = 'kg'): NewPost {
  return {
    type: 'pr',
    title: `Nuevo récord: ${pr.exercise}`,
    body: `${pr.weight} ${unit} × ${pr.reps} reps (${pr.date})`,
    data: {},
  }
}

/** Carrera → post 'progress' con distancia, tiempo y ritmo. */
export function runToPost(r: RunRecord): NewPost {
  const paceSec = r.distance > 0 ? r.timeSeconds / r.distance : 0
  const pace = paceSec ? `${Math.floor(paceSec / 60)}:${String(Math.round(paceSec % 60)).padStart(2, '0')} /km` : ''
  const data: ProgressPayload = { metric: 'Carrera', value: r.distance, unit: 'km' }
  const extras = [fmtTime(r.timeSeconds), pace, r.hr ? `${r.hr} bpm` : '', r.elevation ? `+${r.elevation}m` : '']
    .filter(Boolean).join(' · ')
  return { type: 'progress', title: r.type || 'Carrera', body: extras, data: data as unknown as NewPost['data'] }
}

/** Plato propio de Nutrición → post 'recipe' con ingredientes y macros. */
export function dishToPost(d: Dish): NewPost {
  const data: RecipePayload = {
    name: d.name,
    ingredients: d.ingredients.map(i => `${i.name} — ${i.grams} g`),
    steps: [],
    macros: { kcal: d.totalKcal, protein: d.totalP, carbs: d.totalC, fat: d.totalF },
  }
  return { type: 'recipe', title: d.name, body: '', data: data as unknown as NewPost['data'] }
}

/** Menú semanal → post 'diet' con los días que tengan comidas. */
export function menuToPost(menu: MenuDay[], title = 'Mi menú semanal'): NewPost | null {
  const days = [...menu]
    .filter(m => m.meals.length > 0)
    .sort((a, b) => WEEK_ORDER.indexOf(a.day) - WEEK_ORDER.indexOf(b.day))
    .map(m => ({
      day: DAYS[m.day] ?? `Día ${m.day + 1}`,
      meals: m.meals.map(x => ({ name: x.meal, description: x.dishName })),
    }))
  if (!days.length) return null
  const data: DietPayload = { name: title, days }
  return { type: 'diet', title, body: '', data: data as unknown as NewPost['data'] }
}

/** Última medición corporal → post 'progress' con delta vs anterior. */
export function bodyProgressToPost(metrics: { date: string; weight: number }[]): NewPost | null {
  if (!metrics.length) return null
  const last = metrics[metrics.length - 1]
  const prev = metrics.length > 1 ? metrics[metrics.length - 2] : null
  const data: ProgressPayload = {
    metric: 'Peso',
    value: last.weight,
    unit: 'kg',
    delta: prev ? Math.round((last.weight - prev.weight) * 10) / 10 : undefined,
  }
  return { type: 'progress', title: 'Progreso de peso', body: '', data: data as unknown as NewPost['data'] }
}
