import { useState, useRef, useEffect } from 'react'
import { useNutriStore } from '@/stores/nutriStore'
import { createPost } from '@/lib/social'
import { FOODS_DB } from '@/data/foods'
import { RECIPES, RECIPE_CATEGORIES, RECIPE_TAGS, filterRecipes } from '@/data/recipesDB'
import { useToast } from '@/stores/toast'
import { Input } from '@/components/ui'
import Chart from 'chart.js/auto'

const MEAL_TYPES = ['Desayuno', 'Comida', 'Cena', 'Snack', 'Post-entreno']
const DOW_S = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

function todayISO() { return new Date().toISOString().slice(0, 10) }

export default function Nutricion() {
  const [tab, setTab] = useState<'diary' | 'dishes' | 'search' | 'goals' | 'menu' | 'tools'>('diary')
  return (
    <div>
      <div className="page-header">
        <div className="page-module" style={{ color: 'var(--color-acc-green)' }}>Nutrición</div>
        <div className="page-title">Alimentación</div>
        <div className="tab-bar">
          {(['diary','dishes','search','goals','menu','tools'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`tab-btn tab-green${tab === t ? ' active' : ''}`}>
              {{diary:'Diario',dishes:'Platos',search:'Buscar',goals:'Metas',menu:'Menú',tools:'Herram.'}[t]}
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
        {tab === 'tools' && <ToolsTab />}
      </div>
    </div>
  )
}

/* ── DIARY TAB ── */
function DiaryTab() {
  const { log, addFood, removeFood, goals, water, addWater, favorites, toggleFavorite } = useNutriStore()
  const toast = useToast()
  const today = todayISO()
  const todayFoods = log[today] || []
  const todayWater = water[today] || 0
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
          <span style={{ fontFamily: 'DM Serif Display,serif', fontSize: 16, color: '#c9a84c' }}>{streakDays}</span>
          <span style={{ fontSize: 11, color: 'var(--color-dim)', fontWeight: 600 }}>días de racha</span>
        </div>
      )}

      {/* Agua */}
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div className="sec-label" style={{ marginBottom: 8 }}>💧 Agua</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            {[250, 500].map(ml => (
              <button key={ml} onClick={() => { addWater(today, ml); toast.show(`+${ml}ml`) }}
                style={{ flex: 1, padding: '10px 4px', borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid', background: ml === 250 ? 'rgba(91,138,240,0.1)' : 'rgba(91,138,240,0.15)', color: 'var(--color-blue)', borderColor: 'rgba(91,138,240,0.2)' }}>
                {ml === 250 ? '🥛 250ml' : '🍶 500ml'}
              </button>
            ))}
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 48 }}>
            <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 28, color: 'var(--color-blue)', lineHeight: 1 }}>{todayWater}</div>
            <div style={{ fontSize: 10, color: 'var(--color-dim)', marginTop: 2 }}>ml</div>
          </div>
        </div>
      </div>

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
                    style={{ width: 24, height: 24, borderRadius: 6, background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', color: favorites.includes(f.name) ? '#c9a84c' : 'var(--color-dim)' }}>
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
            <button title="Compartir en comunidad" onClick={async () => {
              try {
                await createPost({ type: 'recipe', title: d.name, body: `${d.totalKcal} kcal · P:${d.totalP}g C:${d.totalC}g G:${d.totalF}g`, data: { kcal: d.totalKcal, p: d.totalP, c: d.totalC, f: d.totalF } })
                toast.show(`✓ "${d.name}" compartido en la comunidad`)
              } catch (e) { toast.show(e instanceof Error ? e.message : 'No se pudo compartir') }
            }}
              style={{ width: 36, borderRadius: 10, background: 'color-mix(in srgb, var(--color-acc-purple) 12%, transparent)', color: 'var(--color-acc-purple)', border: '1px solid color-mix(in srgb, var(--color-acc-purple) 22%, transparent)', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↗</button>
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

  const localResults = query.trim()
    ? FOODS_DB.filter(f => f.name.toLowerCase().includes(query.toLowerCase())).slice(0, 20)
    : []
  const allResults = [...localResults, ...onlineResults.filter(o => !localResults.some(l => l.name === o.name))]

  function addFound(f: { name: string; kcal: number; p: number; c: number; f: number }) {
    addFood(todayISO(), { name: f.name, kcal: f.kcal, p: f.p, c: f.c, f: f.f, grams: 100, meal })
    toast.show(`✓ ${f.name} añadido (${f.kcal} kcal)`)
  }

  // Real barcode scanner with camera
  async function startCameraScan() {
    setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      // Use BarcodeDetector API if available
      if ('BarcodeDetector' in window) {
        const detector = new (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (el: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'] })
        const scan = async () => {
          if (!videoRef.current || !streamRef.current) return
          try {
            const barcodes = await detector.detect(videoRef.current)
            if (barcodes.length > 0) {
              stopCamera()
              fetchProduct(barcodes[0].rawValue)
              return
            }
          } catch {}
          if (streamRef.current) requestAnimationFrame(scan)
        }
        requestAnimationFrame(scan)
      } else {
        toast.show('BarcodeDetector no soportado. Introduce el código manualmente.')
      }
    } catch { toast.show('No se pudo acceder a la cámara'); setScanning(false) }
  }

  function stopCamera() {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    setScanning(false)
  }

  async function fetchProduct(code: string) {
    setLoading(true)
    try {
      const r = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`)
      const d = await r.json()
      if (d.status === 1 && d.product) {
        const p = d.product; const n = p.nutriments || {}
        addFound({ name: p.product_name || code, kcal: Math.round(n['energy-kcal_100g'] || 0), p: Math.round(n.proteins_100g || 0), c: Math.round(n.carbohydrates_100g || 0), f: Math.round(n.fat_100g || 0) })
      } else { toast.show('Producto no encontrado') }
    } catch { toast.show('Error al buscar') }
    finally { setLoading(false) }
  }

  async function scanBarcode() {
    const bc = barcode.trim()
    if (!bc) return
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
        <div style={{ textAlign: 'center', padding: 32, fontSize: 13, color: 'var(--color-dim)' }}>Busca entre 54 alimentos o en OpenFoodFacts.</div>
      )}

      {allResults.map(f => (
        <div key={f.name} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 3 }}>{f.name}</div>
            <button onClick={() => { toggleFavorite(f.name); toast.show(favorites.includes(f.name) ? 'Quitado' : '★ Favorito') }}
              style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: favorites.includes(f.name) ? '#c9a84c' : 'var(--color-dim)' }}>
              {favorites.includes(f.name) ? '★' : '☆'}
            </button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-sub)', marginBottom: 10 }}>100g: {f.kcal} kcal | P:{f.p}g C:{f.c}g G:{f.f}g</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 20, fontStyle: 'italic', color: 'var(--color-acc-green)' }}>{f.kcal} kcal</div>
            <div style={{ fontSize: 12, color: 'var(--color-dim)', flex: 1 }}>/100g</div>
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

  const shoppingList = (() => {
    const items: Record<string, { totalGrams: number; dishes: Set<string> }> = {}
    for (let day = 0; day < 7; day++) {
      const dayMenu = menu.find(m => m.day === day)
      if (!dayMenu) continue
      dayMenu.meals.forEach(mealEntry => {
        const dish = dishes.find(d => d.name === mealEntry.dishName)
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

      <div className="sec-label">{['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][viewDay]}</div>

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
        datasets: [{ data: bm.map(m => m.weight), borderColor: '#52b788', borderWidth: 2, tension: 0.3, pointRadius: 3, pointBackgroundColor: '#52b788' }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: { raw: unknown }) => (c.raw as number) + ' kg' } } },
        scales: { x: { ticks: { color: '#4a4d56', font: { size: 9 } } }, y: { ticks: { color: '#4a4d56', font: { size: 9 } } } }
      }
    })
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
                <div style={{ fontSize: 11, color: '#5b8af0' }}>P: {f.p}g</div>
                <div style={{ fontSize: 11, color: '#c9a84c' }}>C: {f.c}g</div>
                <div style={{ fontSize: 11, color: '#e07a5f' }}>G: {f.f}g</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


