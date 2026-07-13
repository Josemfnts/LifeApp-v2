// Motor de planificación de dietas — lógica pura, sin React ni storage.
// Cubre las 4 mejoras del módulo Nutrición:
//   1) Déficit guiado por kg a perder (kcal/día a partir de kg + semanas).
//   2) Macros personalizables (% grasa, % carbos, g proteína/kg).
//   3) Ventana de ayuno (16:8, 18:6, 20:4, OMAD, personalizado).
//   4) Creador de dietas realista y configurable (nº comidas, contundencia,
//      realismo por momento del día, perfiles entreno/descanso, sustituciones).
//
// Todo son funciones puras + tipos: fáciles de testear y reutilizar desde la UI.

/* ────────────────────────────────────────────────────────────────────────
   1) DÉFICIT GUIADO POR KG
   ──────────────────────────────────────────────────────────────────────── */

// 1 kg de grasa corporal ≈ 7700 kcal. Perder 0,5 kg/sem ≈ 550 kcal/día de déficit.
export const KCAL_PER_KG_FAT = 7700

// Mínimos de seguridad (kcal/día) por sexo — no bajar de aquí.
export const MIN_KCAL = { male: 1500, female: 1200 } as const

export type DeficitRitmo = 'lento' | 'recomendado' | 'moderado' | 'agresivo'

export interface DeficitResult {
  /** Déficit calórico diario recomendado (kcal, siempre ≥ 0). */
  deficitDiario: number
  /** Ritmo real de pérdida (kg/semana) que implica ese déficit. */
  kgPorSemana: number
  /** Clasificación cualitativa del ritmo. */
  ritmo: DeficitRitmo
  /** kcal objetivo = TDEE − déficit, respetando el mínimo por sexo. */
  kcalObjetivo: number
  /** true si el déficit tuvo que recortarse para no bajar del mínimo. */
  limitadoPorMinimo: boolean
  /** Mínimo de seguridad aplicado (kcal). */
  minKcal: number
}

/** Clasifica un ritmo de pérdida (kg/semana) en una etiqueta. */
export function clasificarRitmo(kgPorSemana: number): DeficitRitmo {
  const v = Math.abs(kgPorSemana)
  if (v <= 0.35) return 'lento'
  if (v <= 0.6) return 'recomendado'
  if (v <= 0.85) return 'moderado'
  return 'agresivo'
}

export const RITMO_META: Record<DeficitRitmo, { label: string; color: string; hint: string }> = {
  lento: { label: 'Lento', color: 'var(--color-acc-blue)', hint: 'Cómodo y sostenible, poca pérdida muscular.' },
  recomendado: { label: 'Recomendado', color: 'var(--color-acc-green)', hint: '~0,5 kg/sem: el mejor equilibrio.' },
  moderado: { label: 'Moderado', color: 'var(--color-acc-gold)', hint: 'Rápido pero exigente; cuida la proteína.' },
  agresivo: { label: 'Agresivo', color: 'var(--color-acc-orange)', hint: 'Solo a corto plazo y bajo control.' },
}

/**
 * Calcula el déficit diario para perder `kgObjetivo` en `semanas`, partiendo
 * de un gasto `tdee`. Respeta el mínimo calórico por sexo.
 */
export function computeDeficit(
  kgObjetivo: number,
  semanas: number,
  tdee: number,
  gender: 'male' | 'female',
): DeficitResult {
  const minKcal = MIN_KCAL[gender]
  const kg = Math.max(0, kgObjetivo)
  const sem = Math.max(1, semanas)
  const kgPorSemanaDeseado = kg / sem
  let deficitDiario = Math.round((kgPorSemanaDeseado * KCAL_PER_KG_FAT) / 7)

  // No permitir bajar del mínimo: recorta el déficit si hace falta.
  let kcalObjetivo = Math.round(tdee - deficitDiario)
  let limitadoPorMinimo = false
  if (kcalObjetivo < minKcal) {
    kcalObjetivo = minKcal
    deficitDiario = Math.max(0, Math.round(tdee - minKcal))
    limitadoPorMinimo = true
  }

  // Ritmo real tras aplicar el mínimo.
  const kgPorSemana = (deficitDiario * 7) / KCAL_PER_KG_FAT
  return {
    deficitDiario,
    kgPorSemana: Math.round(kgPorSemana * 100) / 100,
    ritmo: clasificarRitmo(kgPorSemana),
    kcalObjetivo,
    limitadoPorMinimo,
    minKcal,
  }
}

