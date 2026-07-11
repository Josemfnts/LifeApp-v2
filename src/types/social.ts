// Tipos del módulo Comunidad v2 (red social de fitness/wellness).
// Los "payloads" son el contenido estructurado que viaja dentro de
// SocialPost.data (JSONB) según el tipo de publicación. Todos son serializables.

export type PostType =
  | 'text'      // nota de texto libre
  | 'photo'     // foto
  | 'progress'  // foto de progreso físico (con métrica opcional)
  | 'workout'   // entreno completado (resumen estadístico)
  | 'routine'   // rutina de entrenamiento (plantilla)
  | 'recipe'    // receta
  | 'diet'      // dieta semanal (7 días)
  | 'goal'      // objetivo personal
  | 'pr'        // récord personal
  | 'meal'      // comida puntual (legacy)

// --- Payloads por tipo -------------------------------------------------------

export interface RoutineExercise {
  name: string
  group?: string
  sets: number
  reps: string      // "8-12", "5x5"… texto libre
  restSeconds?: number
}
export interface RoutinePayload {
  name: string
  exercises: RoutineExercise[]
}

export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}
export interface RecipePayload {
  name: string
  servings?: number
  ingredients: string[]
  steps: string[]
  macros?: Macros
}

export interface DietMeal {
  name: string      // "Desayuno", "Comida"…
  description: string
}
export interface DietDay {
  day: string       // "Lunes"…
  meals: DietMeal[]
}
export interface DietPayload {
  name: string
  days: DietDay[]
  macros?: Macros   // media diaria opcional
}

export interface GoalMilestone {
  label: string
  done: boolean
}
export interface GoalPayload {
  title: string
  metric?: string          // "peso muerto", "peso corporal"…
  current?: number
  target?: number
  unit?: string            // "kg", "km"…
  deadline?: string        // ISO date
  milestones: GoalMilestone[]
}

export interface WorkoutExerciseSummary {
  name: string
  sets: number
  topWeight?: number
}
export interface WorkoutPayload {
  routineName?: string
  totalKg: number
  exercises: number
  maxWeight?: number
  durationMin?: number
  duration?: number    // legacy (Fisico publica en minutos con esta clave)
  unit?: string
  exerciseList?: WorkoutExerciseSummary[]
}

export interface ProgressPayload {
  metric?: string    // "Peso", "Cintura"…
  value?: number
  unit?: string
  delta?: number     // variación respecto a la medición anterior
}

// Snapshot del post original embebido en un repost (evita joins en el feed).
export interface RepostSnapshot {
  author: string
  type: PostType
  title: string
  body: string
  image_url: string | null
  data: PostData
}

// data es un contenedor libre; cada renderer estrecha al payload de su `type`.
// (No usamos una intersección de payloads porque comparten nombres de campo con
// tipos distintos, p.ej. `exercises`: número en workout, lista en routine.)
export type PostData = { original?: RepostSnapshot } & Record<string, unknown>

// --- Entidades ---------------------------------------------------------------

export interface SocialPost {
  id: number
  user_id: string
  author: string
  type: PostType
  title: string
  body: string
  data: PostData
  image_url: string | null
  likes: number
  comment_count: number
  repost_count: number
  use_count?: number
  repost_of: number | null
  created_at: string
  // derivados en cliente
  liked?: boolean
  mine?: boolean
  avatar_url?: string | null
}

export interface Profile {
  user_id: string
  username: string
  display_name: string
  bio: string
  avatar_url: string | null
  stats: ProfileStats
  follower_count: number
  following_count: number
  created_at: string
  // derivados
  is_me?: boolean
  is_following?: boolean
}

export interface ProfileStats {
  level?: number
  xp?: number
  workouts?: number
  streak?: number
  badges?: string[]
  [k: string]: unknown
}

export interface Comment {
  id: number
  post_id: number
  user_id: string
  author: string
  body: string
  created_at: string
  mine?: boolean
}

export type NotificationType = 'like' | 'comment' | 'follow' | 'repost' | 'use'

export interface Notification {
  id: number
  user_id: string
  actor_id: string
  actor_name: string
  type: NotificationType
  post_id: number | null
  read: boolean
  created_at: string
}

export type FeedMode = 'following' | 'explore'
