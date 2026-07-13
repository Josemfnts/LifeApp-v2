import { useState, useRef, useEffect, useMemo } from 'react'
import { useNutriStore, computeMacros, type MacroCalc } from '@/stores/nutriStore'
import {
  computeDeficit, RITMO_META,
  computeMacroSplit, FASTING_PRESETS, windowHoursForPreset,
  slotsForMeals, distribucionPorSlots, DISTRIBUCION_LABELS, roundTo100,
  makePlanDish, dayTargets, generateDay, pickDishForSlot, substituteDish, buildMeal, summarizeDay,
  type PlanDish, type PlanConfig, type DayProfile, type GeneratedDay, type DistribucionPreset,
} from '@/lib/dietPlanner'
import type { NewPost } from '@/lib/social'
import { ShareSheet } from '@/components/social/ShareSheet'
import { dishToPost, menuToPost, bodyProgressToPost } from '@/lib/socialShare'
import { FOODS_DB } from '@/data/foods'
import { RECIPES, RECIPE_CATEGORIES, RECIPE_TAGS, RECIPE_DIFFICULTIES, filterRecipes, difficultyLabel } from '@/data/recipesDB'
import { useToast } from '@/stores/toast'
import { Input } from '@/components/ui'
import Chart from 'chart.js/auto'

const MEAL_TYPES = ['Desayuno', 'Comida', 'Cena', 'Snack', 'Post-entreno']
const DOW_S = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

function todayISO() { return new Date().toISOString().slice(0, 10) }

export default function Nutricion() {
  const [tab, setTab] = useState<'diary' | 'dishes' | 'search' | 'goals' | 'plan' | 'menu' | 'tools'>('diary')
  return (
    <div>
      <div className="page-header">
        <div className="page-title">Nutrición</div>
        <div className="tab-bar">
          {(['diary','dishes','search','goals','plan','menu','tools'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`tab-btn tab-green${tab === t ? ' active' : ''}`}>
              {{diary:'Diario',dishes:'Platos',search:'Buscar',goals:'Metas',plan:'Plan',menu:'Menú',tools:'Herram.'}[t]}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: 16 }}>
        {tab === 'diary' && <DiaryTab />}
        {tab === 'dishes' && <DishesTab />}
        {tab === 'search' && <SearchTab />}
        {tab === 'goals' && <GoalsTab />}
        {tab === 'plan' && <PlanTab />}
        {tab === 'menu' && <MenuTab />}
        {tab === 'tools' && <ToolsTab />}
      </div>
    </div>
  )
}