/* ────────────────────────────────────────────────────────────────────────
   2) MACROS PERSONALIZABLES
   ──────────────────────────────────────────────────────────────────────── */

export interface MacroSplitInput {
  kcal: number
  weightKg: number
  /** g de proteína por kg de peso corporal (1.2–3.0). */
  proteinPerKg: number
  /** % de las kcal que van a grasa (15–40). */
  fatPct: number
}

export interface MacroSplit {
  p: number
  c: number
  f: number
  /** % real de kcal aportado por cada macro (para validar que suma 100). */
  pPct: number
  cPct: number
  fPct: number
  /** true si los carbos resultantes son negativos (config imposible). */
  invalido: boolean
}

export const KCAL_PER_G = { p: 4, c: 4, f: 9 } as const

/**
 * Reparte kcal en P/G/C: la proteína viene de g/kg, la grasa de un % de kcal,
 * y los carbohidratos son el resto. Devuelve también el % real de cada macro.
 */
export function computeMacroSplit(input: MacroSplitInput): MacroSplit {
  const kcal = Math.max(0, input.kcal)
  const p = Math.round(input.weightKg * input.proteinPerKg)
  const f = Math.round((kcal * (input.fatPct / 100)) / KCAL_PER_G.f)
  const kcalRestantes = kcal - p * KCAL_PER_G.p - f * KCAL_PER_G.f
  const cRaw = kcalRestantes / KCAL_PER_G.c
  const c = Math.round(Math.max(0, cRaw))
  const pPct = kcal > 0 ? Math.round((p * KCAL_PER_G.p * 100) / kcal) : 0
  const fPct = kcal > 0 ? Math.round((f * KCAL_PER_G.f * 100) / kcal) : 0
  const cPct = Math.max(0, 100 - pPct - fPct)
  return { p, c, f, pPct, cPct, fPct, invalido: cRaw < 0 }
}

/* ────────────────────────────────────────────────────────────────────────
   3) AYUNO INTERMITENTE (ventana de comidas)
   ──────────────────────────────────────────────────────────────────────── */

export type FastingPreset = '16:8' | '18:6' | '20:4' | 'omad' | 'custom'

export interface FastingWindow {
  preset: FastingPreset
  /** Hora (0–23) a la que empieza la ventana de comida. */
  startHour: number
  /** Duración de la ventana de comida en horas. */
  windowHours: number
}

export const FASTING_PRESETS: { preset: FastingPreset; label: string; fast: number; eat: number }[] = [
  { preset: '16:8', label: '16:8', fast: 16, eat: 8 },
  { preset: '18:6', label: '18:6', fast: 18, eat: 6 },
  { preset: '20:4', label: '20:4', fast: 20, eat: 4 },
  { preset: 'omad', label: 'OMAD (23:1)', fast: 23, eat: 1 },
  { preset: 'custom', label: 'Personalizado', fast: 16, eat: 8 },
]

export function windowHoursForPreset(preset: FastingPreset, customHours: number): number {
  const found = FASTING_PRESETS.find(p => p.preset === preset)
  if (!found || preset === 'custom') return Math.max(1, Math.min(24, customHours))
  return found.eat
}

/** Reparte N comidas uniformemente dentro de la ventana [start, start+window]. */
export function mealTimesInWindow(startHour: number, windowHours: number, numMeals: number): string[] {
  const n = Math.max(1, numMeals)
  const times: string[] = []
  if (n === 1) {
    times.push(fmtHour(startHour + windowHours / 2))
    return times
  }
  const step = windowHours / (n - 1)
  for (let i = 0; i < n; i++) times.push(fmtHour(startHour + step * i))
  return times
}

