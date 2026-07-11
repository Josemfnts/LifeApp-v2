import recetasV1 from './recetas.json'
import recetasV2 from './recetas_v2.json'

export interface RecipeIngredient {
  nombre: string
  cantidad: number
  unidad: string
}

export interface RecipeMacros {
  kcal: number
  proteina_g: number
  carbohidratos_g: number
  grasas_g: number
  fibra_g?: number
}

export interface Recipe {
  id: string
  nombre: string
  categoria: string
  etiquetas: string[]
  tiempo_min: number
  dificultad: string
  raciones: number
  macros_por_racion: RecipeMacros
  ingredientes: RecipeIngredient[]
  preparacion?: string
}

export interface RecipeSchema {
  categorias: string[]
  etiquetas: string[]
  dificultades: string[]
}

function parseRecipe(r: Record<string, unknown>): Recipe {
  return {
    id: r.id as string,
    nombre: r.nombre as string,
    categoria: r.categoria as string,
    etiquetas: (r.etiquetas as string[]) || [],
    tiempo_min: r.tiempo_min as number,
    dificultad: r.dificultad as string,
    raciones: r.raciones as number,
    macros_por_racion: r.macros_por_racion as RecipeMacros,
    ingredientes: (r.ingredientes as RecipeIngredient[]) || [],
    preparacion: r.preparacion as string,
  }
}

const allRecipes: Recipe[] = [
  ...(recetasV1 as { recetas: Record<string, unknown>[] }).recetas.map(parseRecipe),
  ...(recetasV2 as { recetas: Record<string, unknown>[] }).recetas.map(parseRecipe),
]

// Deduplicate by id (v2 overrides v1)
const seen = new Map<string, Recipe>()
allRecipes.forEach(r => seen.set(r.id, r))

export const RECIPES = [...seen.values()]
export const RECIPE_DIFFICULTIES = [...new Set(RECIPES.map(r => r.dificultad))]

export const DIFFICULTY_LABELS: Record<string, string> = {
  muy_facil: 'Muy fácil',
  facil: 'Fácil',
  media: 'Media',
  dificil: 'Difícil',
  muy_dificil: 'Muy difícil',
}

export function difficultyLabel(x: string): string {
  return DIFFICULTY_LABELS[x] ?? x.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
}
export const RECIPE_CATEGORIES = [...new Set(RECIPES.map(r => r.categoria))]
export const RECIPE_TAGS = [...new Set(RECIPES.flatMap(r => r.etiquetas))]

export function filterRecipes(filters: {
  categoria?: string
  etiquetas?: string[]
  dificultad?: string
  search?: string
  maxTime?: number
  maxKcal?: number
}): Recipe[] {
  return RECIPES.filter(r => {
    if (filters.categoria && r.categoria !== filters.categoria) return false
    if (filters.dificultad && r.dificultad !== filters.dificultad) return false
    if (filters.etiquetas?.length && !filters.etiquetas.some(t => r.etiquetas.includes(t))) return false
    if (filters.search && !r.nombre.toLowerCase().includes(filters.search.toLowerCase())) return false
    if (filters.maxTime && r.tiempo_min > filters.maxTime) return false
    if (filters.maxKcal && r.macros_por_racion.kcal > filters.maxKcal) return false
    return true
  })
}

export const RECIPES_TOTAL = RECIPES.length
