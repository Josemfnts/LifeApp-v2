import type { Recipe } from '@/types'

export const RECIPES_DB: Recipe[] = [
  {
    name: 'Porridge de avena con plátano',
    cat: 'Desayuno', kcal: 430, p: 18, c: 68, f: 9, servings: 1,
    ingredients: [
      { food: 'Avena', grams: 80 },
      { food: 'Plátano', grams: 100 },
      { food: 'Skyr', grams: 100 },
    ]
  },
  {
    name: 'Tostadas integrales con huevo',
    cat: 'Desayuno', kcal: 370, p: 22, c: 38, f: 13, servings: 1,
    ingredients: [
      { food: 'Pan integral', grams: 80 },
      { food: 'Huevo', grams: 100 },
    ]
  },
  {
    name: 'Pollo con arroz y verduras',
    cat: 'Comida', kcal: 520, p: 42, c: 55, f: 12, servings: 1,
    ingredients: [
      { food: 'Pechuga de pollo', grams: 150 },
      { food: 'Arroz blanco cocido', grams: 200 },
      { food: 'Brócoli', grams: 100 },
      { food: 'Aceite de oliva', grams: 10 },
    ]
  },
  {
    name: 'Ensalada de salmón y aguacate',
    cat: 'Cena', kcal: 470, p: 30, c: 18, f: 30, servings: 1,
    ingredients: [
      { food: 'Salmón', grams: 150 },
      { food: 'Aguacate', grams: 100 },
    ]
  },
  {
    name: 'Batido post-entreno',
    cat: 'Post-entreno', kcal: 450, p: 40, c: 55, f: 10, servings: 1,
    ingredients: [
      { food: 'Proteína whey', grams: 40 },
      { food: 'Plátano', grams: 100 },
      { food: 'Avena', grams: 30 },
    ]
  },
]

export const RECIPE_CATEGORIES = ['Desayuno', 'Comida', 'Cena', 'Snack', 'Post-entreno']
