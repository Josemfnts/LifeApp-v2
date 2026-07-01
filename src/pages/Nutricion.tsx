import { useState, useRef, useEffect } from 'react'
import { useNutriStore, type FoodEntry } from '@/stores/nutriStore'
import { FOODS_DB, FOOD_CATEGORIES } from '@/data/foods'
import { RECIPES_DB, RECIPE_CATEGORIES } from '@/data/recipes'
import { useToast } from '@/stores/toast'
import { Input } from '@/components/ui'
import Chart from 'chart.js/auto'

const MEAL_TYPES = ['Desayuno', 'Comida', 'Cena', 'Snack', 'Post-entreno']
const DOW_S = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

function todayISO() { return new Date().toISOString().slice(0, 10) }

export default function Nutricion() {
  const [tab, setTab] = useState<'diary' | 'dishes' | 'search' | 'goals' | 'menu'>('diary')
  return (
    <div>
      <div className="page-header">
        <div className="page-module" style={{ color: 'var(--color-acc-green)' }}>Nutrición</div>
        <div className="page-title">Alimentación</div>
        <div className="tab-bar">
          {(['diary','dishes','search','goals','menu'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`tab-btn tab-green${tab === t ? ' active' : ''}`}>
              {{diary:'Diario',dishes:'Platos',search:'Buscar',goals:'Metas',menu:'Menú'}[t]}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: 16 }}>
        {tab === 'diary' && <DiaryTab />}
        {tab === 'dishes' && <DishesTab />}
        {tab === 'search' && <SearchTab />}
        {tab === 'goals' && <GoalsTab />}
        {tab === 'menu' && <MenuTab />}
      </div>
    </div>
  )
}

