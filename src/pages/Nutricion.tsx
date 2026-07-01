import { useState } from 'react'
import { Input } from '@/components/ui'
import { useNutriStore } from '@/stores/nutriStore'
import { FOODS_DB, FOOD_CATEGORIES } from '@/data/foods'
import { RECIPES_DB, RECIPE_CATEGORIES } from '@/data/recipes'
import { useToast } from '@/stores/toast'

export default function Nutricion() {
  const [tab, setTab] = useState<'diario' | 'peso' | 'recetas'>('diario')
  const log = useNutriStore(s => s.log)
  const addMeal = useNutriStore(s => s.addMeal)
  const removeMeal = useNutriStore(s => s.removeMeal)
  const bodyMetrics = useNutriStore(s => s.bodyMetrics)
  const addBodyMetric = useNutriStore(s => s.addBodyMetric)
  const toast = useToast()

  const [selFood, setSelFood] = useState('')
  const [grams, setGrams] = useState('100')
  const [mealType, setMealType] = useState('Comida')
  const [foodFilter, setFoodFilter] = useState('')
  const [weight, setWeight] = useState('')
  const [fatPct, setFatPct] = useState('')
  const [musclePct, setMusclePct] = useState('')

  const today = new Date().toISOString().slice(0, 10)
  const todayLog = log[today] || {}
  const allMeals: { type: string; entries: { food: string; grams: number; kcal: number; p: number; f: number; c: number }[] }[] = []

  ;['Desayuno', 'Comida', 'Cena', 'Snack', 'Post-entreno'].forEach(type => {
    if (todayLog[type]?.length) {
      allMeals.push({ type, entries: todayLog[type] })
    }
  })

  const totalKcal = allMeals.reduce((s, m) => s + m.entries.reduce((ss, e) => ss + e.kcal, 0), 0)
  const totalP = allMeals.reduce((s, m) => s + m.entries.reduce((ss, e) => ss + e.p, 0), 0)
  const totalC = allMeals.reduce((s, m) => s + m.entries.reduce((ss, e) => ss + e.c, 0), 0)
  const totalF = allMeals.reduce((s, m) => s + m.entries.reduce((ss, e) => ss + e.f, 0), 0)

  const filtered = FOODS_DB.filter(f =>
    f.name.toLowerCase().includes(foodFilter.toLowerCase()) ||
    f.cat.toLowerCase().includes(foodFilter.toLowerCase())
  ).slice(0, 30)

  function handleAddFood() {
    if (!selFood) return
    const food = FOODS_DB.find(f => f.name === selFood)
    if (!food) return
    const g = parseFloat(grams) || 100
    const ratio = g / 100
    addMeal(today, mealType, {
      food: food.name,
      grams: g,
      kcal: Math.round(food.kcal * ratio),
      p: +(food.p * ratio).toFixed(1),
      f: +(food.f * ratio).toFixed(1),
      c: +(food.c * ratio).toFixed(1),
    })
    toast.show(`✓ ${food.name} añadido (${Math.round(food.kcal * ratio)} kcal)`)
    setSelFood('')
    setGrams('100')
  }

  function handleAddRecipe(name: string) {
    const recipe = RECIPES_DB.find(r => r.name === name)
    if (!recipe) return
    addMeal(today, mealType, {
      food: recipe.name,
      grams: recipe.servings * 100,
      kcal: recipe.kcal,
      p: recipe.p,
      f: recipe.f,
      c: recipe.c,
    })
    toast.show(`✓ ${recipe.name} añadido (${recipe.kcal} kcal)`)
  }

  function handleAddBody() {
    const w = parseFloat(weight)
    if (!w) return
    addBodyMetric({ date: today, weight: w, fat: parseFloat(fatPct) || 0, muscle: parseFloat(musclePct) || 0 })
    toast.show('✓ Métricas guardadas')
    setWeight(''); setFatPct(''); setMusclePct('')
  }

  if (tab === 'diario') {
    return (
      <div className="animate-tab p-4">
        {/* Kcal ring */}
        <div className="flex items-center gap-5 p-4 bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl mb-3">
          <svg width="100" height="100" className="flex-shrink-0" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="#52b788" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - Math.min(1, totalKcal / 2500))}
              style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
          </svg>
          <div>
            <div className="font-serif text-[32px] text-[#52b788] leading-none">{totalKcal}</div>
            <div className="text-xs text-[var(--color-dim)] mt-1">kcal hoy</div>
            <div className="flex gap-2 mt-2 text-[11px]">
              <span className="text-[#5b8af0]">P: {totalP}g</span>
              <span className="text-[#e07a5f]">C: {totalC}g</span>
              <span className="text-[#c9a84c]">G: {totalF}g</span>
            </div>
          </div>
        </div>

        {/* Quick add food */}
        <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mb-3">
          <select value={mealType} onChange={e => setMealType(e.target.value)}
            className="w-full bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3.5 py-2.5 text-sm font-sans mb-2 outline-none cursor-pointer">
            {['Desayuno','Comida','Cena','Snack','Post-entreno'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <Input value={foodFilter} onChange={setFoodFilter} placeholder="Buscar alimento..." className="mb-2" />
          <div className="max-h-[120px] overflow-y-auto mb-2 bg-[var(--color-s2)] rounded-xl border border-[var(--color-border)]">
            {filtered.map(f => (
              <div key={f.name} onClick={() => { setSelFood(f.name); setFoodFilter(f.name) }}
                className={`px-3 py-2 text-sm cursor-pointer border-b border-white/[0.03] last:border-b-0 ${selFood === f.name ? 'bg-[#52b788]/10 text-[#52b788]' : 'text-[var(--color-sub)]'}`}>
                {f.name} <span className="text-[11px] text-[var(--color-dim)]">{f.kcal} kcal/100g</span>
              </div>
            ))}
            {filtered.length === 0 && <div className="px-3 py-2 text-xs text-[var(--color-dim)]">Sin resultados</div>}
          </div>
          <div className="flex gap-2 mb-2">
            <Input value={grams} onChange={setGrams} type="number" placeholder="Gramos" />
            <button onClick={handleAddFood} className="px-6 py-2.5 rounded-xl bg-[#52b788] text-white text-sm font-semibold font-sans cursor-pointer shadow-lg shadow-[#52b788]/25">Añadir</button>
          </div>
          <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-wider mb-2">Platos rápidos</div>
          <div className="flex gap-1.5 flex-wrap">
            {RECIPES_DB.map(r => (
              <button key={r.name} onClick={() => handleAddRecipe(r.name)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#52b788]/10 text-[#52b788] border border-[#52b788]/20 font-sans cursor-pointer">
                {r.name}
              </button>
            ))}
          </div>
        </div>

        {/* Today's meals */}
        {allMeals.length === 0 ? (
          <div className="text-center py-12 text-[13px] text-[var(--color-dim)]">
            <div className="text-[40px] mb-3">🥗</div>
            Sin registros de comida hoy.<br />Busca un alimento y añádelo.
          </div>
        ) : (
          allMeals.map((meal, mi) => (
            <div key={mi} className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl overflow-hidden mb-2.5">
              <div className="px-4 py-2.5 border-b border-[var(--color-border)] text-[11px] font-semibold text-[var(--color-sub)] uppercase tracking-wider">{meal.type}</div>
              {meal.entries.map((e, ei) => (
                <div key={ei} className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] last:border-b-0">
                  <div className="flex-1">
                    <div className="text-[13px] font-medium text-[var(--color-text)]">{e.food}</div>
                    <div className="text-[11px] text-[var(--color-dim)] mt-0.5">{e.grams}g · P:{e.p}g C:{e.c}g G:{e.f}g</div>
                  </div>
                  <div className="font-serif text-base text-[#52b788]">{e.kcal} kcal</div>
                  <button onClick={() => removeMeal(today, meal.type, ei)}
                    className="w-6 h-6 rounded-lg bg-red-500/[0.08] text-[var(--color-red)] border border-red-500/[0.15] text-[11px] font-bold flex items-center justify-center cursor-pointer">✕</button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    )
  }

  if (tab === 'peso') {
    return (
      <div className="animate-tab p-4">
        <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mb-3">
          <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-3">Registrar métricas</div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <Input value={weight} onChange={setWeight} type="number" step="0.1" placeholder="Peso (kg)" />
            <Input value={fatPct} onChange={setFatPct} type="number" step="0.1" placeholder="% Grasa" />
            <Input value={musclePct} onChange={setMusclePct} type="number" step="0.1" placeholder="% Músculo" />
          </div>
          <button onClick={handleAddBody} className="w-full py-2.5 rounded-xl bg-[#52b788] text-white text-sm font-semibold font-sans cursor-pointer shadow-lg shadow-[#52b788]/25">Guardar</button>
        </div>

        {bodyMetrics.length === 0 ? (
          <div className="text-center py-12 text-[13px] text-[var(--color-dim)]">Sin datos de peso registrados.</div>
        ) : (
          <>
            <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mb-3">
              <div className="text-[12px] font-semibold text-[var(--color-sub)] tracking-wide mb-3">Evolución del peso</div>
              <div className="flex items-end gap-1 h-[80px]">
                {[...bodyMetrics].slice(-14).map((m, i) => {
                  const minW = Math.min(...bodyMetrics.map(x => x.weight))
                  const maxW = Math.max(...bodyMetrics.map(x => x.weight))
                  const range = maxW - minW || 1
                  const h = Math.max(4, ((m.weight - minW) / range) * 80)
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-sm bg-[#52b788] transition-all" style={{ height: `${h}px` }} title={`${m.date}: ${m.weight} kg`} />
                      <span className="text-[8px] text-[var(--color-dim)]">{m.date.slice(5)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-3.5 text-center">
                <div className="text-[10px] font-semibold text-[var(--color-dim)] uppercase tracking-wider mb-1">Peso actual</div>
                <div className="font-serif text-[28px] text-[#52b788] leading-none">{bodyMetrics[bodyMetrics.length - 1]?.weight || '—'}</div>
                <div className="text-[11px] text-[var(--color-dim)] mt-0.5">kg</div>
              </div>
              <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-3.5 text-center">
                <div className="text-[10px] font-semibold text-[var(--color-dim)] uppercase tracking-wider mb-1">IMC aprox</div>
                <div className="font-serif text-[28px] text-[#5b8af0] leading-none">
                  {(() => {
                    const w = bodyMetrics[bodyMetrics.length - 1]?.weight
                    return w ? (w / 1.75 ** 2).toFixed(1) : '—'
                  })()}
                </div>
                <div className="text-[11px] text-[var(--color-dim)] mt-0.5">kg/m²</div>
              </div>
            </div>
            {[...bodyMetrics].reverse().slice(0, 10).map((m, i) => (
              <div key={i} className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-3.5 mb-2 flex items-center gap-3">
                <div className="text-xs text-[var(--color-dim)] flex-shrink-0">{m.date}</div>
                <div className="flex-1 grid grid-cols-3 gap-2 text-center text-sm">
                  <div><span className="font-bold text-[var(--color-text)]">{m.weight}</span> <span className="text-[var(--color-dim)] text-xs">kg</span></div>
                  <div><span className="font-bold text-[var(--color-text)]">{m.fat || '—'}</span> <span className="text-[var(--color-dim)] text-xs">% grasa</span></div>
                  <div><span className="font-bold text-[var(--color-text)]">{m.muscle || '—'}</span> <span className="text-[var(--color-dim)] text-xs">% músc</span></div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    )
  }

  if (tab === 'recetas') {
    return (
      <div className="animate-tab p-4">
        <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-3">Recetario</div>
        {RECIPE_CATEGORIES.map(cat => {
          const recipes = RECIPES_DB.filter(r => r.cat === cat)
          if (!recipes.length) return null
          return (
            <div key={cat} className="mb-3">
              <div className="text-xs font-semibold text-[var(--color-sub)] mb-2">{cat}</div>
              {recipes.map(r => (
                <div key={r.name} className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-3.5 mb-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-sm font-semibold text-[var(--color-text)]">{r.name}</div>
                    <div className="text-xs text-[var(--color-sub)]">{r.servings} ración</div>
                  </div>
                  <div className="flex gap-2 text-[11px] mb-2">
                    <span className="text-[#52b788]">{r.kcal} kcal</span>
                    <span>P: {r.p}g</span>
                    <span>C: {r.c}g</span>
                    <span>G: {r.f}g</span>
                  </div>
                  <div className="text-[11px] text-[var(--color-dim)]">
                    {r.ingredients.map(i => `${i.food} (${i.grams}g)`).join(' · ')}
                  </div>
                  <button onClick={() => handleAddRecipe(r.name)}
                    className="mt-2 px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#52b788]/10 text-[#52b788] border border-[#52b788]/20 font-sans cursor-pointer">Añadir al diario</button>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-module" style={{ color: 'var(--color-acc-green)' }}>Nutrición</div>
        <div className="page-title">Nutrición</div>
        <div className="tab-bar">
          {(['diario','peso','recetas'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`tab-btn tab-green${tab === t ? ' active' : ''}`}>
              {t === 'diario' ? 'Diario' : t === 'peso' ? 'Peso' : 'Recetas'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
