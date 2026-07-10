// El viaje de vuelta de compartir: importar contenido del feed a MIS datos.
// "Usar esta rutina" → fisicoStore.routines; "Guardar receta" → nutriStore.dishes;
// "Usar este menú" → nutriStore.menu. Devuelve el mensaje para el toast.
import { useFisicoStore, STATIC_EXERCISES, EXERCISE_COLORS } from '@/stores/fisicoStore'
import { useNutriStore } from '@/stores/nutriStore'
import type { PostType, PostData, RoutinePayload, RecipePayload, DietPayload, WorkoutPayload } from '@/types/social'

const DAY_NUM: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miércoles: 3, miercoles: 3,
  jueves: 4, viernes: 5, sábado: 6, sabado: 6,
}
const MEAL_TYPES = ['Desayuno', 'Comida', 'Cena', 'Snack', 'Post-entreno']

function groupFor(exerciseName: string): string {
  return STATIC_EXERCISES.find(e => e.name.toLowerCase() === exerciseName.toLowerCase())?.group ?? ''
}

/** Etiqueta del botón de importar si el post es importable; null si no lo es. */
export function importLabel(type: PostType, data: PostData | null | undefined): string | null {
  const d = (data ?? {}) as Record<string, unknown>
  switch (type) {
    case 'routine':
      return Array.isArray(d.exercises) && d.exercises.length ? 'Usar esta rutina' : null
    case 'workout':
      return Array.isArray(d.exerciseList) && d.exerciseList.length ? 'Usar como rutina' : null
    case 'recipe':
      return Array.isArray(d.ingredients) && d.ingredients.length ? 'Guardar receta' : null
    case 'diet':
      return Array.isArray(d.days) && d.days.length ? 'Usar este menú' : null
    default:
      return null
  }
}

/** Importa el contenido del post a los datos locales. Devuelve el texto del toast. */
export function importPost(type: PostType, title: string, data: PostData): string {
  switch (type) {
    case 'routine': {
      const p = data as unknown as RoutinePayload
      const name = p.name || title || 'Rutina importada'
      useFisicoStore.getState().saveRoutine(name, p.exercises.map(e => {
        const group = e.group || groupFor(e.name)
        return { name: e.name, group, color: EXERCISE_COLORS[group] ?? '', sets: e.sets || 3, restSeconds: e.restSeconds }
      }))
      return `✓ Rutina "${name}" añadida a tus rutinas`
    }
    case 'workout': {
      const p = data as unknown as WorkoutPayload
      const name = p.routineName || title || 'Entreno importado'
      useFisicoStore.getState().saveRoutine(name, (p.exerciseList ?? []).map(e => {
        const group = groupFor(e.name)
        return { name: e.name, group, color: EXERCISE_COLORS[group] ?? '', sets: e.sets || 3 }
      }))
      return `✓ "${name}" guardado como rutina`
    }
    case 'recipe': {
      const p = data as unknown as RecipePayload
      const name = p.name || title || 'Receta importada'
      // Los ingredientes viajan como texto ("Pechuga — 200 g"); recuperamos los
      // gramos si el formato coincide. Los macros por ingrediente no viajan:
      // solo los totales del plato (chips kcal/P/C/G).
      const ingredients = (p.ingredients ?? []).map(line => {
        const m = /^(.*?)\s*—\s*(\d+(?:[.,]\d+)?)\s*g$/i.exec(line.trim())
        return {
          name: m ? m[1].trim() : line.trim(),
          grams: m ? Math.round(parseFloat(m[2].replace(',', '.'))) : 0,
          kcal: 0, p: 0, c: 0, f: 0,
        }
      })
      useNutriStore.getState().addDish({
        id: Date.now(), name, ingredients,
        totalKcal: p.macros?.kcal ?? 0, totalP: p.macros?.protein ?? 0,
        totalC: p.macros?.carbs ?? 0, totalF: p.macros?.fat ?? 0,
      })
      return `✓ "${name}" guardado en tus platos`
    }
    case 'diet': {
      const p = data as unknown as DietPayload
      const applied: string[] = []
      for (const day of p.days ?? []) {
        const num = DAY_NUM[day.day.trim().toLowerCase()]
        if (num === undefined) continue // día con nombre libre: no sabemos dónde colocarlo
        useNutriStore.getState().setMenuDay(num, day.meals.map(m => ({
          meal: MEAL_TYPES.includes(m.name) ? m.name : 'Comida',
          dishName: m.description,
        })))
        applied.push(day.day)
      }
      if (!applied.length) throw new Error('No se reconocieron los días del menú')
      return `✓ Menú aplicado: ${applied.join(', ')}`
    }
    default:
      throw new Error('Este tipo de publicación no se puede importar')
  }
}