/* ── DIARY TAB ── */
function DiaryTab() {
  const { log, addFood, removeFood, goals } = useNutriStore()
  const toast = useToast()
  const today = todayISO()
  const todayFoods = log[today] || []
  const ringRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  const totalKcal = todayFoods.reduce((s, f) => s + f.kcal, 0)
  const totalP = todayFoods.reduce((s, f) => s + f.p, 0)
  const totalC = todayFoods.reduce((s, f) => s + f.c, 0)
  const totalF = todayFoods.reduce((s, f) => s + f.f, 0)
  const pctKcal = Math.min(100, Math.round(totalKcal / goals.kcal * 100))

  const [meal, setMeal] = useState('Comida')
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [p, setP] = useState('')
  const [c, setC] = useState('')
  const [f, setF] = useState('')
  const [grams, setGrams] = useState('100')

  useEffect(() => {
    if (!ringRef.current) return
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(ringRef.current.getContext('2d')!, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [Math.min(totalKcal, goals.kcal), Math.max(0, goals.kcal - totalKcal)],
          backgroundColor: ['rgba(82,183,136,0.85)', 'rgba(255,255,255,0.06)'],
          borderWidth: 0,
        }]
      },
      options: { cutout: '75%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
    })
  }, [totalKcal, goals.kcal])

  function handleAdd() {
    const k = parseFloat(kcal)
    if (!name.trim() || !k || k <= 0) { toast.show('Introduce nombre y kcal'); return }
    addFood(today, {
      name: name.trim(), kcal: k,
      p: parseFloat(p) || 0, c: parseFloat(c) || 0, f: parseFloat(f) || 0,
      grams: parseFloat(grams) || 100, meal
    })
    toast.show(`✓ ${name.trim()} añadido (${k} kcal)`)
    setName(''); setKcal(''); setP(''); setC(''); setF(''); setGrams('100')
  }

  const mealGroups = MEAL_TYPES.filter(m => todayFoods.some(f => f.meal === m))
    .map(m => ({ meal: m, foods: todayFoods.filter(f => f.meal === m) }))

  return (
    <div>
      {/* Kcal ring + macros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: 16, background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, marginBottom: 12 }}>
        <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
          <canvas ref={ringRef} width={90} height={90} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 22, color: 'var(--color-text)', lineHeight: 1 }}>{totalKcal}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-dim)', marginTop: 2 }}>kcal</div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-sub)', marginBottom: 10 }}>
            <span>Objetivo</span>
            <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{goals.kcal} kcal</span>
            <span style={{ color: 'var(--color-acc-green)', fontWeight: 600 }}>{pctKcal}%</span>
          </div>
          {[{ n: 'Proteína', v: totalP, g: goals.p, c: '#5b8af0' },
            { n: 'Carbos', v: totalC, g: goals.c, c: '#c9a84c' },
            { n: 'Grasa', v: totalF, g: goals.f, c: '#e07a5f' }].map(m => {
            const pct = Math.min(100, Math.round(m.v / m.g * 100))
            return (
              <div key={m.n} style={{ marginBottom: 9 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-sub)' }}>{m.n}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: m.c }}>{m.v} / {m.g}g</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, transition: 'width 0.6s ease', width: `${pct}%`, background: m.c }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick add */}
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div className="sec-label">Registrar alimento</div>
        <select className="inp" value={meal} onChange={e => setMeal(e.target.value)}>
          {MEAL_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <Input value={name} onChange={setName} placeholder="Nombre del alimento..." className="mb-2" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
          <input className="inp" value={kcal} onChange={e => setKcal(e.target.value)} type="number" placeholder="kcal" style={{ marginBottom: 0 }} />
          <input className="inp" value={p} onChange={e => setP(e.target.value)} type="number" placeholder="Prot." style={{ marginBottom: 0 }} />
          <input className="inp" value={c} onChange={e => setC(e.target.value)} type="number" placeholder="Carb." style={{ marginBottom: 0 }} />
          <input className="inp" value={f} onChange={e => setF(e.target.value)} type="number" placeholder="Grasa" style={{ marginBottom: 0 }} />
        </div>
        <Input value={grams} onChange={setGrams} type="number" placeholder="Gramos (default 100g)" className="mb-2" />
        <button onClick={handleAdd} className="btn-primary" style={{ background: 'var(--color-acc-green)', boxShadow: '0 2px 12px rgba(82,183,136,0.25)' }}>Añadir al diario</button>
      </div>

      {/* Food log by meal */}
      <div className="card">
        {todayFoods.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, fontSize: 13, color: 'var(--color-dim)' }}>Sin registros aún.</div>
        ) : mealGroups.map(({ meal: m, foods }) => (
          <div key={m}>
            <div style={{ padding: '8px 16px 0', fontSize: 10, fontWeight: 700, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m}</div>
            {foods.map((f, i) => {
              const realIdx = todayFoods.indexOf(f)
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'rgba(82,183,136,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🍽</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-sub)', marginTop: 2 }}>{f.grams}g · P:{f.p}g C:{f.c}g G:{f.f}g</div>
                  </div>
                  <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 18, color: 'var(--color-acc-green)', fontStyle: 'italic' }}>{f.kcal} kcal</div>
                  <button onClick={() => { removeFood(today, realIdx); toast.show('Alimento eliminado') }}
                    style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(224,95,95,0.08)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.15)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>✕</button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── DISHES TAB ── */
function DishesTab() {
  const { dishes, addDish, removeDish, addFood } = useNutriStore()
  const toast = useToast()
  const [showCreator, setShowCreator] = useState(false)
  const [dName, setDName] = useState('')
  const [ingName, setIngName] = useState('')
  const [ingKcal, setIngKcal] = useState('')
  const [ingP, setIngP] = useState('')
  const [ingC, setIngC] = useState('')
  const [ingF, setIngF] = useState('')
  const [ingGrams, setIngGrams] = useState('100')
  const [ingredients, setIngredients] = useState<{ name: string; kcal: number; p: number; c: number; f: number; grams: number }[]>([])

  function addIngredient() {
    const k = parseFloat(ingKcal)
    if (!ingName.trim() || !k) return
    setIngredients(prev => [...prev, {
      name: ingName.trim(), kcal: k,
      p: parseFloat(ingP) || 0, c: parseFloat(ingC) || 0, f: parseFloat(ingF) || 0,
      grams: parseFloat(ingGrams) || 100
    }])
    setIngName(''); setIngKcal(''); setIngP(''); setIngC(''); setIngF(''); setIngGrams('100')
  }

  function saveDish() {
    if (!dName.trim() || !ingredients.length) { toast.show('Añade nombre e ingredientes'); return }
    const totalKcal = ingredients.reduce((s, i) => s + Math.round(i.kcal * i.grams / 100), 0)
    const totalP = ingredients.reduce((s, i) => s + +(i.p * i.grams / 100).toFixed(1), 0)
    const totalC = ingredients.reduce((s, i) => s + +(i.c * i.grams / 100).toFixed(1), 0)
    const totalF = ingredients.reduce((s, i) => s + +(i.f * i.grams / 100).toFixed(1), 0)
    addDish({ id: Date.now(), name: dName.trim(), ingredients, totalKcal, totalP, totalC, totalF })
    toast.show(`✓ Plato "${dName}" creado (${totalKcal} kcal)`)
    setDName(''); setIngredients([]); setShowCreator(false)
  }

  return (
    <div>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: showCreator ? 12 : 0 }}>
          <div className="sec-label" style={{ marginBottom: 0 }}>{showCreator ? 'Crear plato' : 'Mis platos'}</div>
          <button onClick={() => setShowCreator(!showCreator)}
            style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', background: 'none', border: 'none', fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>
            {showCreator ? '↑ Contraer' : '+ Crear plato'}
          </button>
        </div>
        {showCreator && (
          <>
            <Input value={dName} onChange={setDName} placeholder="Nombre del plato..." className="mb-2" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
              <input className="inp" value={ingName} onChange={e => setIngName(e.target.value)} type="text" placeholder="Ingrediente" style={{ marginBottom: 0 }} />
              <input className="inp" value={ingKcal} onChange={e => setIngKcal(e.target.value)} type="number" placeholder="kcal" style={{ marginBottom: 0 }} />
              <input className="inp" value={ingP} onChange={e => setIngP(e.target.value)} type="number" placeholder="Prot" style={{ marginBottom: 0 }} />
              <input className="inp" value={ingC} onChange={e => setIngC(e.target.value)} type="number" placeholder="Carb" style={{ marginBottom: 0 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <input className="inp" value={ingF} onChange={e => setIngF(e.target.value)} type="number" placeholder="Grasa" style={{ marginBottom: 0 }} />
              <input className="inp" value={ingGrams} onChange={e => setIngGrams(e.target.value)} type="number" placeholder="Gramos" style={{ marginBottom: 0 }} />
            </div>
            <button onClick={addIngredient} className="btn-ghost" style={{ width: 'auto', marginBottom: 8 }}>+ Ingrediente</button>
            {ingredients.length > 0 && (
              <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ingredients.map((ing, i) => (
                  <div key={i} style={{ padding: '2px 10px', borderRadius: 6, background: 'rgba(82,183,136,0.1)', color: 'var(--color-acc-green)', fontSize: 12 }}>
                    {ing.name} {ing.grams}g {ing.kcal}kcal
                    <button onClick={() => setIngredients(prev => prev.filter((_, ii) => ii !== i))} style={{ marginLeft: 6, color: 'var(--color-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={saveDish} className="btn-primary" style={{ background: 'var(--color-acc-green)', boxShadow: '0 2px 12px rgba(82,183,136,0.25)' }}>Guardar plato</button>
          </>
        )}
      </div>

      {dishes.map(d => (
        <div key={d.id} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, marginBottom: 8, position: 'relative' }}>
          <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 17, color: 'var(--color-text)', marginBottom: 4 }}>{d.name}</div>
          <div style={{ fontSize: 12, color: 'var(--color-sub)', marginBottom: 10 }}>{d.totalKcal} kcal · P:{d.totalP}g C:{d.totalC}g G:{d.totalF}g · {d.ingredients.length} ingredientes</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => {
              const today = todayISO()
              d.ingredients.forEach(ing => addFood(today, {
                name: ing.name, kcal: Math.round(ing.kcal * ing.grams / 100),
                p: +(ing.p * ing.grams / 100).toFixed(1), c: +(ing.c * ing.grams / 100).toFixed(1),
                f: +(ing.f * ing.grams / 100).toFixed(1), grams: ing.grams, meal: 'Comida'
              }))
              toast.show(`✓ "${d.name}" añadido al diario`)
            }}
              style={{ flex: 1, padding: 8, borderRadius: 10, background: 'rgba(82,183,136,0.1)', color: 'var(--color-acc-green)', border: '1px solid rgba(82,183,136,0.2)', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>Usar en diario</button>
            <button onClick={() => { removeDish(d.id); toast.show('Plato eliminado') }}
              style={{ width: 36, borderRadius: 10, background: 'rgba(224,95,95,0.08)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.15)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── SEARCH TAB ── */
function SearchTab() {
  const { addFood } = useNutriStore()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [meal, setMeal] = useState('Comida')

  const results = query.trim()
    ? FOODS_DB.filter(f => f.name.toLowerCase().includes(query.toLowerCase())).slice(0, 20)
    : []

  function addFound(f: typeof FOODS_DB[0]) {
    addFood(todayISO(), {
      name: f.name, kcal: f.kcal, p: f.p, c: f.c, f: f.f, grams: 100, meal
    })
    toast.show(`✓ ${f.name} añadido (${f.kcal} kcal)`)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input className="inp" value={query} onChange={e => setQuery(e.target.value)} type="text" placeholder="Buscar alimento..." style={{ flex: 1, marginBottom: 0 }} />
        <select className="inp" value={meal} onChange={e => setMeal(e.target.value)} style={{ width: 120, marginBottom: 0 }}>
          {MEAL_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {!query.trim() && (
        <div style={{ textAlign: 'center', padding: 32, fontSize: 13, color: 'var(--color-dim)' }}>Busca entre 54 alimentos.</div>
      )}

      {results.map(f => (
        <div key={f.name} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, marginBottom: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 3 }}>{f.name}</div>
          <div style={{ fontSize: 12, color: 'var(--color-sub)', marginBottom: 10 }}>{f.cat} · 100g: {f.kcal} kcal | P:{f.p}g C:{f.c}g G:{f.f}g</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 20, fontStyle: 'italic', color: 'var(--color-acc-green)' }}>{f.kcal} kcal</div>
            <div style={{ fontSize: 12, color: 'var(--color-dim)', flex: 1 }}>por 100g</div>
            <button onClick={() => addFound(f)}
              style={{ padding: '7px 18px', borderRadius: 10, background: 'rgba(82,183,136,0.1)', color: 'var(--color-acc-green)', border: '1px solid rgba(82,183,136,0.2)', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>Añadir</button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── GOALS TAB ── */
function GoalsTab() {
  const { goals, setGoals } = useNutriStore()
  const toast = useToast()
  const [kcal, setKcal] = useState(String(goals.kcal))
  const [p, setP] = useState(String(goals.p))
  const [c, setC] = useState(String(goals.c))
  const [f, setF] = useState(String(goals.f))

  function save() {
    const g = {
      kcal: parseInt(kcal) || 2500,
      p: parseInt(p) || 150,
      c: parseInt(c) || 250,
      f: parseInt(f) || 80,
    }
    setGoals(g)
    toast.show('✓ Metas actualizadas')
  }

  return (
    <div>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div className="sec-label">Metas diarias</div>
        {[
          { label: 'Calorías (kcal)', val: kcal, set: setKcal, unit: 'kcal' },
          { label: 'Proteína (g)', val: p, set: setP, unit: 'g' },
          { label: 'Carbohidratos (g)', val: c, set: setC, unit: 'g' },
          { label: 'Grasa (g)', val: f, set: setF, unit: 'g' },
        ].map(m => (
          <div key={m.label} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-sub)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 6 }}>{m.label}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="inp" value={m.val} onChange={e => m.set(e.target.value)} type="number" style={{ flex: 1, marginBottom: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--color-dim)', fontWeight: 500, whiteSpace: 'nowrap' }}>{m.unit}</span>
            </div>
          </div>
        ))}
        <button onClick={save} className="btn-ghost" style={{ border: '1px solid rgba(82,183,136,0.2)', color: 'var(--color-acc-green)', background: 'rgba(82,183,136,0.1)' }}>Guardar metas</button>
      </div>
    </div>
  )
}

/* ── MENU TAB ── */
function MenuTab() {
  const { menu, setMenuDay, dishes } = useNutriStore()
  const toast = useToast()
  const [viewDay, setViewDay] = useState(0)

  const curDay = menu.find(m => m.day === viewDay)
  const curMeals = curDay?.meals || []

  function toggleDish(mealType: string, dishName: string) {
    const existing = curMeals.find(m => m.meal === mealType && m.dishName === dishName)
    const updated = existing
      ? curMeals.filter(m => !(m.meal === mealType && m.dishName === dishName))
      : [...curMeals, { meal: mealType, dishName }]
    setMenuDay(viewDay, updated)
    toast.show(existing ? 'Quitado del menú' : '✓ Añadido al menú')
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {[0, 1, 2, 3, 4, 5, 6].map(d => (
          <button key={d} onClick={() => setViewDay(d)}
            style={{
              flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid',
              background: viewDay === d ? 'rgba(82,183,136,0.15)' : 'var(--color-s2)',
              color: viewDay === d ? 'var(--color-acc-green)' : 'var(--color-dim)',
              borderColor: viewDay === d ? 'rgba(82,183,136,0.3)' : 'var(--color-border)',
            }}>{DOW_S[d]}</button>
        ))}
      </div>

      <div className="sec-label">{DOW_S[viewDay] === 'D' ? 'Domingo' : DOW_S[viewDay] === 'L' ? 'Lunes' : DOW_S[viewDay] === 'M' ? 'Martes' : DOW_S[viewDay] === 'X' ? 'Miércoles' : DOW_S[viewDay] === 'J' ? 'Jueves' : DOW_S[viewDay] === 'V' ? 'Viernes' : 'Sábado'}</div>

      {MEAL_TYPES.map(meal => (
        <div key={meal} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{meal}</div>
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
            {dishes.length === 0 ? (
              <div style={{ padding: 12, fontSize: 12, color: 'var(--color-dim)' }}>Sin platos. Crea uno en la pestaña Platos.</div>
            ) : dishes.map(d => {
              const isSelected = curMeals.some(m => m.meal === meal && m.dishName === d.name)
              return (
                <div key={d.id} onClick={() => toggleDish(meal, d.name)}
                  style={{
                    padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', background: isSelected ? 'rgba(82,183,136,0.08)' : 'transparent',
                  }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? 'var(--color-acc-green)' : 'var(--color-text)' }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-dim)' }}>{d.totalKcal} kcal</div>
                  </div>
                  <div style={{ fontSize: 16 }}>{isSelected ? '✅' : '⬜'}</div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