function fmtHour(hourFloat: number): string {
  const total = ((hourFloat % 24) + 24) % 24
  const h = Math.floor(total)
  const m = Math.round((total - h) * 60)
  const mm = m === 60 ? 0 : m
  const hh = m === 60 ? (h + 1) % 24 : h
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/* ────────────────────────────────────────────────────────────────────────
   4) CREADOR DE DIETAS REALISTA Y CONFIGURABLE
   ──────────────────────────────────────────────────────────────────────── */

// Momento del día de un plato: gobierna el realismo (qué se come cuándo).
export type MealMoment = 'desayuno' | 'snack' | 'comida' | 'cena'

// Un "slot" del día: una comida concreta con su nombre y su momento.
export interface MealSlot {
  label: string
  moment: MealMoment
}

// Plantillas de comidas según nº de comidas/día. OMAD = 1.
export const SLOT_TEMPLATES: Record<number, MealSlot[]> = {
  1: [{ label: 'Comida', moment: 'comida' }],
  2: [
    { label: 'Comida', moment: 'comida' },
    { label: 'Cena', moment: 'cena' },
  ],
  3: [
    { label: 'Desayuno', moment: 'desayuno' },
    { label: 'Comida', moment: 'comida' },
    { label: 'Cena', moment: 'cena' },
  ],
  4: [
    { label: 'Desayuno', moment: 'desayuno' },
    { label: 'Comida', moment: 'comida' },
    { label: 'Merienda', moment: 'snack' },
    { label: 'Cena', moment: 'cena' },
  ],
  5: [
    { label: 'Desayuno', moment: 'desayuno' },
    { label: 'Media mañana', moment: 'snack' },
    { label: 'Comida', moment: 'comida' },
    { label: 'Merienda', moment: 'snack' },
    { label: 'Cena', moment: 'cena' },
  ],
  6: [
    { label: 'Desayuno', moment: 'desayuno' },
    { label: 'Media mañana', moment: 'snack' },
    { label: 'Comida', moment: 'comida' },
    { label: 'Merienda', moment: 'snack' },
    { label: 'Cena', moment: 'cena' },
    { label: 'Recena', moment: 'snack' },
  ],
}

export function slotsForMeals(numMeals: number): MealSlot[] {
  const n = Math.max(1, Math.min(6, Math.round(numMeals)))
  return SLOT_TEMPLATES[n]
}

// Perfiles de "contundencia" (reparto de kcal por momento del día).
export type DistribucionPreset = 'equilibrado' | 'mediterraneo' | 'desayuno_fuerte' | 'cena_ligera'

const MOMENT_WEIGHTS: Record<DistribucionPreset, Record<MealMoment, number>> = {
  equilibrado: { desayuno: 25, snack: 10, comida: 35, cena: 30 },
  mediterraneo: { desayuno: 20, snack: 10, comida: 45, cena: 25 },
  desayuno_fuerte: { desayuno: 35, snack: 10, comida: 30, cena: 25 },
  cena_ligera: { desayuno: 32, snack: 13, comida: 43, cena: 12 },
}

export const DISTRIBUCION_LABELS: Record<DistribucionPreset, string> = {
  equilibrado: 'Equilibrado',
  mediterraneo: 'Mediterráneo',
  desayuno_fuerte: 'Desayuno fuerte',
  cena_ligera: 'Cena ligera',
}

/**
 * Reparte el 100% de las kcal entre los slots según el preset de contundencia.
 * Los % de cada slot se derivan del peso de su momento, repartiendo el peso de
 * los snacks entre los snacks presentes. Garantiza que la suma sea exactamente 100.
 */
export function distribucionPorSlots(slots: MealSlot[], preset: DistribucionPreset): number[] {
  const weights = MOMENT_WEIGHTS[preset]
  const snackCount = slots.filter(s => s.moment === 'snack').length || 1
  const raw = slots.map(s => (s.moment === 'snack' ? weights.snack / snackCount : weights[s.moment]))
  const total = raw.reduce((a, b) => a + b, 0) || 1
  const pcts = raw.map(w => (w / total) * 100)
  return roundTo100(pcts)
}

/** Redondea un array de % a enteros cuya suma sea exactamente 100. */
export function roundTo100(pcts: number[]): number[] {
  const floored = pcts.map(p => Math.floor(p))
  let remainder = 100 - floored.reduce((a, b) => a + b, 0)
  // Reparte el resto a los que tienen mayor parte decimal.
  const order = pcts
    .map((p, i) => ({ i, frac: p - Math.floor(p) }))
    .sort((a, b) => b.frac - a.frac)
  const result = [...floored]
  for (let k = 0; k < order.length && remainder > 0; k++) {
    result[order[k].i]++
    remainder--
  }
  return result
}

// Un plato candidato normalizado (por ración) con su clasificación de momento.
export interface PlanDish {
  name: string
  kcal: number
  p: number
  c: number
  f: number
  moments: MealMoment[]
  icon: string
  /** carb-heavy (útil para acercar carbos al entreno). */
  carbShare: number
}

// Momentos permitidos por slot: qué categorías de plato son realistas.
const MOMENT_ALLOWS: Record<MealMoment, MealMoment[]> = {
  desayuno: ['desayuno'],
  snack: ['snack'],
  comida: ['comida', 'cena'],
  cena: ['cena', 'comida'],
}

/** Clasifica una categoría de receta en un momento del día. */
export function categoriaToMoment(categoria: string): MealMoment {
  const c = categoria.toLowerCase()
  if (c.includes('desayuno')) return 'desayuno'
  if (c.includes('snack') || c.includes('postre') || c.includes('merienda')) return 'snack'
  if (c.includes('cena')) return 'cena'
  return 'comida'
}

// Palabras que delatan realismo: desayuno vs plato contundente.
const DESAYUNO_HINTS = ['avena', 'yogur', 'huevo', 'tortita', 'batido', 'fruta', 'tostada', 'porridge', 'cereal', 'café', 'leche', 'smoothie', 'skyr']
const CONTUNDENTE_HINTS = ['arroz', 'lenteja', 'pasta', 'garbanzo', 'legumbre', 'guiso', 'estofado', 'paella', 'cocido', 'alubia']
const SNACK_HINTS = ['fruto', 'nuez', 'almendra', 'fruta', 'yogur', 'barrita', 'batido']

const MOMENT_ICON: Record<MealMoment, string> = {
  desayuno: '🥣',
  snack: '🥜',
  comida: '🍽️',
  cena: '🍲',
}

/** Deriva un icono representativo a partir del nombre/momento del plato. */
export function dishIcon(name: string, moment: MealMoment): string {
  const n = name.toLowerCase()
  if (/huevo|tortilla/.test(n)) return '🍳'
  if (/yogur|skyr|kéfir|kefir/.test(n)) return '🥛'
  if (/avena|porridge|cereal|muesli/.test(n)) return '🥣'
  if (/batido|smoothie|proteín|whey/.test(n)) return '🥤'
  if (/fruta|manzana|plátano|platano|naranja|fresa|kiwi/.test(n)) return '🍎'
  if (/nuez|almendra|fruto|pistacho|cacahuete/.test(n)) return '🥜'
  if (/pollo|pavo|carne|ternera|cerdo/.test(n)) return '🍗'
  if (/salmón|salmon|pescado|atún|atun|merluza/.test(n)) return '🐟'
  if (/ensalada|verdura|brócoli|brocoli/.test(n)) return '🥗'
  if (/arroz|pasta|paella/.test(n)) return '🍚'
  if (/sopa|crema|guiso|estofado/.test(n)) return '🍲'
  return MOMENT_ICON[moment]
}

/**
 * Ajusta la lista de momentos de un plato aplicando heurística de realismo:
 * un plato "contundente" (arroz/legumbres/pasta) NO es válido para desayuno;
 * platos ligeros/dulces sí encajan como desayuno o snack.
 */
export function refineMoments(name: string, base: MealMoment): MealMoment[] {
  const n = name.toLowerCase()
  const moments = new Set<MealMoment>([base])
  const esDesayuno = DESAYUNO_HINTS.some(h => n.includes(h))
  const esContundente = CONTUNDENTE_HINTS.some(h => n.includes(h))
  const esSnack = SNACK_HINTS.some(h => n.includes(h))

  if (esDesayuno && !esContundente) moments.add('desayuno')
  if (esSnack && !esContundente) moments.add('snack')
  if (esContundente) {
    moments.delete('desayuno')
    moments.add('comida')
  }
  // Un plato de comida/cena sirve para ambos.
  if (base === 'comida' && !esContundente) moments.add('cena')
  if (base === 'cena' && !esContundente) moments.add('comida')
  return [...moments]
}

/** Construye un PlanDish a partir de sus datos crudos por ración. */
export function makePlanDish(raw: {
  name: string; kcal: number; p: number; c: number; f: number; categoria?: string
}): PlanDish {
  const base = raw.categoria ? categoriaToMoment(raw.categoria) : 'comida'
  const moments = refineMoments(raw.name, base)
  const carbKcal = raw.c * KCAL_PER_G.c
  const carbShare = raw.kcal > 0 ? carbKcal / raw.kcal : 0
  return {
    name: raw.name,
    kcal: Math.max(1, Math.round(raw.kcal)),
    p: Math.round(raw.p),
    c: Math.round(raw.c),
    f: Math.round(raw.f),
    moments,
    icon: dishIcon(raw.name, base),
    carbShare,
  }
}

// Perfil del día: entreno (mantenimiento, más carbos) o descanso (déficit, más grasa).
export type DayProfile = 'training' | 'rest'

export interface GeneratedMeal {
  slot: string
  moment: MealMoment
  time: string
  dishName: string
  icon: string
  /** factor de ración aplicado para acercarse al objetivo del slot. */
  servings: number
  kcal: number
  p: number
  c: number
  f: number
  targetKcal: number
}

export interface GeneratedDay {
  profile: DayProfile
  meals: GeneratedMeal[]
  totalKcal: number
  totalP: number
  totalC: number
  totalF: number
  goalKcal: number
}

export interface PlanConfig {
  numMeals: number
  distribucion: DistribucionPreset
  /** % kcal por slot (si se personaliza; si no, se deriva de distribucion). */
  mealPcts?: number[]
  fasting: FastingWindow
  /** Hora del entreno (0–23) para acercar carbos. */
  trainingHour: number
}

interface DayTargets {
  goalKcal: number
  p: number
  c: number
  f: number
}

// Escala una ración entre 0.5x y 2x para acercarse al objetivo de kcal del slot.
function bestServings(dishKcal: number, targetKcal: number): number {
  if (dishKcal <= 0) return 1
  const raw = targetKcal / dishKcal
  const clamped = Math.max(0.5, Math.min(2, raw))
  return Math.round(clamped * 4) / 4 // pasos de 0.25
}

/**
 * Elige el mejor plato para un slot: filtra por momento realista, escala la
 * ración y puntúa por cercanía a las kcal objetivo (y a más carbos si toca).
 * `exclude` permite pedir un plato distinto (sustituir/regenerar).
 * `seed` introduce aleatoriedad controlada para "regenerar".
 */
export function pickDishForSlot(
  slot: MealSlot,
  targetKcal: number,
  pool: PlanDish[],
  opts: { exclude?: string[]; preferCarbs?: boolean; random?: boolean } = {},
): { dish: PlanDish; servings: number } | null {
  const allowed = MOMENT_ALLOWS[slot.moment]
  let candidates = pool.filter(
    d => d.moments.some(m => allowed.includes(m)) && !(opts.exclude || []).includes(d.name),
  )
  if (candidates.length === 0) {
    candidates = pool.filter(d => !(opts.exclude || []).includes(d.name))
  }
  if (candidates.length === 0) return null

  const scored = candidates.map(d => {
    const servings = bestServings(d.kcal, targetKcal)
    const kcal = d.kcal * servings
    const kcalErr = targetKcal > 0 ? Math.abs(kcal - targetKcal) / targetKcal : 0
    const carbBonus = opts.preferCarbs ? -d.carbShare * 0.15 : 0
    const noise = opts.random ? Math.random() * 0.25 : 0
    return { dish: d, servings, score: kcalErr + carbBonus + noise }
  })
  scored.sort((a, b) => a.score - b.score)
  return { dish: scored[0].dish, servings: scored[0].servings }
}

/** Sustituye un plato por otro de macros parecidas (mismo momento, distinto alimento). */
export function substituteDish(
  slot: MealSlot,
  current: GeneratedMeal,
  pool: PlanDish[],
): { dish: PlanDish; servings: number } | null {
  const allowed = MOMENT_ALLOWS[slot.moment]
  const candidates = pool.filter(d => d.moments.some(m => allowed.includes(m)) && d.name !== current.dishName)
  if (candidates.length === 0) return null
  // Puntúa por cercanía de macros (P/C/F) a la comida actual, ya escalada.
  const scored = candidates.map(d => {
    const servings = bestServings(d.kcal, current.targetKcal)
    const dp = d.p * servings, dc = d.c * servings, df = d.f * servings
    const err =
      Math.abs(dp - current.p) + Math.abs(dc - current.c) + Math.abs(df - current.f)
    return { dish: d, servings, score: err }
  })
  scored.sort((a, b) => a.score - b.score)
  return { dish: scored[0].dish, servings: scored[0].servings }
}

/** Objetivos de macros/kcal del día según perfil (entreno vs descanso). */
export function dayTargets(
  base: { deficitKcal: number; maintenanceKcal: number; weightKg: number; proteinPerKg: number; fatPct: number },
  profile: DayProfile,
): DayTargets {
  // Entreno: mantenimiento + más carbos (menos grasa). Descanso: déficit + más grasa.
  const goalKcal = profile === 'training' ? base.maintenanceKcal : base.deficitKcal
  const fatPct = profile === 'training' ? Math.max(15, base.fatPct - 5) : base.fatPct + 5
  const split = computeMacroSplit({ kcal: goalKcal, weightKg: base.weightKg, proteinPerKg: base.proteinPerKg, fatPct })
  return { goalKcal, p: split.p, c: split.c, f: split.f }
}

/**
 * Genera el plan de UN día: elige un plato por slot respetando el realismo,
 * el reparto de kcal (contundencia) y acercando los carbos al entreno.
 */
export function generateDay(
  config: PlanConfig,
  targets: DayTargets,
  profile: DayProfile,
  pool: PlanDish[],
): GeneratedDay {
  const slots = slotsForMeals(config.numMeals)
  const pcts = config.mealPcts && config.mealPcts.length === slots.length
    ? config.mealPcts
    : distribucionPorSlots(slots, config.distribucion)
  const times = mealTimesInWindow(config.fasting.startHour, config.fasting.windowHours, slots.length)

  const meals: GeneratedMeal[] = []
  const used: string[] = []
  slots.forEach((slot, i) => {
    const targetKcal = Math.round((targets.goalKcal * pcts[i]) / 100)
    // ¿Está esta comida cerca del entreno? → preferir carbos.
    const mealHour = parseInt(times[i].slice(0, 2), 10)
    const preferCarbs = Math.abs(mealHour - config.trainingHour) <= 2
    const pick = pickDishForSlot(slot, targetKcal, pool, { exclude: used, preferCarbs, random: true })
    if (!pick) return
    used.push(pick.dish.name)
    meals.push(buildMeal(slot, times[i], targetKcal, pick.dish, pick.servings))
  })

  return summarizeDay(profile, meals, targets.goalKcal)
}

/** Construye un GeneratedMeal a partir de un plato + factor de ración. */
export function buildMeal(
  slot: MealSlot,
  time: string,
  targetKcal: number,
  dish: PlanDish,
  servings: number,
): GeneratedMeal {
  return {
    slot: slot.label,
    moment: slot.moment,
    time,
    dishName: dish.name,
    icon: dish.icon,
    servings,
    kcal: Math.round(dish.kcal * servings),
    p: Math.round(dish.p * servings),
    c: Math.round(dish.c * servings),
    f: Math.round(dish.f * servings),
    targetKcal,
  }
}

/** Recalcula los totales de un día a partir de sus comidas. */
export function summarizeDay(profile: DayProfile, meals: GeneratedMeal[], goalKcal: number): GeneratedDay {
  const totalKcal = meals.reduce((s, m) => s + m.kcal, 0)
  const totalP = meals.reduce((s, m) => s + m.p, 0)
  const totalC = meals.reduce((s, m) => s + m.c, 0)
  const totalF = meals.reduce((s, m) => s + m.f, 0)
  return { profile, meals, totalKcal, totalP, totalC, totalF, goalKcal }
}