/* ── DIARY TAB ── */
function DiaryTab() {
  const { log, addFood, removeFood, goals, favorites, toggleFavorite } = useNutriStore()
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
  const [retroDate, setRetroDate] = useState(today)
  const [showCopy, setShowCopy] = useState(false)
  const [copyDate, setCopyDate] = useState('')
  const [copyMeal, setCopyMeal] = useState('Comida')

  const streakDays = (() => { let s = 0; const d = new Date(); for (let i = 0; i < 365; i++) { const ds = d.toISOString().slice(0, 10); if ((log[ds] || []).length > 0) s++; else if (i > 0) break; d.setDate(d.getDate() - 1) } return s })()
  const [portion, setPortion] = useState('g')

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
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [totalKcal, goals.kcal])

  function handleCopyDay() {
    if (!copyDate) return
    const foods = log[copyDate] || []
    if (!foods.length) { toast.show('Ese día no tiene registros'); return }
    const filtered = foods.filter(f => !copyMeal || f.meal === copyMeal)
    filtered.forEach(f => addFood(retroDate, { ...f }))
    toast.show(`✓ ${filtered.length} alimentos copiados`)
    setShowCopy(false)
  }

  function handleAdd() {
    const k = parseFloat(kcal)
    if (!name.trim() || !k || k <= 0) { toast.show('Nombre y kcal obligatorios'); return }
    addFood(retroDate, { name: name.trim(), kcal: k, p: parseFloat(p) || 0, c: parseFloat(c) || 0, f: parseFloat(f) || 0, grams: parseFloat(grams) || 100, meal })
    toast.show(`✓ ${name.trim()} (${k}kcal)`)
    setName(''); setKcal(''); setP(''); setC(''); setF(''); setGrams('100')
  }

  const mealGroups = MEAL_TYPES.filter(m => todayFoods.some(f => f.meal === m))
    .map(m => ({ meal: m, foods: todayFoods.filter(f => f.meal === m) }))

  return (
    <div>
      {streakDays > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <span style={{ fontSize: 16 }}>🔥</span>
          <span style={{ fontFamily: 'DM Serif Display,serif', fontSize: 16, color: 'var(--color-acc-gold)' }}>{streakDays}</span>
          <span style={{ fontSize: 11, color: 'var(--color-dim)', fontWeight: 600 }}>días de racha</span>
        </div>
      )}

      {/* Weekly kcal */}
      {(() => {
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(Date.now() - (6 - i) * 86400000)
          const ds = d.toISOString().slice(0, 10)
          return { label: DOW_S[d.getDay()], kcal: (log[ds] || []).reduce((s: number, f: { kcal: number }) => s + f.kcal, 0), isToday: i === 6 }
        })
        const maxK = Math.max(1, ...days.map(d => d.kcal))
        return (
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div className="sec-label" style={{ marginBottom: 10 }}>📊 kcal últimos 7 días</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
              {days.map(d => {
                const h = Math.max(4, (d.kcal / maxK) * 56)
                return (
                  <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: '100%', borderRadius: 4, minHeight: 4, height: h, background: d.isToday ? 'var(--color-acc-green)' : 'rgba(82,183,136,0.3)', transition: 'height 0.4s' }} />
                    <span style={{ fontSize: 9, color: d.isToday ? 'var(--color-text)' : 'var(--color-dim)', textTransform: 'uppercase' }}>{d.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Favorites */}
      {favorites.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div className="sec-label" style={{ marginBottom: 8 }}>⭐ Favoritos</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FOODS_DB.filter(f => favorites.includes(f.name)).map(f => (
              <button key={f.name} onClick={() => {
                addFood(today, { name: f.name, kcal: f.kcal, p: f.p, c: f.c, f: f.f, grams: 100, meal })
                toast.show(`✓ ${f.name} (${f.kcal}kcal)`)
              }}
                style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid rgba(82,183,136,0.2)', background: 'rgba(82,183,136,0.08)', color: 'var(--color-acc-green)' }}>
                {f.name} ({f.kcal}kcal)
              </button>
            ))}
          </div>
        </div>
      )}

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
          {[{ n: 'Proteína', v: totalP, g: goals.p, c: 'var(--color-acc-blue)' },
            { n: 'Carbos', v: totalC, g: goals.c, c: 'var(--color-acc-gold)' },
            { n: 'Grasa', v: totalF, g: goals.f, c: 'var(--color-acc-orange)' }].map(m => {
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
      {/* Retro date + copy */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
        <input className="inp" value={retroDate} onChange={e => setRetroDate(e.target.value)} type="date" style={{ width: 130, marginBottom: 0, fontSize: 12 }} />
        <select className="inp" value={meal} onChange={e => setMeal(e.target.value)} style={{ flex: 1, marginBottom: 0 }}>
          {MEAL_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button onClick={() => setShowCopy(!showCopy)} style={{ padding: '8px 10px', borderRadius: 10, background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-dim)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>📋</button>
      </div>
      {showCopy && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <input className="inp" value={copyDate} onChange={e => setCopyDate(e.target.value)} type="date" placeholder="Copiar de..." style={{ flex: 1, marginBottom: 0 }} />
          <select className="inp" value={copyMeal} onChange={e => setCopyMeal(e.target.value)} style={{ width: 110, marginBottom: 0 }}>
            <option value="">Todo</option>
            {MEAL_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={handleCopyDay} style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(82,183,136,0.12)', color: 'var(--color-acc-green)', border: '1px solid rgba(82,183,136,0.2)', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>Copiar</button>
        </div>
      )}

      {/* Portion selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <select className="inp" value={portion} onChange={e => setPortion(e.target.value)} style={{ width: 80, marginBottom: 0 }}>
          {['g','ml','taza','pieza','cdta','cda'].map(u => <option key={u} value={u}>{u === 'cdta' ? 'cdta' : u === 'cda' ? 'cda' : u === 'taza' ? 'taza' : u === 'pieza' ? 'pieza' : u}</option>)}
        </select>
        <input className="inp" value={grams} onChange={e => setGrams(e.target.value)} type="number" placeholder="Cantidad" style={{ flex: 1, marginBottom: 0 }} />
      </div>
        <Input value={name} onChange={setName} placeholder="Nombre del alimento..." className="mb-2" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
          <input className="inp" value={kcal} onChange={e => setKcal(e.target.value)} type="number" placeholder="kcal" style={{ marginBottom: 0 }} />
          <input className="inp" value={p} onChange={e => setP(e.target.value)} type="number" placeholder="Prot." style={{ marginBottom: 0 }} />
          <input className="inp" value={c} onChange={e => setC(e.target.value)} type="number" placeholder="Carb." style={{ marginBottom: 0 }} />
          <input className="inp" value={f} onChange={e => setF(e.target.value)} type="number" placeholder="Grasa" style={{ marginBottom: 0 }} />
        </div>
        <button onClick={handleAdd} className="btn-primary" style={{ background: 'var(--color-acc-green)', boxShadow: '0 2px 12px rgba(82,183,136,0.25)' }}>Añadir al diario</button>
      </div>

      {/* Nutritional calendar mini */}
    {(() => {
      const now = new Date()
      const y = now.getFullYear(); const m = now.getMonth()
      const dim = new Date(y, m + 1, 0).getDate()
      const fdow = new Date(y, m, 1).getDay()
      const start = fdow === 0 ? 6 : fdow - 1
      const today = new Date().toISOString().slice(0, 10)
      return (
        <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-sub)', letterSpacing: '0.3px', marginBottom: 10 }}>📅 Calendario de registros</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {['L','M','X','J','V','S','D'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: 8, fontWeight: 600, color: 'var(--color-dim)', padding: '2px 0' }}>{d}</div>)}
            {Array.from({ length: start }, (_, i) => <div key={`e${i}`} style={{ aspectRatio: '1' }} />)}
            {Array.from({ length: dim }, (_, i) => {
              const d = i + 1
              const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
              const dayKcal = (log[ds] || []).reduce((s: number, f: { kcal: number }) => s + f.kcal, 0)
              const pct = dayKcal > 0 ? Math.min(dayKcal / goals.kcal, 1) : 0
              return (
                <div key={d} style={{ aspectRatio: '1', borderRadius: 4, background: pct > 0 ? `rgba(82,183,136,${Math.min(1, pct * 1.2)})` : 'rgba(255,255,255,0.03)', border: ds === today ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: ds === today ? 700 : 400, color: pct > 0.6 ? '#fff' : 'var(--color-dim)' }}>
                  {d}
                </div>
              )
            })}
          </div>
        </div>
      )
    })()}

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
                  <button onClick={() => { toggleFavorite(f.name); toast.show(favorites.includes(f.name) ? 'Quitado de favoritos' : '★ Añadido a favoritos') }}
                    style={{ width: 24, height: 24, borderRadius: 6, background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', color: favorites.includes(f.name) ? 'var(--color-acc-gold)' : 'var(--color-dim)' }}>
                    {favorites.includes(f.name) ? '★' : '☆'}
                  </button>
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
  const [sharePost, setSharePost] = useState<NewPost | null>(null)
  const [showCreator, setShowCreator] = useState(false)
  const [dName, setDName] = useState('')
  const [ingName, setIngName] = useState('')
  const [ingKcal, setIngKcal] = useState('')
  const [ingP, setIngP] = useState('')
  const [ingC, setIngC] = useState('')
  const [ingF, setIngF] = useState('')
  const [ingGrams, setIngGrams] = useState('100')
  const [ingredients, setIngredients] = useState<{ name: string; kcal: number; p: number; c: number; f: number; grams: number }[]>([])

  // Recipe DB filters
  const [catFilter, setCatFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [difFilter, setDifFilter] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [maxTimeFilter, setMaxTimeFilter] = useState('')

  const filteredRecipes = filterRecipes({
    categoria: catFilter || undefined,
    etiquetas: tagFilter ? [tagFilter] : undefined,
    dificultad: difFilter || undefined,
    search: searchFilter || undefined,
    maxTime: maxTimeFilter ? parseInt(maxTimeFilter) : undefined,
  }).slice(0, 30)

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

      {/* Recipe database with filters */}
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div className="sec-label">📚 Biblioteca ({RECIPES.length} recetas)</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          <select className="inp" value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ flex: 1, minWidth: 100, marginBottom: 0, fontSize: 12 }}>
            <option value="">Todas las categorías</option>
            {RECIPE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="inp" value={difFilter} onChange={e => setDifFilter(e.target.value)} style={{ width: 100, marginBottom: 0, fontSize: 12 }}>
            <option value="">Dificultad</option>
            {RECIPE_DIFFICULTIES.map(d => <option key={d} value={d}>{difficultyLabel(d)}</option>)}
          </select>
          <input className="inp" value={maxTimeFilter} onChange={e => setMaxTimeFilter(e.target.value)} type="number" placeholder="Max min" style={{ width: 70, marginBottom: 0 }} />
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
          <button onClick={() => setTagFilter('')} style={{ padding: '3px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, cursor: 'pointer', border: '1px solid', background: !tagFilter ? 'rgba(82,183,136,0.15)' : 'var(--color-s2)', color: !tagFilter ? 'var(--color-acc-green)' : 'var(--color-dim)', borderColor: !tagFilter ? 'rgba(82,183,136,0.3)' : 'var(--color-border)', fontFamily: 'DM Sans,sans-serif' }}>Todas</button>
          {RECIPE_TAGS.slice(0, 12).map(t => (
            <button key={t} onClick={() => setTagFilter(t === tagFilter ? '' : t)}
              style={{ padding: '3px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, cursor: 'pointer', border: '1px solid', background: tagFilter === t ? 'rgba(82,183,136,0.15)' : 'var(--color-s2)', color: tagFilter === t ? 'var(--color-acc-green)' : 'var(--color-dim)', borderColor: tagFilter === t ? 'rgba(82,183,136,0.3)' : 'var(--color-border)', fontFamily: 'DM Sans,sans-serif' }}>{t.replace(/_/g, ' ')}</button>
          ))}
        </div>
        <input className="inp" value={searchFilter} onChange={e => setSearchFilter(e.target.value)} placeholder="🔍 Buscar receta..." style={{ marginBottom: 0 }} />
      </div>

      {filteredRecipes.map(r => (
        <div key={r.id} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 17, color: 'var(--color-text)' }}>{r.nombre}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {r.etiquetas.slice(0, 3).map(t => (
                <span key={t} style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'rgba(82,183,136,0.1)', color: 'var(--color-acc-green)', whiteSpace: 'nowrap' }}>{t.replace(/_/g, ' ')}</span>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-sub)', marginBottom: 8 }}>
            ⏱ {r.tiempo_min}min · {difficultyLabel(r.dificultad)} · {r.raciones} ración · {r.macros_por_racion.kcal}kcal | P:{r.macros_por_racion.proteina_g}g C:{r.macros_por_racion.carbohidratos_g}g G:{r.macros_por_racion.grasas_g}g
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-dim)', marginBottom: 10 }}>
            {r.ingredientes.slice(0, 6).map(i => `${i.nombre} (${i.cantidad}${i.unidad})`).join(' · ')}
            {r.ingredientes.length > 6 && ` +${r.ingredientes.length - 6} más`}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => {
              const today = todayISO()
              if (r.ingredientes.length > 0) {
                r.ingredientes.forEach(ing => {
                  const food = FOODS_DB.find(f => f.name.toLowerCase() === ing.nombre.toLowerCase())
                  addFood(today, {
                    name: ing.nombre, kcal: food ? Math.round(food.kcal * ing.cantidad / 100) : Math.round(r.macros_por_racion.kcal / r.ingredientes.length),
                    p: food ? +(food.p * ing.cantidad / 100).toFixed(1) : 0,
                    c: food ? +(food.c * ing.cantidad / 100).toFixed(1) : 0,
                    f: food ? +(food.f * ing.cantidad / 100).toFixed(1) : 0,
                    grams: ing.cantidad, meal: r.categoria === 'desayuno' ? 'Desayuno' : r.categoria === 'comida' ? 'Comida' : r.categoria === 'cena' ? 'Cena' : 'Snack',
                  })
                })
              } else {
                addFood(today, { name: r.nombre, kcal: r.macros_por_racion.kcal, p: r.macros_por_racion.proteina_g, c: r.macros_por_racion.carbohidratos_g, f: r.macros_por_racion.grasas_g, grams: 100, meal: 'Comida' })
              }
              toast.show(`✓ "${r.nombre}" añadido al diario`)
            }}
              style={{ flex: 1, padding: 8, borderRadius: 10, background: 'rgba(82,183,136,0.1)', color: 'var(--color-acc-green)', border: '1px solid rgba(82,183,136,0.2)', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>Usar en diario</button>
          </div>
        </div>
      ))}
      <div style={{ fontSize: 10, color: 'var(--color-dim)', textAlign: 'center', marginBottom: 12 }}>{filteredRecipes.length} de {RECIPES.length} recetas</div>

      <div className="sec-label" style={{ marginTop: 16 }}>Mis platos ({dishes.length})</div>

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
            <button title="Compartir en comunidad" onClick={() => setSharePost(dishToPost(d))}
              style={{ width: 36, borderRadius: 10, background: 'color-mix(in srgb, var(--color-acc-purple) 12%, transparent)', color: 'var(--color-acc-purple)', border: '1px solid color-mix(in srgb, var(--color-acc-purple) 22%, transparent)', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↗</button>
            <button onClick={() => { removeDish(d.id); toast.show('Plato eliminado') }}
              style={{ width: 36, borderRadius: 10, background: 'rgba(224,95,95,0.08)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.15)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        </div>
      ))}
      {sharePost && <ShareSheet post={sharePost} onClose={() => setSharePost(null)} />}
    </div>
  )
}

/* ── SEARCH TAB ── */
function SearchTab() {
  const { addFood, toggleFavorite, favorites } = useNutriStore()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [meal, setMeal] = useState('Comida')
  const [onlineResults, setOnlineResults] = useState<{ name: string; kcal: number; p: number; c: number; f: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [showBarcode, setShowBarcode] = useState(false)
  const [barcode, setBarcode] = useState('')
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Suelta la cámara si el usuario sale de la pestaña con el escáner abierto.
  useEffect(() => () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
  }, [])

  const localResults = query.trim()
    ? FOODS_DB.filter(f => f.name.toLowerCase().includes(query.toLowerCase())).slice(0, 20)
    : []
  const allResults = [...localResults, ...onlineResults.filter(o => !localResults.some(l => l.name === o.name))]

  // Los macros de los resultados son por 100 g; al añadir escalamos por la
  // ración elegida y guardamos ya los valores consumidos (como hace "Usar en diario").
  function addFound(f: { name: string; kcal: number; p: number; c: number; f: number }, grams = 100) {
    const g = grams || 100
    const k = Math.round(f.kcal * g / 100)
    addFood(todayISO(), {
      name: f.name, kcal: k,
      p: +(f.p * g / 100).toFixed(1), c: +(f.c * g / 100).toFixed(1), f: +(f.f * g / 100).toFixed(1),
      grams: g, meal,
    })
    toast.show(`✓ ${f.name} · ${g}g (${k} kcal)`)
  }

  // Lector de código de barras con la cámara. Usa BarcodeDetector nativo si
  // existe (Chrome/Android) y cae a un ponyfill (barcode-detector, zxing-wasm)
  // cuando no — el caso de iOS Safari, donde el nativo NO existe. Mismo bucle.
  const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
  type Detector = { detect: (el: HTMLVideoElement) => Promise<{ rawValue: string }[]> }

  async function getDetector(): Promise<Detector | null> {
    const native = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector
    if (native) return new native({ formats: FORMATS })
    try {
      const mod = await import('barcode-detector/ponyfill')
      return new mod.BarcodeDetector({ formats: FORMATS as never }) as unknown as Detector
    } catch { return null }
  }

  async function startCameraScan() {
    setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // iOS exige playsInline + play() dentro del gesto del usuario.
        videoRef.current.setAttribute('playsinline', 'true')
        await videoRef.current.play().catch(() => {})
      }
      const detector = await getDetector()
      if (!detector) { toast.show('Escáner no disponible. Introduce el código a mano.'); stopCamera(); return }
      const scan = async () => {
        if (!videoRef.current || !streamRef.current) return
        try {
          const barcodes = await detector.detect(videoRef.current)
          if (barcodes.length > 0) {
            stopCamera()
            fetchProduct(barcodes[0].rawValue)
            return
          }
        } catch { /* frame sin código, seguimos */ }
        if (streamRef.current) requestAnimationFrame(scan)
      }
      requestAnimationFrame(scan)
    } catch { toast.show('No se pudo acceder a la cámara'); setScanning(false) }
  }

  function stopCamera() {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    setScanning(false)
  }

  async function fetchProduct(code: string) {
    const clean = code.replace(/\D/g, '')
    if (!clean) { toast.show('Código no válido'); return }
    setLoading(true)
    try {
      const r = await fetch(`https://world.openfoodfacts.org/api/v0/product/${clean}.json`)
      const d = await r.json()
      if (d.status === 1 && d.product) {
        const p = d.product; const n = p.nutriments || {}
        const name = p.product_name_es || p.product_name || p.generic_name || p.brands || `Producto ${clean}`
        const kcal = Math.round(n['energy-kcal_100g'] || (n['energy-kj_100g'] ? n['energy-kj_100g'] / 4.184 : 0))
        addFound({ name, kcal, p: Math.round(n.proteins_100g || 0), c: Math.round(n.carbohydrates_100g || 0), f: Math.round(n.fat_100g || 0) })
      } else { toast.show('Producto no encontrado') }
    } catch { toast.show('Error al buscar') }
    finally { setLoading(false) }
  }

  async function scanBarcode() {
    const bc = barcode.replace(/\D/g, '')
    if (!bc) { toast.show('Introduce un código numérico'); return }
    await fetchProduct(bc)
    setBarcode('')
  }

  async function searchOnline() {
    if (!query.trim()) return
    setLoading(true)
    try {
      const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=15`)
      const d = await r.json()
      setOnlineResults((d.products || []).map((p: { product_name?: string; nutriments?: Record<string, number> }) => ({
        name: p.product_name || 'Sin nombre',
        kcal: Math.round(p.nutriments?.['energy-kcal_100g'] || 0),
        p: Math.round(p.nutriments?.proteins_100g || 0),
        c: Math.round(p.nutriments?.carbohydrates_100g || 0),
        f: Math.round(p.nutriments?.fat_100g || 0),
      })))
    } catch { toast.show('Error al buscar online') }
    finally { setLoading(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input className="inp" value={query} onChange={e => setQuery(e.target.value)} type="text" placeholder="Buscar alimento..." style={{ flex: 1, marginBottom: 0 }} />
        <select className="inp" value={meal} onChange={e => setMeal(e.target.value)} style={{ width: 120, marginBottom: 0 }}>
          {MEAL_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button onClick={searchOnline} disabled={loading} className="btn-ghost" style={{ flex: 1, padding: '8px 12px', fontSize: 13, color: 'var(--color-blue)', borderColor: 'rgba(91,138,240,0.3)' }}>
          {loading ? '🔍 Buscando...' : '🌐 Buscar en OpenFoodFacts'}
        </button>
        <button onClick={() => setShowBarcode(!showBarcode)} style={{ padding: '8px 12px', borderRadius: 12, fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid rgba(82,183,136,0.2)', background: 'rgba(82,183,136,0.08)', color: 'var(--color-acc-green)' }}>📷 Escanear</button>
      </div>
      {showBarcode && (
        <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <div className="sec-label" style={{ marginBottom: 10 }}>Escanear código de barras</div>
          {scanning ? (
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
              <video ref={videoRef} style={{ width: '100%', borderRadius: 12, display: 'block' }} playsInline muted />
              <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(82,183,136,0.5)', borderRadius: 12, pointerEvents: 'none' }} />
              <button onClick={stopCamera} style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', padding: '8px 20px', borderRadius: 99, background: 'rgba(0,0,0,0.7)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>✕ Cancelar</button>
            </div>
          ) : (
            <button onClick={startCameraScan} style={{ width: '100%', padding: 16, borderRadius: 12, background: 'var(--color-s2)', border: '1px dashed var(--color-border)', color: 'var(--color-sub)', fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', marginBottom: 10 }}>
              📷 Abrir cámara
            </button>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input className="inp" value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="O introduce el código manualmente..." style={{ marginBottom: 0 }} />
            <button onClick={scanBarcode} disabled={loading} className="btn-ghost" style={{ width: 'auto', padding: '8px 18px', color: 'var(--color-acc-green)' }}>{loading ? '...' : 'Buscar'}</button>
          </div>
        </div>
      )}

      {!query.trim() && onlineResults.length === 0 && (
        <div style={{ textAlign: 'center', padding: 32, fontSize: 13, color: 'var(--color-dim)' }}>Busca entre {FOODS_DB.length} alimentos o en OpenFoodFacts.</div>
      )}

      {allResults.map(f => (
        <FoodResultRow key={f.name} food={f} isFav={favorites.includes(f.name)}
          onToggleFav={() => { toggleFavorite(f.name); toast.show(favorites.includes(f.name) ? 'Quitado' : '★ Favorito') }}
          onAdd={(g) => addFound(f, g)} />
      ))}
    </div>
  )
}

// Fila de resultado de alimento con ración ajustable en gramos. Los macros que
// muestra y añade se escalan en vivo desde los valores por 100 g.
function FoodResultRow({ food, isFav, onToggleFav, onAdd }: {
  food: { name: string; kcal: number; p: number; c: number; f: number }
  isFav: boolean
  onToggleFav: () => void
  onAdd: (grams: number) => void
}) {
  const [grams, setGrams] = useState('100')
  const g = parseFloat(grams) || 0
  const k = Math.round(food.kcal * g / 100)
  return (
    <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 3 }}>{food.name}</div>
        <button onClick={onToggleFav}
          style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: isFav ? 'var(--color-acc-gold)' : 'var(--color-dim)' }}>
          {isFav ? '★' : '☆'}
        </button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-sub)', marginBottom: 10 }}>100g: {food.kcal} kcal | P:{food.p}g C:{food.c}g G:{food.f}g</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input value={grams} onChange={e => setGrams(e.target.value)} type="number" inputMode="numeric"
          style={{ width: 70, background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 10, padding: '8px 10px', fontSize: 14, fontFamily: 'DM Sans,sans-serif', outline: 'none', textAlign: 'center' }} />
        <span style={{ fontSize: 12, color: 'var(--color-dim)' }}>g</span>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <span style={{ fontFamily: 'DM Serif Display,serif', fontSize: 20, fontStyle: 'italic', color: 'var(--color-acc-green)' }}>{k}</span>
          <span style={{ fontSize: 12, color: 'var(--color-dim)' }}> kcal</span>
        </div>
        <button onClick={() => onAdd(g || 100)}
          style={{ padding: '8px 18px', borderRadius: 10, background: 'rgba(82,183,136,0.1)', color: 'var(--color-acc-green)', border: '1px solid rgba(82,183,136,0.2)', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>Añadir</button>
      </div>
    </div>
  )
}

/* ── GOALS TAB ── */
function GoalsTab() {
  const { goals, setGoals, macroCalc, setMacroCalc, dietConfig, setDietConfig } = useNutriStore()
  const toast = useToast()
  const [kcal, setKcal] = useState(String(goals.kcal))
  const [p, setP] = useState(String(goals.p))
  const [c, setC] = useState(String(goals.c))
  const [f, setF] = useState(String(goals.f))

  // Calculadora de macros (parámetros iniciales del store)
  const [mcWeight, setMcWeight] = useState(String(macroCalc.weight))
  const [mcHeight, setMcHeight] = useState(String(macroCalc.height))
  const [mcAge, setMcAge] = useState(String(macroCalc.age))
  const [mcGender, setMcGender] = useState<'male' | 'female'>(macroCalc.gender)
  const [mcActivity, setMcActivity] = useState(macroCalc.activity)
  const [mcGoal, setMcGoal] = useState<'cut' | 'maintain' | 'bulk'>(macroCalc.goal)

  const calcParams: MacroCalc = {
    weight: parseFloat(mcWeight) || 0,
    height: parseFloat(mcHeight) || 0,
    age: parseInt(mcAge) || 0,
    gender: mcGender,
    activity: mcActivity,
    goal: mcGoal,
  }
  const est = computeMacros(calcParams)
  // (TDEE − kcal objetivo) · 7 días / 7700 kcal por kg de grasa.
  const kgPerWeek = (est.tdee - est.kcal) * 7 / 7700
  const kgLabel = kgPerWeek > 0
    ? `≈ −${kgPerWeek.toFixed(2)} kg/semana`
    : kgPerWeek < 0
      ? `≈ +${Math.abs(kgPerWeek).toFixed(2)} kg/semana`
      : '≈ 0 kg/semana (mantenimiento)'

  function applyCalc() {
    setMacroCalc(calcParams)
    setKcal(String(est.kcal)); setP(String(est.p)); setC(String(est.c)); setF(String(est.f))
    toast.show('✓ Macros aplicados a tus metas')
  }

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

  const ACTIVITIES = ['Sedentario', 'Ligero (1-2 días)', 'Moderado (3-4 días)', 'Activo (5-6 días)', 'Muy activo (atleta)']

  // ── 1) DÉFICIT GUIADO POR KG ──
  const weightKg = calcParams.weight || 75
  const deficit = computeDeficit(dietConfig.kgObjetivo, dietConfig.semanas, est.tdee, mcGender)
  // Recomendaciones de ritmo: cuántas semanas para cada perfil.
  const ritmoSemanas = (kgWeek: number) => dietConfig.kgObjetivo > 0 ? Math.max(1, Math.round(dietConfig.kgObjetivo / kgWeek)) : 0

  function applyDeficit() {
    setDietConfig({ deficitCalculado: deficit.deficitDiario })
    setKcal(String(deficit.kcalObjetivo))
    // Recalcula macros con la config personalizada sobre las nuevas kcal.
    const split = computeMacroSplit({ kcal: deficit.kcalObjetivo, weightKg, proteinPerKg: dietConfig.proteinPerKg, fatPct: dietConfig.fatPct })
    setP(String(split.p)); setC(String(split.c)); setF(String(split.f))
    toast.show(`✓ Déficit ${deficit.deficitDiario} kcal → objetivo ${deficit.kcalObjetivo} kcal`)
  }

  // ── 2) MACROS PERSONALIZABLES ──
  const targetKcal = parseInt(kcal) || est.kcal
  const split = computeMacroSplit({ kcal: targetKcal, weightKg, proteinPerKg: dietConfig.proteinPerKg, fatPct: dietConfig.fatPct })
  const sumaPct = split.pPct + split.cPct + split.fPct

  function applyMacros() {
    setP(String(split.p)); setC(String(split.c)); setF(String(split.f))
    toast.show('✓ Reparto de macros aplicado')
  }

  // ── 3) AYUNO ──
  const winHours = windowHoursForPreset(dietConfig.fastingPreset, dietConfig.fastingWindowHours)

  return (
    <div>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div className="sec-label">🧮 Calculadora de macros</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4 }}>Peso (kg)</div>
            <input className="inp" value={mcWeight} onChange={e => setMcWeight(e.target.value)} type="number" style={{ marginBottom: 0 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4 }}>Altura (cm)</div>
            <input className="inp" value={mcHeight} onChange={e => setMcHeight(e.target.value)} type="number" style={{ marginBottom: 0 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4 }}>Edad</div>
            <input className="inp" value={mcAge} onChange={e => setMcAge(e.target.value)} type="number" style={{ marginBottom: 0 }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4 }}>Sexo</div>
            <select className="inp" value={mcGender} onChange={e => setMcGender(e.target.value as 'male' | 'female')} style={{ marginBottom: 0 }}>
              <option value="male">Hombre</option>
              <option value="female">Mujer</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4 }}>Objetivo</div>
            <select className="inp" value={mcGoal} onChange={e => setMcGoal(e.target.value as 'cut' | 'maintain' | 'bulk')} style={{ marginBottom: 0 }}>
              <option value="cut">Perder grasa</option>
              <option value="maintain">Mantener</option>
              <option value="bulk">Ganar músculo</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4 }}>Actividad</div>
          <select className="inp" value={mcActivity} onChange={e => setMcActivity(parseInt(e.target.value))} style={{ marginBottom: 0 }}>
            {ACTIVITIES.map((a, i) => <option key={i} value={i}>{a}</option>)}
          </select>
        </div>
        <div style={{ background: 'var(--color-s2)', borderRadius: 12, padding: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--color-dim)' }}>Gasto (TDEE) {est.tdee} kcal</span>
            <span style={{ fontFamily: 'DM Serif Display,serif', fontSize: 24, color: 'var(--color-acc-green)' }}>{est.kcal} kcal</span>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--color-sub)' }}>
            <span style={{ color: 'var(--color-acc-blue)', fontWeight: 600 }}>P {est.p}g</span>
            <span style={{ color: 'var(--color-acc-gold)', fontWeight: 600 }}>C {est.c}g</span>
            <span style={{ color: 'var(--color-acc-orange)', fontWeight: 600 }}>G {est.f}g</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginTop: 8 }}>{kgLabel}</div>
        </div>
        <button onClick={applyCalc} className="btn-ghost" style={{ border: '1px solid rgba(82,183,136,0.2)', color: 'var(--color-acc-green)', background: 'rgba(82,183,136,0.1)' }}>Aplicar a mis metas</button>
      </div>

      {/* ── 1) DÉFICIT GUIADO POR KG A PERDER ── */}
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div className="sec-label">🎯 Déficit por objetivo de peso</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4 }}>Kg a perder</div>
            <input className="inp" value={dietConfig.kgObjetivo} onChange={e => setDietConfig({ kgObjetivo: Math.max(0, parseFloat(e.target.value) || 0) })} type="number" step="0.5" style={{ marginBottom: 0 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4 }}>En semanas</div>
            <input className="inp" value={dietConfig.semanas} onChange={e => setDietConfig({ semanas: Math.max(1, parseInt(e.target.value) || 1) })} type="number" min="1" style={{ marginBottom: 0 }} />
          </div>
        </div>

        {/* Recomendaciones de ritmo */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {[{ r: 'lento' as const, kg: 0.3 }, { r: 'recomendado' as const, kg: 0.5 }, { r: 'moderado' as const, kg: 0.75 }, { r: 'agresivo' as const, kg: 1 }].map(({ r, kg }) => {
            const meta = RITMO_META[r]
            const sem = ritmoSemanas(kg)
            const active = deficit.ritmo === r
            return (
              <button key={r} onClick={() => setDietConfig({ semanas: sem || dietConfig.semanas })}
                title={`${meta.hint} (${sem} sem)`}
                style={{ flex: '1 1 45%', minWidth: 120, padding: '8px 10px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  border: `1px solid ${active ? meta.color : 'var(--color-border)'}`,
                  background: active ? `color-mix(in srgb, ${meta.color} 14%, transparent)` : 'var(--color-s2)', fontFamily: 'DM Sans,sans-serif' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: meta.color }}>{meta.label} · {kg} kg/sem</div>
                <div style={{ fontSize: 10, color: 'var(--color-dim)' }}>{sem} semanas</div>
              </button>
            )
          })}
        </div>

        <div style={{ background: 'var(--color-s2)', borderRadius: 12, padding: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 12, color: 'var(--color-dim)' }}>Déficit diario</span>
            <span style={{ fontFamily: 'DM Serif Display,serif', fontSize: 22, color: RITMO_META[deficit.ritmo].color }}>−{deficit.deficitDiario} kcal</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-sub)', marginTop: 4 }}>
            <span>Objetivo: <b style={{ color: 'var(--color-text)' }}>{deficit.kcalObjetivo} kcal</b></span>
            <span style={{ color: RITMO_META[deficit.ritmo].color, fontWeight: 700 }}>{RITMO_META[deficit.ritmo].label} · −{deficit.kgPorSemana} kg/sem</span>
          </div>
          {deficit.limitadoPorMinimo && (
            <div style={{ fontSize: 11, color: 'var(--color-acc-orange)', marginTop: 8, lineHeight: 1.4 }}>
              ⚠️ Limitado al mínimo de seguridad ({deficit.minKcal} kcal, {mcGender === 'male' ? 'hombre' : 'mujer'}). Alarga el plazo para un déficit realista.
            </div>
          )}
        </div>
        <button onClick={applyDeficit} className="btn-ghost" style={{ border: '1px solid rgba(82,183,136,0.2)', color: 'var(--color-acc-green)', background: 'rgba(82,183,136,0.1)' }}>Aplicar déficit a mis metas</button>
      </div>

      {/* ── 2) MACROS PERSONALIZABLES ── */}
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div className="sec-label">⚙️ Reparto de macros personalizado</div>
        <SliderRow label="Proteína (g/kg peso)" value={dietConfig.proteinPerKg} min={1.2} max={3} step={0.1}
          onChange={v => setDietConfig({ proteinPerKg: v })} format={v => `${v.toFixed(1)} g/kg → ${Math.round(v * weightKg)} g`} color="var(--color-acc-blue)" />
        <SliderRow label="Grasa (% kcal)" value={dietConfig.fatPct} min={15} max={40} step={1}
          onChange={v => setDietConfig({ fatPct: v })} format={v => `${v}%`} color="var(--color-acc-orange)" />

        {/* Barra P/G/C en tiempo real */}
        <div style={{ marginTop: 6, marginBottom: 8 }}>
          <div style={{ display: 'flex', height: 24, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            <div style={{ width: `${split.pPct}%`, background: 'var(--color-acc-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{split.pPct > 8 ? `P ${split.pPct}%` : ''}</div>
            <div style={{ width: `${split.cPct}%`, background: 'var(--color-acc-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#000' }}>{split.cPct > 8 ? `C ${split.cPct}%` : ''}</div>
            <div style={{ width: `${split.fPct}%`, background: 'var(--color-acc-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{split.fPct > 8 ? `G ${split.fPct}%` : ''}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12 }}>
            <span style={{ color: 'var(--color-acc-blue)', fontWeight: 600 }}>P {split.p}g</span>
            <span style={{ color: 'var(--color-acc-gold)', fontWeight: 600 }}>C {split.c}g</span>
            <span style={{ color: 'var(--color-acc-orange)', fontWeight: 600 }}>G {split.f}g</span>
            <span style={{ color: sumaPct === 100 ? 'var(--color-acc-green)' : 'var(--color-acc-orange)', fontWeight: 700 }}>Σ {sumaPct}%</span>
          </div>
          {split.invalido && <div style={{ fontSize: 11, color: 'var(--color-red)', marginTop: 6 }}>⚠️ Proteína + grasa superan las kcal: baja la proteína o la grasa.</div>}
        </div>
        <button onClick={applyMacros} disabled={split.invalido} className="btn-ghost" style={{ border: '1px solid rgba(82,183,136,0.2)', color: 'var(--color-acc-green)', background: 'rgba(82,183,136,0.1)', opacity: split.invalido ? 0.5 : 1 }}>Aplicar reparto a mis metas</button>
      </div>

      {/* ── 3) VENTANA DE AYUNO ── */}
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div className="sec-label">⏳ Ventana de ayuno</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {FASTING_PRESETS.map(fp => {
            const active = dietConfig.fastingPreset === fp.preset
            return (
              <button key={fp.preset} onClick={() => setDietConfig({ fastingPreset: fp.preset, fastingWindowHours: windowHoursForPreset(fp.preset, dietConfig.fastingWindowHours) })}
                style={{ padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer',
                  border: `1px solid ${active ? 'rgba(91,138,240,0.4)' : 'var(--color-border)'}`,
                  background: active ? 'rgba(91,138,240,0.12)' : 'var(--color-s2)', color: active ? 'var(--color-blue)' : 'var(--color-dim)' }}>
                {fp.label}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: dietConfig.fastingPreset === 'custom' ? '1fr 1fr' : '1fr', gap: 8, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4 }}>Empieza a comer (hora)</div>
            <input className="inp" value={dietConfig.fastingStartHour} onChange={e => setDietConfig({ fastingStartHour: Math.max(0, Math.min(23, parseInt(e.target.value) || 0)) })} type="number" min="0" max="23" style={{ marginBottom: 0 }} />
          </div>
          {dietConfig.fastingPreset === 'custom' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4 }}>Ventana (h)</div>
              <input className="inp" value={dietConfig.fastingWindowHours} onChange={e => setDietConfig({ fastingWindowHours: Math.max(1, Math.min(24, parseInt(e.target.value) || 1)) })} type="number" min="1" max="24" style={{ marginBottom: 0 }} />
            </div>
          )}
        </div>
        <FastingTimeline startHour={dietConfig.fastingStartHour} windowHours={winHours} />
        <div style={{ fontSize: 12, color: 'var(--color-sub)', marginTop: 10, textAlign: 'center' }}>
          Ayuno {24 - winHours}h · Ventana {winHours}h ({String(dietConfig.fastingStartHour).padStart(2, '0')}:00–{String((dietConfig.fastingStartHour + winHours) % 24).padStart(2, '0')}:00)
        </div>
      </div>

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

// Fila de slider reutilizable con etiqueta + valor formateado.
function SliderRow({ label, value, min, max, step, onChange, format, color }: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; format: (v: number) => string; color: string
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-sub)' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: color, cursor: 'pointer' }} />
    </div>
  )
}

// Timeline horizontal de 24h mostrando la ventana de comida (ayuno vs comer).
function FastingTimeline({ startHour, windowHours }: { startHour: number; windowHours: number }) {
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const inWindow = (h: number) => {
    const end = startHour + windowHours
    if (end <= 24) return h >= startHour && h < end
    return h >= startHour || h < end % 24
  }
  return (
    <div>
      <div style={{ display: 'flex', height: 28, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
        {hours.map(h => (
          <div key={h} title={`${String(h).padStart(2, '0')}:00`}
            style={{ flex: 1, background: inWindow(h) ? 'var(--color-acc-green)' : 'rgba(255,255,255,0.05)', borderRight: h < 23 ? '1px solid rgba(0,0,0,0.15)' : 'none' }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: 'var(--color-dim)' }}>
        <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>24h</span>
      </div>
    </div>
  )
}

/* ── PLAN TAB: creador de dietas visual, realista y configurable ── */
const DOW_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// Momento del plato (Plan) → tipo de comida del Menú/Diario (MEAL_TYPES).
const MOMENT_TO_MEAL: Record<string, string> = {
  desayuno: 'Desayuno', comida: 'Comida', cena: 'Cena', snack: 'Snack',
}

function PlanTab() {
  const { dishes, goals, macroCalc, dietConfig, setDietConfig, setMenuDay, addFood } = useNutriStore()
  const toast = useToast()

  // Pool de platos candidatos: mis platos + biblioteca de recetas, clasificados
  // por momento del día (realismo). Se calcula una vez.
  const pool = useMemo<PlanDish[]>(() => {
    const own = dishes.map(d => makePlanDish({ name: d.name, kcal: d.totalKcal, p: d.totalP, c: d.totalC, f: d.totalF }))
    const lib = RECIPES.map(r => makePlanDish({
      name: r.nombre, kcal: r.macros_por_racion.kcal, p: r.macros_por_racion.proteina_g,
      c: r.macros_por_racion.carbohidratos_g, f: r.macros_por_racion.grasas_g, categoria: r.categoria,
    }))
    const map = new Map<string, PlanDish>()
    lib.forEach(d => map.set(d.name, d))
    own.forEach(d => map.set(d.name, d))
    return [...map.values()]
  }, [dishes])

  const slots = slotsForMeals(dietConfig.numMeals)
  // % por slot: personalizados si coinciden con el nº de slots, si no derivados.
  const pcts = dietConfig.mealPcts.length === slots.length
    ? dietConfig.mealPcts
    : distribucionPorSlots(slots, dietConfig.distribucion)

  // Base para objetivos de macros según perfil de día.
  const est = computeMacros(macroCalc)
  const maintenanceKcal = est.tdee
  const deficitKcal = goals.kcal || est.kcal
  const base = {
    deficitKcal, maintenanceKcal, weightKg: macroCalc.weight || 75,
    proteinPerKg: dietConfig.proteinPerKg, fatPct: dietConfig.fatPct,
  }

  const planConfig: PlanConfig = {
    numMeals: dietConfig.numMeals,
    distribucion: dietConfig.distribucion,
    mealPcts: dietConfig.mealPcts.length === slots.length ? dietConfig.mealPcts : undefined,
    fasting: { preset: dietConfig.fastingPreset, startHour: dietConfig.fastingStartHour, windowHours: windowHoursForPreset(dietConfig.fastingPreset, dietConfig.fastingWindowHours) },
    trainingHour: dietConfig.trainingHour,
  }

  // Día visualizado y su perfil (entreno según trainingDays).
  const [viewDay, setViewDay] = useState(new Date().getDay())
  const profile: DayProfile = dietConfig.trainingDays.includes(viewDay) ? 'training' : 'rest'
  const targets = dayTargets(base, profile)

  const [day, setDay] = useState<GeneratedDay | null>(null)

  function regenerateAll() {
    if (pool.length === 0) { toast.show('No hay platos. Crea platos o usa la biblioteca.'); return }
    setDay(generateDay(planConfig, targets, profile, pool))
    toast.show(`🍽️ Plan generado (${profile === 'training' ? 'día de entreno' : 'día de descanso'})`)
  }

  // Regenerar UNA comida (mismo slot, plato distinto y aleatorio).
  function regenMeal(idx: number) {
    if (!day) return
    const slot = slots[idx]
    const meal = day.meals[idx]
    const others = day.meals.filter((_, i) => i !== idx).map(m => m.dishName)
    const pick = pickDishForSlot(slot, meal.targetKcal, pool, { exclude: others, random: true })
    if (!pick) { toast.show('Sin alternativas'); return }
    const meals = [...day.meals]
    meals[idx] = buildMeal(slot, meal.time, meal.targetKcal, pick.dish, pick.servings)
    setDay(summarizeDay(day.profile, meals, day.goalKcal))
  }

  // Sustituir por macros parecidas (mismo momento, distinto alimento).
  function subMeal(idx: number) {
    if (!day) return
    const slot = slots[idx]
    const pick = substituteDish(slot, day.meals[idx], pool)
    if (!pick) { toast.show('Sin sustituto disponible'); return }
    const meals = [...day.meals]
    meals[idx] = buildMeal(slot, day.meals[idx].time, day.meals[idx].targetKcal, pick.dish, pick.servings)
    setDay(summarizeDay(day.profile, meals, day.goalKcal))
    toast.show(`↺ ${pick.dish.name}`)
  }

  // Guardar el día generado en el Menú semanal (día = viewDay). Mapea el momento
  // de cada plato a un tipo de comida del Menú para que se vea en esa pestaña.
  function saveToMenu() {
    if (!day) return
    const meals = day.meals.map(m => ({ meal: MOMENT_TO_MEAL[m.moment] || 'Comida', dishName: m.dishName }))
    setMenuDay(viewDay, meals)
    toast.show(`✓ Guardado en el Menú del ${DOW_LONG[viewDay]}`)
  }

  // Volcar el plan al Diario de HOY con los macros ya escalados por ración.
  function applyToDiary() {
    if (!day) return
    const today = todayISO()
    day.meals.forEach(m => addFood(today, {
      name: m.servings !== 1 ? `${m.dishName} ×${m.servings}` : m.dishName,
      kcal: m.kcal, p: m.p, c: m.c, f: m.f,
      grams: Math.round(100 * m.servings),
      meal: MOMENT_TO_MEAL[m.moment] || 'Comida',
    }))
    toast.show('✓ Añadido al Diario de hoy')
  }

  // Editar % de contundencia manualmente. Fija el slot movido y reparte el resto
  // (100 − val) entre los demás en proporción a su peso actual, de modo que la
  // suma quede SIEMPRE exactamente 100. (roundTo100 solo cuadra decimales; no
  // reduce sumas >100, por eso hay que renormalizar aquí antes de pasárselo.)
  function setPct(idx: number, val: number) {
    const cur = pcts.length === slots.length ? [...pcts] : distribucionPorSlots(slots, dietConfig.distribucion)
    if (cur.length === 1) { setDietConfig({ mealPcts: [100] }); return }
    const clamped = Math.max(0, Math.min(100, val))
    const remaining = 100 - clamped
    const othersSum = cur.reduce((s, p, i) => (i === idx ? s : s + p), 0)
    const next = cur.map((p, i) => {
      if (i === idx) return clamped
      // Si los demás sumaban 0, reparte el resto a partes iguales entre ellos.
      return othersSum > 0 ? (p / othersSum) * remaining : remaining / (cur.length - 1)
    })
    setDietConfig({ mealPcts: roundTo100(next) })
  }

  const pctSum = pcts.reduce((a, b) => a + b, 0)

  return (
    <div>
      {/* Config: nº comidas + contundencia */}
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div className="sec-label">🍴 Comidas al día</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {[1, 2, 3, 4, 5, 6].map(n => {
            const active = dietConfig.numMeals === n
            return (
              <button key={n} onClick={() => setDietConfig({ numMeals: n, mealPcts: [] })}
                style={{ flex: 1, minWidth: 44, padding: '8px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer',
                  border: `1px solid ${active ? 'rgba(82,183,136,0.4)' : 'var(--color-border)'}`,
                  background: active ? 'rgba(82,183,136,0.14)' : 'var(--color-s2)', color: active ? 'var(--color-acc-green)' : 'var(--color-dim)' }}>
                {n === 1 ? 'OMAD' : n}
              </button>
            )
          })}
        </div>

        <div className="sec-label">📊 Contundencia (reparto de kcal)</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {(Object.keys(DISTRIBUCION_LABELS) as DistribucionPreset[]).map(preset => {
            const active = dietConfig.distribucion === preset && dietConfig.mealPcts.length === 0
            return (
              <button key={preset} onClick={() => setDietConfig({ distribucion: preset, mealPcts: [] })}
                style={{ padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer',
                  border: `1px solid ${active ? 'rgba(82,183,136,0.4)' : 'var(--color-border)'}`,
                  background: active ? 'rgba(82,183,136,0.12)' : 'var(--color-s2)', color: active ? 'var(--color-acc-green)' : 'var(--color-dim)' }}>
                {DISTRIBUCION_LABELS[preset]}
              </button>
            )
          })}
        </div>

        {/* Sliders de % por comida */}
        {slots.map((slot, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-sub)' }}>{slot.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-acc-green)' }}>{pcts[i]}% · {Math.round(targets.goalKcal * pcts[i] / 100)} kcal</span>
            </div>
            <input type="range" min={0} max={70} step={1} value={pcts[i]} onChange={e => setPct(i, parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--color-acc-green)', cursor: 'pointer' }} />
          </div>
        ))}
        <div style={{ fontSize: 11, textAlign: 'right', color: pctSum === 100 ? 'var(--color-acc-green)' : 'var(--color-acc-orange)', fontWeight: 700 }}>Suma: {pctSum}%</div>
      </div>

      {/* Config: entreno + perfiles de día */}
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div className="sec-label">🏋️ Entreno y perfiles de día</div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4 }}>Hora del entreno (más carbos cerca)</div>
          <input className="inp" value={dietConfig.trainingHour} onChange={e => setDietConfig({ trainingHour: Math.max(0, Math.min(23, parseInt(e.target.value) || 0)) })} type="number" min="0" max="23" style={{ marginBottom: 0 }} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 6 }}>Días de entreno (más carbos, mantenimiento)</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 3, 4, 5, 6, 0].map(d => {
            const active = dietConfig.trainingDays.includes(d)
            return (
              <button key={d} onClick={() => {
                const set = active ? dietConfig.trainingDays.filter(x => x !== d) : [...dietConfig.trainingDays, d]
                setDietConfig({ trainingDays: set })
              }}
                style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer',
                  border: `1px solid ${active ? 'rgba(91,138,240,0.4)' : 'var(--color-border)'}`,
                  background: active ? 'rgba(91,138,240,0.14)' : 'var(--color-s2)', color: active ? 'var(--color-blue)' : 'var(--color-dim)' }}>
                {DOW_S[d]}
              </button>
            )
          })}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 8, lineHeight: 1.4 }}>
          🔵 Entreno: mantenimiento ({maintenanceKcal} kcal), más carbos. ⚪ Descanso: déficit ({deficitKcal} kcal), más grasas.
        </div>
      </div>

      {/* Selector de día + generar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {[1, 2, 3, 4, 5, 6, 0].map(d => {
          const isTraining = dietConfig.trainingDays.includes(d)
          return (
            <button key={d} onClick={() => setViewDay(d)}
              style={{ flex: 1, padding: '8px 2px', borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', position: 'relative',
                border: `1px solid ${viewDay === d ? 'rgba(82,183,136,0.4)' : 'var(--color-border)'}`,
                background: viewDay === d ? 'rgba(82,183,136,0.14)' : 'var(--color-s2)', color: viewDay === d ? 'var(--color-acc-green)' : 'var(--color-dim)' }}>
              {DOW_S[d]}
              {isTraining && <span style={{ position: 'absolute', top: 2, right: 3, fontSize: 7 }}>🏋️</span>}
            </button>
          )
        })}
      </div>

      <button onClick={regenerateAll} className="btn-primary" style={{ background: 'var(--color-acc-green)', boxShadow: '0 2px 12px rgba(82,183,136,0.25)', marginBottom: 12 }}>
        🎲 Generar plan del {DOW_LONG[viewDay]} ({profile === 'training' ? 'entreno' : 'descanso'})
      </button>

      {day && (
        <>
          <PlanDayView day={day} onRegen={regenMeal} onSub={subMeal} />
          <div style={{ display: 'flex', gap: 8, marginTop: 4, marginBottom: 12 }}>
            <button onClick={saveToMenu}
              style={{ flex: 1, padding: '11px 0', borderRadius: 12, background: 'rgba(82,183,136,0.12)', border: '1px solid rgba(82,183,136,0.3)', color: 'var(--color-acc-green)', fontSize: 13, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>
              📅 Guardar en Menú
            </button>
            <button onClick={applyToDiary}
              style={{ flex: 1, padding: '11px 0', borderRadius: 12, background: 'rgba(91,138,240,0.1)', border: '1px solid rgba(91,138,240,0.25)', color: 'var(--color-blue)', fontSize: 13, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>
              ➕ Volcar al Diario
            </button>
          </div>
        </>
      )}
      {!day && (
        <div style={{ textAlign: 'center', padding: 32, fontSize: 13, color: 'var(--color-dim)' }}>
          Configura y pulsa «Generar plan» para ver las comidas del día.
        </div>
      )}
    </div>
  )
}

// Vista diaria del plan: tarjetas hora+plato+icono+macros, gráfico P/G/C y botones.
function PlanDayView({ day, onRegen, onSub }: {
  day: GeneratedDay
  onRegen: (idx: number) => void
  onSub: (idx: number) => void
}) {
  const ringRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)
  const pKcal = day.totalP * 4, cKcal = day.totalC * 4, fKcal = day.totalF * 9

  useEffect(() => {
    if (!ringRef.current) return
    chartRef.current?.destroy()
    chartRef.current = new Chart(ringRef.current.getContext('2d')!, {
      type: 'doughnut',
      data: {
        labels: ['Proteína', 'Carbos', 'Grasa'],
        datasets: [{ data: [pKcal, cKcal, fKcal], backgroundColor: ['#5b8af0', '#e0b84f', '#e08f5f'], borderWidth: 0 }],
      },
      options: { cutout: '68%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: { label: string; raw: unknown }) => `${c.label}: ${Math.round((c.raw as number) / (pKcal + cKcal + fKcal || 1) * 100)}%` } } } },
    })
    return () => chartRef.current?.destroy()
  }, [pKcal, cKcal, fKcal])

  const near = day.goalKcal > 0 && Math.abs(day.totalKcal - day.goalKcal) / day.goalKcal <= 0.08

  return (
    <div>
      {/* Resumen del día + gráfico P/G/C */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
          <canvas ref={ringRef} width={90} height={90} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 20, color: 'var(--color-text)', lineHeight: 1 }}>{day.totalKcal}</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--color-dim)' }}>kcal</div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
            <span style={{ color: 'var(--color-dim)' }}>Meta {day.goalKcal} kcal</span>
            <span style={{ color: near ? 'var(--color-acc-green)' : 'var(--color-acc-orange)', fontWeight: 700 }}>{day.profile === 'training' ? '🏋️ Entreno' : '⚪ Descanso'}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <span style={{ color: 'var(--color-acc-blue)', fontWeight: 700 }}>P {day.totalP}g</span>
            <span style={{ color: 'var(--color-acc-gold)', fontWeight: 700 }}>C {day.totalC}g</span>
            <span style={{ color: 'var(--color-acc-orange)', fontWeight: 700 }}>G {day.totalF}g</span>
          </div>
        </div>
      </div>

      {/* Tarjetas de comida */}
      {day.meals.map((m, i) => (
        <div key={i} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(82,183,136,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{m.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-acc-green)', background: 'rgba(82,183,136,0.1)', padding: '1px 6px', borderRadius: 4 }}>{m.time}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase' }}>{m.slot}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {m.dishName}{m.servings !== 1 ? ` ×${m.servings}` : ''}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-sub)', marginTop: 2 }}>{m.kcal} kcal · P{m.p} C{m.c} G{m.f}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button onClick={() => onRegen(i)} title="Regenerar esta comida"
              style={{ flex: 1, padding: '6px 0', borderRadius: 8, background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-sub)', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>🎲 Regenerar</button>
            <button onClick={() => onSub(i)} title="Sustituir por macros parecidas"
              style={{ flex: 1, padding: '6px 0', borderRadius: 8, background: 'rgba(91,138,240,0.08)', border: '1px solid rgba(91,138,240,0.2)', color: 'var(--color-blue)', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>↺ Sustituir</button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── MENU TAB ── */
function MenuTab() {
  const { menu, setMenuDay, dishes, goals } = useNutriStore()
  const toast = useToast()
  const [viewDay, setViewDay] = useState(0)
  const [sharePost, setSharePost] = useState<NewPost | null>(null)
  const [dishFilter, setDishFilter] = useState('')
  const [activeMeal, setActiveMeal] = useState(MEAL_TYPES[0])  // pestaña de comida activa en el picker

  const curDay = menu.find(m => m.day === viewDay)
  const curMeals = curDay?.meals || []

  // Fuente unificada de platos para el picker: mis platos (nutri_dishes, que ya
  // incluye las recetas guardadas de la comunidad) + recetas de la biblioteca.
  type MenuDish = { name: string; totalKcal: number; totalP: number; totalC: number; totalF: number; ingredients: { name: string; grams: number }[] }
  const allDishes = useMemo<MenuDish[]>(() => {
    const own: MenuDish[] = dishes.map(d => ({
      name: d.name, totalKcal: d.totalKcal, totalP: d.totalP, totalC: d.totalC, totalF: d.totalF,
      ingredients: d.ingredients.map(i => ({ name: i.name, grams: i.grams })),
    }))
    const lib: MenuDish[] = RECIPES.map(r => ({
      name: r.nombre,
      totalKcal: r.macros_por_racion.kcal,
      totalP: r.macros_por_racion.proteina_g,
      totalC: r.macros_por_racion.carbohidratos_g,
      totalF: r.macros_por_racion.grasas_g,
      ingredients: r.ingredientes.map(i => ({ name: i.nombre, grams: i.cantidad })),
    }))
    // Dedup por nombre: mis platos ganan sobre la biblioteca.
    const map = new Map<string, MenuDish>()
    lib.forEach(d => map.set(d.name, d))
    own.forEach(d => map.set(d.name, d))
    return [...map.values()]
  }, [dishes])

  function toggleDish(mealType: string, dishName: string) {
    const existing = curMeals.find(m => m.meal === mealType && m.dishName === dishName)
    const updated = existing
      ? curMeals.filter(m => !(m.meal === mealType && m.dishName === dishName))
      : [...curMeals, { meal: mealType, dishName }]
    setMenuDay(viewDay, updated)
    toast.show(existing ? 'Quitado del menú' : '✓ Añadido al menú')
  }

  // Genera las comidas de UN día combinando platos (Desayuno/Comida/Cena +
  // Snack de relleno) para acercarse a las metas de kcal y proteína ±5%.
  // Reintenta y se queda con la mejor aproximación. Reutilizado por día y semana.
  function genDayMeals(): { meal: string; dishName: string }[] | null {
    if (allDishes.length === 0) return null
    const goalKcal = goals.kcal || 2000
    const goalP = goals.p || 0
    const rnd = () => allDishes[Math.floor(Math.random() * allDishes.length)]
    let best: { meal: string; dish: MenuDish }[] = []
    let bestScore = Infinity
    for (let attempt = 0; attempt < 400; attempt++) {
      const first3 = ['Desayuno', 'Comida', 'Cena'].map(m => ({ meal: m, dish: rnd() }))
      const base = first3.reduce((s, x) => s + x.dish.totalKcal, 0)
      const remaining = goalKcal - base
      let snack = allDishes[0]; let snackDiff = Infinity
      for (const d of allDishes) { const diff = Math.abs(d.totalKcal - remaining); if (diff < snackDiff) { snackDiff = diff; snack = d } }
      const picks = [...first3, { meal: 'Snack', dish: snack }]
      const kcal = picks.reduce((s, x) => s + x.dish.totalKcal, 0)
      const prot = picks.reduce((s, x) => s + x.dish.totalP, 0)
      const kcalErr = Math.abs(kcal - goalKcal) / goalKcal
      const protErr = goalP > 0 ? Math.abs(prot - goalP) / goalP : 0
      const score = kcalErr + protErr * 0.5
      if (score < bestScore) { bestScore = score; best = picks }
      if (kcalErr <= 0.05 && protErr <= 0.05) break
    }
    return best.map(x => ({ meal: x.meal, dishName: x.dish.name }))
  }

  const dayKcal = (meals: { dishName: string }[]) =>
    meals.reduce((s, m) => s + (allDishes.find(d => d.name === m.dishName)?.totalKcal || 0), 0)

  function randomDay() {
    const meals = genDayMeals()
    if (!meals) { toast.show('Añade o crea platos primero'); return }
    setMenuDay(viewDay, meals)
    const goalKcal = goals.kcal || 2000
    const total = dayKcal(meals)
    toast.show(Math.abs(total - goalKcal) / goalKcal <= 0.05
      ? `🎲 Día generado · ${total} kcal (meta ${goalKcal})`
      : `🎲 Mejor aproximación · ${total} kcal (no logré ±5% de ${goalKcal})`)
  }

  function randomWeek() {
    if (allDishes.length === 0) { toast.show('Añade o crea platos primero'); return }
    const goalKcal = goals.kcal || 2000
    let ok = 0
    for (let d = 0; d < 7; d++) {
      const meals = genDayMeals()
      if (!meals) return
      setMenuDay(d, meals)
      if (Math.abs(dayKcal(meals) - goalKcal) / goalKcal <= 0.05) ok++
    }
    toast.show(`🎲 Semana generada · ${ok}/7 días dentro de ±5%`)
  }

  const shoppingList = (() => {
    const items: Record<string, { totalGrams: number; dishes: Set<string> }> = {}
    for (let day = 0; day < 7; day++) {
      const dayMenu = menu.find(m => m.day === day)
      if (!dayMenu) continue
      dayMenu.meals.forEach(mealEntry => {
        const dish = allDishes.find(d => d.name === mealEntry.dishName)
        if (!dish) return
        dish.ingredients.forEach(ing => {
          if (!items[ing.name]) items[ing.name] = { totalGrams: 0, dishes: new Set() }
          items[ing.name].totalGrams += ing.grams
          items[ing.name].dishes.add(dish.name)
        })
      })
    }
    return Object.entries(items)
      .map(([name, data]) => ({ name, totalGrams: data.totalGrams, dishes: [...data.dishes].join(', ') }))
      .sort((a, b) => b.totalGrams - a.totalGrams)
  })()

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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="sec-label">{['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][viewDay]}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={randomDay}
            style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8, background: 'rgba(82,183,136,0.1)', color: 'var(--color-acc-green)', border: '1px solid rgba(82,183,136,0.2)', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
            🎲 Día
          </button>
          <button onClick={randomWeek}
            style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8, background: 'rgba(82,183,136,0.1)', color: 'var(--color-acc-green)', border: '1px solid rgba(82,183,136,0.2)', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
            🎲 Semana
          </button>
          <button onClick={() => {
            const post = menuToPost(menu)
            if (!post) { toast.show('Añade platos al menú primero'); return }
            setSharePost(post)
          }}
            style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8, background: 'color-mix(in srgb, var(--color-acc-purple) 10%, transparent)', color: 'var(--color-acc-purple)', border: '1px solid color-mix(in srgb, var(--color-acc-purple) 20%, transparent)', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
            ↗ Compartir semana
          </button>
        </div>
      </div>
      {sharePost && <ShareSheet post={sharePost} onClose={() => setSharePost(null)} />}

      {/* Resumen del día montado: ver el menú COMO menú (qué hay en cada comida,
          kcal por plato, total vs meta y macros). Antes solo había checkboxes
          sueltos en las pestañas → el menú creado quedaba invisible. */}
      {(() => {
        const goalKcal = goals.kcal || 2000
        const groups = MEAL_TYPES
          .map(mt => ({ meal: mt, items: curMeals.filter(m => m.meal === mt) }))
          .filter(g => g.items.length > 0)
        const tot = curMeals.reduce((a, m) => {
          const d = allDishes.find(x => x.name === m.dishName)
          if (d) { a.kcal += d.totalKcal; a.p += d.totalP; a.c += d.totalC; a.f += d.totalF }
          return a
        }, { kcal: 0, p: 0, c: 0, f: 0 })
        const near = goalKcal > 0 && Math.abs(tot.kcal - goalKcal) / goalKcal <= 0.05
        return (
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden', marginTop: 8, marginBottom: 12 }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Menú del {['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][viewDay]}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: near ? 'var(--color-acc-green)' : 'var(--color-dim)' }}>{tot.kcal} / {goalKcal} kcal</span>
            </div>
            {groups.length === 0 ? (
              <div style={{ padding: 14, fontSize: 12, color: 'var(--color-dim)', textAlign: 'center' }}>
                Aún no hay platos en este día. Elígelos abajo o pulsa 🎲 Día.
              </div>
            ) : (
              <>
                {groups.map(g => (
                  <div key={g.meal} style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{g.meal}</div>
                    {g.items.map((it, i) => {
                      const d = allDishes.find(x => x.name === it.dishName)
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '3px 0' }}>
                          <span style={{ fontSize: 13, color: 'var(--color-text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.dishName}</span>
                          <span style={{ fontSize: 11, color: 'var(--color-dim)', flexShrink: 0 }}>{d ? `${d.totalKcal} kcal` : '—'}</span>
                          <button onClick={() => toggleDish(g.meal, it.dishName)} title="Quitar del menú"
                            style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-dim)', cursor: 'pointer', fontSize: 12, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>
                      )
                    })}
                  </div>
                ))}
                <div style={{ padding: '8px 14px', display: 'flex', gap: 14, fontSize: 11, color: 'var(--color-dim)' }}>
                  <span>Proteína <b style={{ color: 'var(--color-text)' }}>{Math.round(tot.p)}g</b></span>
                  <span>Carbs <b style={{ color: 'var(--color-text)' }}>{Math.round(tot.c)}g</b></span>
                  <span>Grasa <b style={{ color: 'var(--color-text)' }}>{Math.round(tot.f)}g</b></span>
                </div>
              </>
            )}
          </div>
        )
      })()}

      {/* Pestañas de comida: solo se renderiza la lista de la comida activa (antes
          se pintaban las 5 listas × ~100 platos = cientos de filas de golpe). */}
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', marginTop: 8, marginBottom: 8, paddingBottom: 2 }}>
        {MEAL_TYPES.map(m => {
          const n = curMeals.filter(x => x.meal === m).length
          return (
            <button key={m} onClick={() => setActiveMeal(m)}
              style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid', whiteSpace: 'nowrap',
                background: activeMeal === m ? 'rgba(82,183,136,0.15)' : 'var(--color-s2)',
                color: activeMeal === m ? 'var(--color-acc-green)' : 'var(--color-dim)',
                borderColor: activeMeal === m ? 'rgba(82,183,136,0.3)' : 'var(--color-border)' }}>
              {m}{n > 0 ? ` · ${n}` : ''}
            </button>
          )
        })}
      </div>
      <input className="inp" value={dishFilter} onChange={e => setDishFilter(e.target.value)} placeholder={`🔍 Buscar entre ${allDishes.length} platos (propios + biblioteca)…`} style={{ marginBottom: 12 }} />

      {(() => {
        const q = dishFilter.trim().toLowerCase()
        const shown = q ? allDishes.filter(d => d.name.toLowerCase().includes(q)) : allDishes
        return (
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', maxHeight: 420, overflowY: 'auto', marginBottom: 12 }}>
            {allDishes.length === 0 ? (
              <div style={{ padding: 12, fontSize: 12, color: 'var(--color-dim)' }}>Sin platos. Crea uno en la pestaña Platos o usa la biblioteca.</div>
            ) : shown.length === 0 ? (
              <div style={{ padding: 12, fontSize: 12, color: 'var(--color-dim)' }}>Sin coincidencias.</div>
            ) : shown.map(d => {
              const isSelected = curMeals.some(m => m.meal === activeMeal && m.dishName === d.name)
              return (
                <div key={d.name} onClick={() => toggleDish(activeMeal, d.name)}
                  style={{
                    padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', background: isSelected ? 'rgba(82,183,136,0.08)' : 'transparent',
                  }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? 'var(--color-acc-green)' : 'var(--color-text)' }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-dim)' }}>{d.totalKcal} kcal · P{d.totalP} C{d.totalC} G{d.totalF}</div>
                  </div>
                  <div style={{ fontSize: 16 }}>{isSelected ? '✅' : '⬜'}</div>
                </div>
              )
            })}
          </div>
        )
      })()}

      {shoppingList.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="sec-label">🛒 Lista de la compra (semanal)</div>
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', display: 'grid', gridTemplateColumns: '1fr 80px', fontSize: 9, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <span>Ingrediente</span><span style={{ textAlign: 'right' }}>Cantidad</span>
            </div>
            {shoppingList.map((item, i) => (
              <div key={i} style={{ padding: '8px 14px', borderBottom: i < shoppingList.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>{item.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.dishes}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-acc-green)', flexShrink: 0, textAlign: 'right', minWidth: 70 }}>
                  {item.totalGrams >= 1000 ? (item.totalGrams / 1000).toFixed(1) + ' kg' : item.totalGrams + ' g'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── TOOLS: ayuno, peso, comparador ── */
function ToolsTab() {
  const { fasting, startFast, endFast, bodyMetrics, addBodyMetric, macroCalc } = useNutriStore()
  const [sharePost, setSharePost] = useState<NewPost | null>(null)
  const toast = useToast()
  const [w, setW] = useState('')
  const [fat, setFat] = useState('')
  const [muscle, setMuscle] = useState('')
  const [c1, setC1] = useState('')
  const [c2, setC2] = useState('')
  const [comp, setComp] = useState<{ name: string; kcal: number; p: number; c: number; f: number }[]>([])
  const isFasting = !!fasting.startTime
  const startDate = fasting.startTime ? new Date(fasting.startTime) : null
  const elapsed = startDate ? Math.round((Date.now() - startDate.getTime()) / 3600000 * 10) / 10 : 0
  const barRef = useRef<HTMLCanvasElement>(null)
  const bChart = useRef<Chart | null>(null)

  useEffect(() => {
    if (!barRef.current || bodyMetrics.length < 2) return
    bChart.current?.destroy()
    const bm = [...bodyMetrics].slice(-14)
      bChart.current = new Chart(barRef.current.getContext('2d')!, {
        type: 'line',
        data: {
          labels: bm.map(m => m.date.slice(5)),
          datasets: [{ data: bm.map(m => m.weight), borderColor: 'var(--color-acc-green)', borderWidth: 2, tension: 0.3, pointRadius: 3, pointBackgroundColor: 'var(--color-acc-green)' }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: { raw: unknown }) => (c.raw as number) + ' kg' } } },
          scales: { x: { ticks: { color: '#4a4d56', font: { size: 9 } } }, y: { ticks: { color: '#4a4d56', font: { size: 9 } } } }
        }
      })
      return () => { if (bChart.current) bChart.current.destroy() }
  }, [bodyMetrics])

  function compare() {
    const a1 = FOODS_DB.find(f => f.name === c1)
    const a2 = FOODS_DB.find(f => f.name === c2)
    if (!a1 || !a2) { toast.show('Selecciona 2 alimentos'); return }
    setComp([a1, a2])
  }

  return (
    <div>
      {/* Fasting */}
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div className="sec-label">⏱ Ayuno intermitente</div>
        {isFasting ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 40, color: 'var(--color-blue)', lineHeight: 1 }}>{elapsed}h</div>
            <div style={{ fontSize: 12, color: 'var(--color-sub)', marginTop: 4 }}>
              en ayuno desde {startDate?.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <button onClick={() => { endFast(); toast.show(`✓ Ayuno de ${elapsed}h registrado`) }}
              style={{ marginTop: 12, width: '100%', padding: 12, borderRadius: 12, background: 'var(--color-blue)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>
              Terminar ayuno
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--color-sub)', marginBottom: 12 }}>Objetivo: {fasting.targetHours}h</div>
            <button onClick={() => { startFast(); toast.show('✓ Ayuno iniciado') }}
              style={{ width: '100%', padding: 12, borderRadius: 12, background: 'rgba(91,138,240,0.1)', color: 'var(--color-blue)', border: '1px solid rgba(91,138,240,0.2)', fontSize: 14, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>
              Iniciar ayuno
            </button>
          </div>
        )}
      </div>

      {/* Body weight */}
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div className="sec-label">⚖️ Peso y medidas</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 6 }}>
          <input className="inp" value={w} onChange={e => setW(e.target.value)} type="number" step="0.1" placeholder="Peso kg" style={{ marginBottom: 0 }} />
          <input className="inp" value={fat} onChange={e => setFat(e.target.value)} type="number" step="0.1" placeholder="% Grasa" style={{ marginBottom: 0 }} />
          <input className="inp" value={muscle} onChange={e => setMuscle(e.target.value)} type="number" step="0.1" placeholder="% Músc" style={{ marginBottom: 0 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
          <input className="inp" id="body-cintura" type="number" step="0.1" placeholder="Cintura cm" style={{ marginBottom: 0 }} />
          <input className="inp" id="body-pecho" type="number" step="0.1" placeholder="Pecho cm" style={{ marginBottom: 0 }} />
          <input className="inp" id="body-brazo" type="number" step="0.1" placeholder="Brazo cm" style={{ marginBottom: 0 }} />
        </div>
        <button onClick={() => {
          const pw = parseFloat(w); if (!pw) return
          const cin = (document.getElementById('body-cintura') as HTMLInputElement)?.value
          const pecho = (document.getElementById('body-pecho') as HTMLInputElement)?.value
          const brazo = (document.getElementById('body-brazo') as HTMLInputElement)?.value
          addBodyMetric({ date: todayISO(), weight: pw, fat: parseFloat(fat) || 0, muscle: parseFloat(muscle) || 0 })
          const extra: Record<string, number> = {}
          if (cin) extra.cintura = parseFloat(cin)
          if (pecho) extra.pecho = parseFloat(pecho)
          if (brazo) extra.brazo = parseFloat(brazo)
          if (Object.keys(extra).length) {
            const medidas = [...JSON.parse(localStorage.getItem('nutri_medidas') || '[]'), { date: todayISO(), ...extra }]
            localStorage.setItem('nutri_medidas', JSON.stringify(medidas))
            import('@/lib/sync').then(m => m.saveToCloud('nutri_medidas', medidas))
          }
          toast.show('✓ Medidas guardadas'); setW(''); setFat(''); setMuscle('')
        }}
          className="btn-ghost" style={{ border: '1px solid rgba(82,183,136,0.2)', color: 'var(--color-acc-green)', background: 'rgba(82,183,136,0.1)' }}>
          Guardar
        </button>
        {bodyMetrics.length > 0 && (
          <button onClick={() => {
            const post = bodyProgressToPost(bodyMetrics)
            if (post) setSharePost(post)
          }}
            className="btn-ghost" style={{ marginTop: 6, border: '1px solid color-mix(in srgb, var(--color-acc-purple) 20%, transparent)', color: 'var(--color-acc-purple)', background: 'color-mix(in srgb, var(--color-acc-purple) 10%, transparent)' }}>
            ↗ Compartir progreso
          </button>
        )}
        {sharePost && <ShareSheet post={sharePost} onClose={() => setSharePost(null)} />}
        {bodyMetrics.length >= 2 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ position: 'relative', height: 100 }}><canvas ref={barRef} /></div>
          </div>
        )}
        {bodyMetrics.length > 0 && (() => {
          const heightM = (macroCalc.height || 175) / 100
          return (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-dim)', textAlign: 'center' }}>
              Último: {bodyMetrics[bodyMetrics.length - 1].weight}kg · IMC: {(bodyMetrics[bodyMetrics.length - 1].weight / (heightM * heightM)).toFixed(1)}
            </div>
          )
        })()}
      </div>

      {/* Food comparator */}
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div className="sec-label">🔬 Comparador de alimentos</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <select className="inp" value={c1} onChange={e => setC1(e.target.value)} style={{ marginBottom: 0 }}>
            <option value="">Alimento 1</option>
            {FOODS_DB.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
          </select>
          <select className="inp" value={c2} onChange={e => setC2(e.target.value)} style={{ marginBottom: 0 }}>
            <option value="">Alimento 2</option>
            {FOODS_DB.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
          </select>
        </div>
        <button onClick={compare} className="btn-ghost" style={{ border: '1px solid rgba(82,183,136,0.2)', color: 'var(--color-acc-green)', background: 'rgba(82,183,136,0.1)', marginBottom: 8 }}>
          Comparar
        </button>
        {comp.length === 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {comp.map((f, i) => (
              <div key={i} style={{ background: 'var(--color-s2)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>{f.name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-sub)' }}>🔥 {f.kcal} kcal</div>
                <div style={{ fontSize: 11, color: 'var(--color-acc-blue)' }}>P: {f.p}g</div>
                <div style={{ fontSize: 11, color: 'var(--color-acc-gold)' }}>C: {f.c}g</div>
                <div style={{ fontSize: 11, color: 'var(--color-acc-orange)' }}>G: {f.f}g</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


