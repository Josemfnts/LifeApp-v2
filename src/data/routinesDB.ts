import rutinasV1 from './rutinas_v1.json'
import rutinasV2 from './rutinas_v2.json'

export interface RoutineExercise {
  nombre: string
  grupo_muscular: string
  series: number
  repeticiones: string
  descanso_seg: number
  notas?: string
}

export interface RoutineSession {
  nombre: string
  ejercicios: RoutineExercise[]
}

export interface RoutineData {
  id: string
  nombre: string
  objetivo: string
  nivel: string
  lugar: string
  dias_semana: number
  duracion_sesion_min: number
  duracion_programa_semanas: number
  equipamiento: string[]
  ejercicios: RoutineExercise[]
  sesiones: RoutineSession[]
}

export interface RoutineSchema {
  objetivos: string[]
  niveles: string[]
  lugares: string[]
}

function parseRoutine(r: Record<string, unknown>): RoutineData {
  const sesiones = (r.sesiones as RoutineSession[]) || []
  const ejercicios = sesiones.length > 0
    ? sesiones[0].ejercicios  // default to first session
    : (r.ejercicios as RoutineExercise[]) || []
  return {
    id: r.id as string,
    nombre: r.nombre as string,
    objetivo: r.objetivo as string,
    nivel: r.nivel as string,
    lugar: r.lugar as string,
    dias_semana: r.dias_semana as number,
    duracion_sesion_min: r.duracion_sesion_min as number,
    duracion_programa_semanas: r.duracion_programa_semanas as number,
    equipamiento: (r.equipamiento as string[]) || [],
    ejercicios,
    sesiones,
  }
}

const allRoutines: RoutineData[] = [
  ...(rutinasV1 as { rutinas: Record<string, unknown>[] }).rutinas.map(parseRoutine),
  ...(rutinasV2 as { rutinas: Record<string, unknown>[] }).rutinas.map(parseRoutine),
]

const seen = new Map<string, RoutineData>()
allRoutines.forEach(r => seen.set(r.id, r))

export const ROUTINES = [...seen.values()]
export const ROUTINES_TOTAL = ROUTINES.length

// Extract schemas
const schemaV1 = (rutinasV1 as { esquema: RoutineSchema }).esquema
const schemaV2 = (rutinasV2 as { esquema: RoutineSchema }).esquema

export const ROUTINE_OBJECTIVES = [...new Set([...schemaV1.objetivos, ...schemaV2.objetivos])]
export const ROUTINE_LEVELS = [...new Set([...schemaV1.niveles, ...schemaV2.niveles])]
export const ROUTINE_PLACES = [...new Set([...schemaV1.lugares, ...schemaV2.lugares])]

const OBJ_LABELS: Record<string, string> = {
  hipertrofia: '💪 Hipertrofia',
  hipertrofia_general: '💪 Hipertrofia General',
  hipertrofia_fuerza: '🏋️ Fuerza + Masa',
  fuerza: '🏋️ Fuerza',
  perdida_grasa: '🔥 Pérdida de grasa',
  salud_movilidad: '🧘 Salud y Movilidad',
  rendimiento_resistencia: '🏃 Rendimiento',
}

const NIVEL_LABELS: Record<string, string> = {
  principiante: '🟢 Principiante',
  principiante_intermedio: '🟡 Princ-Inter',
  intermedio: '🟠 Intermedio',
  avanzado: '🔴 Avanzado',
  todos: '👥 Todos',
}

const LUGAR_LABELS: Record<string, string> = {
  gimnasio: '🏋️ Gimnasio',
  casa_material_basico: '🏠 Casa (material)',
  peso_corporal: '🧘 Peso corporal',
}

export function getObjLabel(obj: string): string { return OBJ_LABELS[obj] || obj }
export function getNivelLabel(n: string): string { return NIVEL_LABELS[n] || n }
export function getLugarLabel(l: string): string { return LUGAR_LABELS[l] || l }

export function filterRoutines(filters: {
  objetivo?: string
  nivel?: string
  lugar?: string
  search?: string
  maxDays?: number
  equipamiento?: string[]
}): RoutineData[] {
  return ROUTINES.filter(r => {
    if (filters.objetivo && r.objetivo !== filters.objetivo) return false
    if (filters.nivel && r.nivel !== filters.nivel) return false
    if (filters.lugar && r.lugar !== filters.lugar) return false
    if (filters.search && !r.nombre.toLowerCase().includes(filters.search.toLowerCase())) return false
    if (filters.maxDays && r.dias_semana > filters.maxDays) return false
    if (filters.equipamiento?.length && !filters.equipamiento.some(e => r.equipamiento.includes(e))) return false
    return true
  })
}

// Exercise library from all routines
export const ALL_EXERCISES = (() => {
  const exs = new Map<string, { nombre: string; grupo_muscular: string; notas?: string }>()
  ROUTINES.forEach(r => {
    r.ejercicios.forEach(e => {
      if (!exs.has(e.nombre)) {
        exs.set(e.nombre, { nombre: e.nombre, grupo_muscular: e.grupo_muscular, notas: e.notas })
      }
    })
  })
  return [...exs.values()]
})()

export const EXERCISE_GROUPS_FROM_ROUTINES = [...new Set(ALL_EXERCISES.map(e => e.grupo_muscular))]
