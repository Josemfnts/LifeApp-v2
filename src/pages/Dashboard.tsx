import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TopBar } from '@/components/layout/TopBar'
import { useXP } from '@/contexts/XPContext'
import { useToast } from '@/stores/toast'
import { calcLevel } from '@/lib/xp-engine'
import { STORE_KEYS, ALL_STORAGE_KEYS } from '@/lib/storageKeys'
import { useRemoteChange } from '@/lib/mirror'
import { AREA_COLORS, AREA_ICONS, AREA_NAMES, type AreaStat, type Goal } from '@/types'

const acCls: Record<AreaStat, string> = { disc: 'ac-a', fuerza: 'ac-b', intel: 'ac-c', riqueza: 'ac-d' }
const trCls: Record<number, string> = { 0: 'tr-a', 1: 'tr-b', 2: 'tr-c', 3: 'tr-d' }
const icCls: Record<number, string> = { 0: 'ic-a', 1: 'ic-b', 2: 'ic-c', 3: 'ic-d' }

export default function Dashboard() {
  const { xp, awardXP: award } = useXP()
  const toast = useToast()
  const todayStr = new Date().toISOString().slice(0, 10)
  const areas: AreaStat[] = ['disc', 'fuerza', 'intel', 'riqueza']

  const [goals, setGoals] = useState<Goal[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORE_KEYS.josema_rpg_missions_v1) || '[]') } catch { return [] }
  })

  // Espejo vivo: el Dashboard lee localStorage en cada render, así que ante
  // cualquier cambio remoto basta con forzar un re-render (y recargar las
  // misiones, que sí viven en estado).
  const [, setRemoteRev] = useState(0)
  useRemoteChange(ALL_STORAGE_KEYS, key => {
    if (key === STORE_KEYS.josema_rpg_missions_v1) {
      try { setGoals(JSON.parse(localStorage.getItem(STORE_KEYS.josema_rpg_missions_v1) || '[]')) } catch { /* se queda como está */ }
    }
    setRemoteRev(r => r + 1)
  })
  const [goalName, setGoalName] = useState('')
  const [goalCur, setGoalCur] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalStat, setGoalStat] = useState<AreaStat>('disc')

  useEffect(() => {
    const dbTime = JSON.parse(localStorage.getItem(STORE_KEYS.agenda_tasks) || '{}')
    const dbNutri = JSON.parse(localStorage.getItem(STORE_KEYS.nutri_log) || '{}')
    const dbSessions = JSON.parse(localStorage.getItem(STORE_KEYS.fisico_sessions) || '[]')
    const dbTx = JSON.parse(localStorage.getItem(STORE_KEYS.finances_tx) || '[]')

    const tasks = dbTime[todayStr] || []
    if (tasks.filter((t: { done: boolean }) => t.done).length === tasks.length && tasks.length > 0) {
      if (!xp.disc.log.some(e => e.date === todayStr && e.concept === 'Agenda completada'))
        award('disc', 50, 'Agenda completada', todayStr)
    }
    const todayFoods = dbNutri[todayStr] || []
    if (todayFoods.length > 0) {
      if (!xp.fuerza.log.some(e => e.date === todayStr && e.concept === 'Nutrición registrada'))
        award('fuerza', 50, 'Nutrición registrada', todayStr)
    }
    if (dbSessions.some((s: { date: string }) => s.date === todayStr)) {
      if (!xp.intel.log.some(e => e.date === todayStr && e.concept === 'Entrenamiento completado'))
        award('intel', 50, 'Entrenamiento completado', todayStr)
    }
    if (dbTx.filter((t: { date: string }) => t.date === todayStr).length > 0) {
      if (!xp.riqueza.log.some(e => e.date === todayStr && e.concept === 'Finanzas registradas'))
        award('riqueza', 50, 'Finanzas registradas', todayStr)
    }
  }, [todayStr, xp.disc.log, xp.fuerza.log, xp.intel.log, xp.riqueza.log, award])

  const recentLog = Object.entries(xp)
    .flatMap(([stat, area]) => (area.log || []).map(e => ({ ...e, stat })))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)

  const dbHabits = JSON.parse(localStorage.getItem(STORE_KEYS.lifeos_habits) || '[]')
  const dbLog = JSON.parse(localStorage.getItem(STORE_KEYS.lifeos_habits_log) || '{}')
  const dow = new Date().getDay()
  const activeHabits = dbHabits.filter((h: { freq: string; days: number[] }) => {
    if (h.freq === 'daily') return true
    if (h.freq === 'weekdays') return dow >= 1 && dow <= 5
    if (h.freq === 'weekend') return dow === 0 || dow === 6
    if (h.freq === 'custom') return (h.days || []).includes(dow)
    return true
  })
  const habitsDone = activeHabits.filter((h: { id: number; type: string; goal: number }) => {
    const val = (dbLog[todayStr] || {})[h.id] || 0
    if (h.type === 'avoid') return val === 0
    return h.type === 'bool' ? !!val : val >= h.goal
  }).length
  const habitsPct = activeHabits.length ? Math.round(habitsDone / activeHabits.length * 100) : 0

  return (
    <div>
      <TopBar />

      {/* Comunidad */}
      <div className="section s0" style={{ paddingBottom: 0 }}>
        <Link to="/comunidad" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-acc-purple) 16%, var(--color-s1)), var(--color-s1))', border: '1px solid color-mix(in srgb, var(--color-acc-purple) 25%, var(--color-border))', borderRadius: 16, padding: '14px 16px' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(145deg,var(--color-acc-purple),var(--color-acc-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a3 3 0 10-2.83-4M9 12a3 3 0 10-2.83-4" /></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>Comunidad</div>
            <div style={{ fontSize: 12, color: 'var(--color-sub)', marginTop: 1 }}>Comparte entrenos, récords y platos · mira el feed</div>
          </div>
          <span style={{ fontSize: 18, color: 'var(--color-acc-purple)' }}>›</span>
        </Link>
      </div>

      {/* Habits */}
      <div className="section s1">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="sec-label" style={{ marginBottom: 0 }}>Hábitos de hoy</div>
          <Link to="/habitos" style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-sub)', background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '5px 12px', fontFamily: 'DM Sans,sans-serif', textDecoration: 'none' }}>
            Gestionar
          </Link>
        </div>

        {activeHabits.length === 0 ? (
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--color-sub)', marginBottom: 10 }}>Sin hábitos creados todavía</div>
            <Link to="/habitos" style={{ background: 'rgba(155,127,224,0.1)', color: 'var(--color-acc-purple)', border: '1px solid rgba(155,127,224,0.2)', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', textDecoration: 'none' }}>+ Crear primer hábito</Link>
          </div>
        ) : (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 12, color: 'var(--color-sub)' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{habitsDone}</span> / {activeHabits.length} completados
              </div>
              <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 18, color: 'var(--color-acc-purple)' }}>{habitsPct}%</div>
            </div>
            <div className="pbar-track">
              <div className="pbar-fill" style={{ width: `${habitsPct}%`, background: 'linear-gradient(90deg,#9b7fe0,#c9a84c)' }} />
            </div>
          </div>
        )}
      </div>

      {/* Today Summary */}
      <div className="section" style={{ padding: '16px 16px 0' }}>
        <div className="sec-label">Resumen de hoy</div>
        <div className="today-card">
          {[
            { icon: '📋', title: getTasksSummary(), sub: getTasksSub(), badge: getTasksBadge(), done: getTasksDone() },
            { icon: '🥗', title: getNutriSummary(), sub: getNutriSub(), badge: getNutriBadge(), done: getNutriDone() },
            { icon: '🏋️', title: 'Entrenamiento', sub: getTrainSub(), badge: getTrainBadge(), done: getTrainDone() },
            { icon: '💶', title: 'Finanzas', sub: 'Toca para añadir movimiento', badge: getFinBadge(), done: getFinDone() },
          ].map((item, i) => (
            <Link
              key={i}
              to={['/agenda', '/nutricion', '/fisico', '/finanzas'][i]}
              className={`today-row ${trCls[i]}`}
              style={{ textDecoration: 'none' }}
            >
              <div className={`today-icon ${icCls[i]}`}>{item.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: item.done ? 'var(--color-dim)' : 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-sub)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.sub}
                </div>
              </div>
              <span className={item.done ? 'sb-done' : 'sb-pending'}>{item.badge}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Areas */}
      <div className="section" style={{ padding: '16px 16px 0' }}>
        <div className="sec-label">Progreso por área</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {areas.map(stat => {
            const area = xp[stat]
            const lv = calcLevel(area?.total || 0)
            return (
              <Link
                key={stat}
                to={stat === 'disc' ? '/agenda' : stat === 'fuerza' ? '/nutricion' : stat === 'intel' ? '/fisico' : '/finanzas'}
                className={`area-card ${acCls[stat]}`}
                style={{ textDecoration: 'none' }}
              >
                <span className="area-icon">{AREA_ICONS[stat]}</span>
                <div className="area-name">{AREA_NAMES[stat]}</div>
                <div className="area-level">{lv.level}</div>
                <div className="area-bar-track">
                  <div className="area-bar-fill" style={{ width: `${lv.pct}%` }} />
                </div>
                <div className="area-xp">{area?.total || 0} XP · −{lv.needed - lv.current}</div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Goals */}
      <div className="section" style={{ padding: '16px 16px 0' }}>
        <div className="sec-label">Objetivos a largo plazo</div>

        {goals.map((g, i) => {
          const pct = g.goal > 0 ? Math.min(100, Math.round(g.current / g.goal * 100)) : 0
          const done = g.current >= g.goal
          const col = AREA_COLORS[g.stat]
          return (
            <div key={i} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 10, position: 'relative' }}>
              {done && <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, color: 'var(--color-acc-green)', background: 'rgba(82,183,136,0.1)', border: '1px solid rgba(82,183,136,0.2)', borderRadius: 6, padding: '2px 10px', marginBottom: 6 }}>✓ Completado</div>}
              <button onClick={() => { const next = goals.filter((_, ii) => ii !== i); setGoals(next); localStorage.setItem(STORE_KEYS.josema_rpg_missions_v1, JSON.stringify(next)) }}
                style={{ position: 'absolute', top: 14, right: 16, fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>✕</button>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-sub)', letterSpacing: '0.3px', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', display: 'inline-block', background: col }} />
                {AREA_NAMES[g.stat]}
              </div>
              <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 18, color: 'var(--color-text)', marginBottom: 10, lineHeight: 1.3 }}>{g.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-sub)', marginBottom: 7 }}>
                <span>{g.current}</span><span>{g.goal}</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ height: '100%', borderRadius: 99, transition: 'width 1s ease', width: `${pct}%`, background: col }} />
              </div>
              {!done && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" placeholder="Nuevo valor" id={`gv-${i}`}
                    style={{ flex: 1, background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 10, padding: '9px 12px', fontSize: 13, fontFamily: 'DM Sans,sans-serif', outline: 'none' }} />
                  <button onClick={() => {
                    const inp = document.getElementById(`gv-${i}`) as HTMLInputElement
                    const val = parseFloat(inp?.value || '0')
                    if (isNaN(val)) return
                    const next = [...goals]; const wasDone = next[i].current >= next[i].goal
                    next[i] = { ...next[i], current: val }; setGoals(next)
                    localStorage.setItem(STORE_KEYS.josema_rpg_missions_v1, JSON.stringify(next))
                    if (!wasDone && val >= next[i].goal) { award(next[i].stat, 200, 'Objetivo: ' + next[i].name, todayStr); toast.show('+200 XP — ¡Objetivo completado!') }
                  }}
                    style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', background: col + '18', color: col, border: `1px solid ${col}33` }}>Actualizar</button>
                </div>
              )}
            </div>
          )
        })}

        <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 18, marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-sub)', marginBottom: 14 }}>Añadir objetivo</div>
          <input className="inp" value={goalName} onChange={e => setGoalName(e.target.value)} placeholder="¿Qué quieres conseguir?" style={{ marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input className="inp" type="number" value={goalCur} onChange={e => setGoalCur(e.target.value)} placeholder="Valor actual" style={{ flex: 1 }} />
            <input className="inp" type="number" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} placeholder="Meta" style={{ flex: 1 }} />
          </div>
          <select className="inp" value={goalStat} onChange={e => setGoalStat(e.target.value as AreaStat)} style={{ marginBottom: 10 }}>
            {areas.map(a => <option key={a} value={a}>{AREA_ICONS[a]} {AREA_NAMES[a]}</option>)}
          </select>
          <button onClick={() => {
            if (!goalName.trim()) return
            const next = [...goals, { name: goalName.trim(), current: parseFloat(goalCur) || 0, goal: parseFloat(goalTarget) || 100, stat: goalStat }]
            setGoals(next); localStorage.setItem(STORE_KEYS.josema_rpg_missions_v1, JSON.stringify(next))
            setGoalName(''); setGoalCur(''); setGoalTarget(''); toast.show('✓ Objetivo añadido')
          }}
            style={{ width: '100%', background: 'rgba(91,138,240,0.12)', border: '1px solid rgba(91,138,240,0.2)', color: 'var(--color-acc-blue)', fontFamily: 'DM Sans,sans-serif', fontSize: 14, fontWeight: 600, padding: 12, borderRadius: 10, cursor: 'pointer' }}>Añadir objetivo</button>
        </div>
      </div>

      {/* Activity Log */}
      <div className="section s5">
        <div className="sec-label">Actividad reciente</div>
        <div className="log-card">
          {recentLog.length === 0 ? (
            <div className="empty-state">Sin actividad registrada aún.</div>
          ) : (
            recentLog.map((e, i) => (
              <div key={i} className="log-row">
                <div className="log-dot" style={{ background: AREA_COLORS[e.stat as AreaStat] }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>{AREA_ICONS[e.stat as AreaStat]} {e.concept}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 1 }}>{e.date}</div>
                </div>
                <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 16, fontStyle: 'italic', color: AREA_COLORS[e.stat as AreaStat] }}>+{e.amount} XP</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Logros */}
      {(() => {
        const achievements: { icon: string; title: string; desc: string; unlocked: boolean }[] = []
        const dbHL = JSON.parse(localStorage.getItem(STORE_KEYS.lifeos_habits_log) || '{}')
        const allDates2 = Object.keys(dbHL)
        const totalCheckins = allDates2.reduce((s: number, d: string) => s + Object.values(dbHL[d] as Record<string, number>).reduce((ss: number, v: number) => ss + (v > 0 ? 1 : 0), 0), 0)
        const combinedStreak = (() => {
          const allD = new Set<string>()
          Object.values(xp).forEach(a => (a.log || []).forEach((e: { date: string }) => { if (e.date) allD.add(e.date) }))
          let s = 0; const d2 = new Date()
          for (let i = 0; i < 365; i++) {
            const ds2 = `${d2.getFullYear()}-${String(d2.getMonth()+1).padStart(2,'0')}-${String(d2.getDate()).padStart(2,'0')}`
            if (allD.has(ds2)) s++; else if (i > 0) break
            d2.setDate(d2.getDate() - 1)
          }
          return s
        })()
        const allTasks2 = Object.values(JSON.parse(localStorage.getItem(STORE_KEYS.agenda_tasks) || '{}')).flat() as { done: boolean }[]
        const totalDone2 = allTasks2.filter((t: { done: boolean }) => t.done).length
        const sessCount = JSON.parse(localStorage.getItem(STORE_KEYS.fisico_sessions) || '[]').length
        const txCount2 = JSON.parse(localStorage.getItem(STORE_KEYS.finances_tx) || '[]').length

        achievements.push({ icon: '🔥', title: 'Principiante', desc: '7 días de racha', unlocked: combinedStreak >= 7 })
        achievements.push({ icon: '🔥', title: 'Constante', desc: '30 días de racha', unlocked: combinedStreak >= 30 })
        achievements.push({ icon: '✅', title: 'Productivo', desc: '100 tareas completadas', unlocked: totalDone2 >= 100 })
        achievements.push({ icon: '⭐', title: 'Hábito maestro', desc: '1000 check-ins', unlocked: totalCheckins >= 1000 })
        achievements.push({ icon: '🏋️', title: 'Fuerza', desc: '50 sesiones de entreno', unlocked: sessCount >= 50 })
        achievements.push({ icon: '💰', title: 'Ahorrador', desc: '100 transacciones', unlocked: txCount2 >= 100 })
        const unlocked = achievements.filter(a => a.unlocked)
        if (unlocked.length === 0) return null
        return (
          <div className="section" style={{ padding: '16px 16px 0' }}>
            <div className="sec-label">🏆 Logros ({unlocked.length}/{achievements.length})</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {achievements.map(a => (
                <div key={a.title} style={{
                  background: a.unlocked ? 'var(--color-s1)' : 'var(--color-s2)',
                  border: `1px solid ${a.unlocked ? 'rgba(201,168,76,0.3)' : 'var(--color-border)'}`,
                  borderRadius: 12, padding: 10, textAlign: 'center',
                  opacity: a.unlocked ? 1 : 0.4,
                }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{a.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: a.unlocked ? 'var(--color-acc-gold)' : 'var(--color-dim)', marginBottom: 2 }}>{a.title}</div>
                  <div style={{ fontSize: 9, color: 'var(--color-dim)' }}>{a.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

/* Helper functions for today summary data */
function getTasksSummary() {
  const db = JSON.parse(localStorage.getItem(STORE_KEYS.agenda_tasks) || '{}')
  const today = new Date().toISOString().slice(0, 10)
  const tasks = db[today] || []
  if (!tasks.length) return 'Sin tareas planificadas'
  const done = tasks.filter((t: { done: boolean }) => t.done).length
  return `${done}/${tasks.length} completadas`
}
function getTasksSub() {
  const db = JSON.parse(localStorage.getItem(STORE_KEYS.agenda_tasks) || '{}')
  const today = new Date().toISOString().slice(0, 10)
  const tasks = db[today] || []
  if (!tasks.length) return 'Ve a Agenda para añadir tareas'
  const done = tasks.filter((t: { done: boolean }) => t.done).length
  return done === tasks.length ? '¡Día completado!' : `${tasks.length - done} pendientes`
}
function getTasksBadge() {
  const db = JSON.parse(localStorage.getItem(STORE_KEYS.agenda_tasks) || '{}')
  const today = new Date().toISOString().slice(0, 10)
  const tasks = db[today] || []
  if (!tasks.length) return '+50 XP'
  const done = tasks.filter((t: { done: boolean }) => t.done).length
  return done === tasks.length ? '✓ Hecho' : '+50 XP'
}
function getTasksDone() {
  const db = JSON.parse(localStorage.getItem(STORE_KEYS.agenda_tasks) || '{}')
  const today = new Date().toISOString().slice(0, 10)
  const tasks = db[today] || []
  if (!tasks.length) return false
  return tasks.filter((t: { done: boolean }) => t.done).length === tasks.length && tasks.length > 0
}

function getNutriSummary() {
  const db = JSON.parse(localStorage.getItem(STORE_KEYS.nutri_log) || '{}')
  const today = new Date().toISOString().slice(0, 10)
  const foods: { kcal?: number }[] = db[today] || []
  if (!foods.length) return 'Sin registros de comida'
  const kcal = foods.reduce((s, f) => s + (f.kcal || 0), 0)
  return `${Math.round(kcal)} kcal registradas`
}
function getNutriSub() {
  const db = JSON.parse(localStorage.getItem(STORE_KEYS.nutri_log) || '{}')
  const today = new Date().toISOString().slice(0, 10)
  const foods: { meal?: string }[] = db[today] || []
  if (!foods.length) return 'Registra tus comidas en Nutrición'
  const meals = new Set(foods.map(f => f.meal))
  return `${foods.length} alimentos · ${meals.size} comidas`
}
function getNutriBadge() {
  const db = JSON.parse(localStorage.getItem(STORE_KEYS.nutri_log) || '{}')
  const today = new Date().toISOString().slice(0, 10)
  const foods = db[today] || []
  return foods.length ? '✓ Activo' : '+50 XP'
}
function getNutriDone() {
  const db = JSON.parse(localStorage.getItem(STORE_KEYS.nutri_log) || '{}')
  const today = new Date().toISOString().slice(0, 10)
  return (db[today] || []).length > 0
}

function getTrainSub() {
  const db = JSON.parse(localStorage.getItem(STORE_KEYS.fisico_sessions) || '[]')
  const today = new Date().toISOString().slice(0, 10)
  const s = db.find((s: { date: string }) => s.date === today)
  return s ? `${s.duration} min · ${Math.round(s.totalKg)} kg` : 'Toca para registrar sesión'
}
function getTrainBadge() {
  const db = JSON.parse(localStorage.getItem(STORE_KEYS.fisico_sessions) || '[]')
  const today = new Date().toISOString().slice(0, 10)
  return db.some((s: { date: string }) => s.date === today) ? '✓ Hecho' : '+50 XP'
}
function getTrainDone() {
  const db = JSON.parse(localStorage.getItem(STORE_KEYS.fisico_sessions) || '[]')
  const today = new Date().toISOString().slice(0, 10)
  return db.some((s: { date: string }) => s.date === today)
}

function getFinBadge() {
  const db = JSON.parse(localStorage.getItem(STORE_KEYS.finances_tx) || '[]')
  const today = new Date().toISOString().slice(0, 10)
  return db.filter((t: { date: string }) => t.date === today).length ? '✓ Activo' : '+50 XP'
}
function getFinDone() {
  const db = JSON.parse(localStorage.getItem(STORE_KEYS.finances_tx) || '[]')
  const today = new Date().toISOString().slice(0, 10)
  return db.filter((t: { date: string }) => t.date === today).length > 0
}


