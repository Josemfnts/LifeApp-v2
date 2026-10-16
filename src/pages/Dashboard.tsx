import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TopBar } from '@/components/layout/TopBar'
import { useXP } from '@/contexts/XPContext'
import { useToast } from '@/stores/toast'
import { calcLevel, calcCombinedStreak } from '@/lib/xp-engine'
import { STORE_KEYS, ALL_STORAGE_KEYS } from '@/lib/storageKeys'
import { useRemoteChange } from '@/lib/mirror'
import { AREA_COLORS, AREA_ICONS, AREA_NAMES, type AreaStat, type Goal } from '@/types'
import { Modal } from '@/components/ui'
import { useNutriStore } from '@/stores/nutriStore'
import { isFlow } from '@/lib/finance/flow'
import { flowAmount } from '@/lib/finance/split'
import { sumEuros } from '@/lib/finance/money'
import type { Tx } from '@/lib/finance/types'
import { UtensilsCrossed, Dumbbell, Footprints, Plus, Zap, CalendarDays, Receipt, ClipboardList, FileText, Users } from 'lucide-react'
import '@/styles/dashboard.css'

const acCls: Record<AreaStat, string> = { disc: 'ac-a', fuerza: 'ac-b', intel: 'ac-c', riqueza: 'ac-d' }
const AreaIcon: Record<AreaStat, typeof ClipboardList> = { disc: ClipboardList, fuerza: UtensilsCrossed, intel: Dumbbell, riqueza: Receipt }

export default function Dashboard() {
  const { xp, awardXP: award } = useXP()
  const toast = useToast()
  const todayStr = new Date().toISOString().slice(0, 10)
  const areas: AreaStat[] = ['disc', 'fuerza', 'intel', 'riqueza']
  const kcalGoal = useNutriStore(s => s.goals.kcal)

  const [goals, setGoals] = useState<Goal[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORE_KEYS.josema_rpg_missions_v1) || '[]') } catch { return [] }
  })

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

  // Secciones plegables — primero viewport muestra Inicio limpio.
  const [showGoals, setShowGoals] = useState(false)
  const [showActivity, setShowActivity] = useState(false)
  const [showAchievements, setShowAchievements] = useState(false)

  // Hoja "Registro rápido".
  const [quickOpen, setQuickOpen] = useState(false)
  const navigate = useNavigate()

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

  /* Métricas reales para la tarjeta "Tu día".
     Sin inventar: kcal/entreno/% hábitos/flujo financiero del día, leídos
     del localStorage existente (STORE_KEYS). */
  const dayMetrics = (() => {
    const dbNutri = JSON.parse(localStorage.getItem(STORE_KEYS.nutri_log) || '{}')
    const foods: { kcal?: number }[] = dbNutri[todayStr] || []
    const kcal = Math.round(foods.reduce((s, f) => s + (f.kcal || 0), 0))
    const dbSessions = JSON.parse(localStorage.getItem(STORE_KEYS.fisico_sessions) || '[]')
    const sToday = dbSessions.find((s: { date: string }) => s.date === todayStr)
    const dbHabits = JSON.parse(localStorage.getItem(STORE_KEYS.lifeos_habits) || '[]')
    const dbHL = JSON.parse(localStorage.getItem(STORE_KEYS.lifeos_habits_log) || '{}')
    const dow = new Date().getDay()
    const activeHabits = dbHabits.filter((h: { freq: string; days: number[] }) => {
      if (h.freq === 'daily') return true
      if (h.freq === 'weekdays') return dow >= 1 && dow <= 5
      if (h.freq === 'weekend') return dow === 0 || dow === 6
      if (h.freq === 'custom') return (h.days || []).includes(dow)
      return true
    })
    const doneHabits = activeHabits.filter((h: { id: number; type: string; goal: number }) => {
      const val = (dbHL[todayStr] || {})[h.id] || 0
      if (h.type === 'avoid') return val === 0
      return h.type === 'bool' ? !!val : val >= h.goal
    }).length
    const habitsPct = activeHabits.length ? Math.round(doneHabits / activeHabits.length * 100) : 0
    const dbTasks = JSON.parse(localStorage.getItem(STORE_KEYS.agenda_tasks) || '{}')
    const tasks: { done: boolean }[] = dbTasks[todayStr] || []
    return {
      kcal,
      train: sToday ? `${sToday.duration ?? 0} min` : '—',
      habits: doneHabits,
      habitsTotal: activeHabits.length,
      habitsPct,
      tasksDone: tasks.filter(t => t.done).length,
      tasksTotal: tasks.length,
    }
  })()

  const kcalPct = kcalGoal > 0 ? Math.min(100, Math.round(dayMetrics.kcal / kcalGoal * 100)) : 0

  const streak = calcCombinedStreak(xp)
  const streakBars = Math.min(8, Math.max(streak, 0))

  return (
    <div>
      <TopBar />

      {/* Hábitos/Notas/Comunidad: accesos claros desde Inicio */}
      <div className="section s0" style={{ paddingTop: 4, paddingBottom: 0 }}>
        <nav className="home-shortcuts" aria-label="Más módulos">
          <Link to="/habitos"><Zap size={16} aria-hidden="true" />Hábitos</Link>
          <Link to="/notas"><FileText size={16} aria-hidden="true" />Notas</Link>
          <Link to="/comunidad"><Users size={16} aria-hidden="true" />Comunidad</Link>
        </nav>
      </div>

      {/* Tarjeta "Tu día" */}
      <div className="section s1" style={{ paddingTop: 14, paddingBottom: 0 }}>
        <div className="day-card">
          <div className="day-card-head">
            <div className="day-card-title">Tu día</div>
            <span className={dayMetrics.tasksTotal > 0 ? 'day-progress-chip' : 'day-progress-chip muted'}>
              {dayMetrics.tasksTotal > 0 ? `Agenda ${dayMetrics.tasksDone}/${dayMetrics.tasksTotal}` : 'Sin tareas hoy'}
            </span>
          </div>
          <div className="day-metrics">
            <Link to="/nutricion" className="day-metric" aria-label="Ir a Nutrición">
              <span className="day-metric-icon teal"><UtensilsCrossed size={16} aria-hidden="true" /></span>
              <span className="day-metric-num">{dayMetrics.kcal.toLocaleString('es-ES')}</span>
              <span className="day-metric-lbl">kcal</span>
              <div className="day-metric-bar"><div className="day-metric-bar-fill teal" style={{ width: `${kcalPct}%` }} /></div>
            </Link>
            <Link to="/fisico" className="day-metric" aria-label="Ir a Físico">
              <span className="day-metric-icon volt"><Dumbbell size={16} aria-hidden="true" /></span>
              <span className="day-metric-num">{dayMetrics.train}</span>
              <span className="day-metric-lbl">Entreno</span>
              <div className="day-metric-bar"><div className="day-metric-bar-fill volt" style={{ width: `${dayMetrics.train !== '—' ? 100 : 0}%` }} /></div>
            </Link>
            <Link to="/habitos" className="day-metric" aria-label="Ir a Hábitos">
              <span className="day-metric-icon night"><Footprints size={16} aria-hidden="true" /></span>
              <span className="day-metric-num">{dayMetrics.habitsPct}%</span>
              <span className="day-metric-lbl">Hábitos</span>
              <div className="day-metric-bar"><div className="day-metric-bar-fill night" style={{ width: `${dayMetrics.habitsPct}%` }} /></div>
            </Link>
          </div>
        </div>
      </div>

      {/* Grid 2×2 accesos a módulos — contenido real, no simulaciones. */}
      <div className="section s2" style={{ paddingTop: 14, paddingBottom: 0 }}>
        <div className="access-grid">
          <Link to="/agenda" className="access-card" aria-label="Abrir Agenda">
            <span className="access-icon blue"><CalendarDays size={20} aria-hidden="true" /></span>
            <span className="access-name">Agenda</span>
            <span className="access-headline">{agendaSummary()}</span>
            <span className="access-sub">{agendaSub()}</span>
            <span className="access-arrow" aria-hidden="true">›</span>
          </Link>
          <Link to="/fisico" className="access-card" aria-label="Abrir Físico">
            <span className="access-icon green"><Dumbbell size={20} aria-hidden="true" /></span>
            <span className="access-name">Físico</span>
            <span className="access-headline">{fitnessSummary()}</span>
            <span className="access-sub">{fitnessSub()}</span>
            <span className="access-arrow" aria-hidden="true">›</span>
          </Link>
          <Link to="/nutricion" className="access-card" aria-label="Abrir Nutrición">
            <span className="access-icon teal"><UtensilsCrossed size={20} aria-hidden="true" /></span>
            <span className="access-name">Nutrición</span>
            <span className="access-headline">{nutritionSummary()}</span>
            <span className="access-sub">{nutritionSub()}</span>
            <span className="access-arrow" aria-hidden="true">›</span>
          </Link>
          <Link to="/finanzas" className="access-card" aria-label="Abrir Finanzas">
            <span className="access-icon orange"><Receipt size={20} aria-hidden="true" /></span>
            <span className="access-name">Finanzas</span>
            <span className="access-headline">{financeSummary()}</span>
            <span className="access-sub">{financeSub()}</span>
            <span className="access-arrow" aria-hidden="true">›</span>
          </Link>
        </div>
      </div>

      {/* Banda de racha — sin inventar %, sólo días reales. */}
      <div className="section s3" style={{ paddingTop: 14, paddingBottom: 0 }}>
        <div className="streak-band">
          <span className="streak-flame" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c1 4 5 5 5 10a5 5 0 11-10 0c0-2 1-3 2-4-.5 1.5 0 3 1.5 4 0-3 2-5 2-9 1 1 1.5 2 2 4z" />
            </svg>
          </span>
          <div className="streak-text">
            <div className="streak-title">Racha de <strong>{streak}</strong> {streak === 1 ? 'día' : 'días'}</div>
            <div className="streak-sub">Entrenando y registrando comidas sin fallar</div>
          </div>
          <div className="streak-bars" aria-hidden="true">
            {Array.from({ length: streakBars }, (_, i) => (
              <span key={i} className={`streak-bar${i === streakBars - 1 && streak > 0 ? ' on' : ''}`} style={{ height: `${10 + (i % 4) * 6}px` }} />
            ))}
          </div>
        </div>
      </div>

      {/* Registro rápido — abre hoja con accesos reales a tareas/comida/entreno/movimiento. */}
      <div className="section s4" style={{ paddingTop: 14, paddingBottom: 0 }}>
        <button className="quick-cta" onClick={() => setQuickOpen(true)} aria-label="Abrir registro rápido">
          <span className="quick-cta-icon" aria-hidden="true"><Plus size={18} /></span>
          Registro rápido
        </button>
      </div>

      {/* Áreas (progreso por área) */}
      <div className="section s5">
        <div className="sec-label">Progreso por área</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {areas.map(stat => {
            const area = xp[stat]
            const lv = calcLevel(area?.total || 0)
            const Icon = AreaIcon[stat]
            return (
              <Link
                key={stat}
                to={stat === 'disc' ? '/agenda' : stat === 'fuerza' ? '/nutricion' : stat === 'intel' ? '/fisico' : '/finanzas'}
                className={`area-card ${acCls[stat]}`}
                style={{ textDecoration: 'none' }}
              >
                <span className="area-icon"><Icon size={22} aria-hidden="true" /></span>
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

      {/* Objetivos — plegable para no ensuciar el primer viewport. */}
      <div className="section">
        <button className="fold" onClick={() => setShowGoals(v => !v)} aria-expanded={showGoals}>
          <span className="fold-label">Objetivos a largo plazo · {goals.length}</span>
          <span className={`fold-chev${showGoals ? ' open' : ''}`} aria-hidden="true">▾</span>
        </button>
        {showGoals && (
          <div>
            {goals.map((g, i) => {
              const pct = g.goal > 0 ? Math.min(100, Math.round(g.current / g.goal * 100)) : 0
              const done = g.current >= g.goal
              const col = AREA_COLORS[g.stat]
              return (
                <div key={i} className="goal-card-v2">
                  {done && <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, color: 'var(--color-acc-green)', background: 'color-mix(in srgb, var(--color-acc-green) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--color-acc-green) 22%, transparent)', borderRadius: 6, padding: '2px 10px', marginBottom: 6 }}>✓ Completado</div>}
                  <button onClick={() => { const next = goals.filter((_, ii) => ii !== i); setGoals(next); localStorage.setItem(STORE_KEYS.josema_rpg_missions_v1, JSON.stringify(next)) }}
                    style={{ position: 'absolute', top: 14, right: 16, fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px' }} aria-label="Eliminar objetivo">✕</button>
                  <div className="goal-tag">
                    <span className="goal-tag-dot" style={{ background: col }} />
                    {AREA_NAMES[g.stat]}
                  </div>
                  <div className="goal-name-v2">{g.name}</div>
                  <div className="goal-nums-v2"><span>{g.current}</span><span>{g.goal}</span></div>
                  <div className="goal-track-v2"><div className="goal-fill-v2" style={{ width: `${pct}%`, background: col }} /></div>
                  {!done && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="number" placeholder="Nuevo valor" id={`gv-${i}`}
                        style={{ flex: 1, background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 10, padding: '9px 12px', fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none' }} />
                      <button onClick={() => {
                        const inp = document.getElementById(`gv-${i}`) as HTMLInputElement
                        const val = parseFloat(inp?.value || '0')
                        if (isNaN(val)) return
                        const next = [...goals]; const wasDone = next[i].current >= next[i].goal
                        next[i] = { ...next[i], current: val }; setGoals(next)
                        localStorage.setItem(STORE_KEYS.josema_rpg_missions_v1, JSON.stringify(next))
                        if (!wasDone && val >= next[i].goal) { award(next[i].stat, 200, 'Objetivo: ' + next[i].name, todayStr); toast.show('+200 XP — ¡Objetivo completado!') }
                      }}
                        style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', background: 'color-mix(in srgb, ' + col + ' 18%, transparent)', color: col, border: '1px solid color-mix(in srgb, ' + col + ' 33%, transparent)' }}>Actualizar</button>
                    </div>
                  )}
                </div>
              )
            })}

            <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: 18, marginTop: 4, boxShadow: 'var(--shadow-impulso)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-sub)', marginBottom: 14 }}>Añadir objetivo</div>
              <input className="inp" value={goalName} onChange={e => setGoalName(e.target.value)} placeholder="¿Qué quieres conseguir?" style={{ marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input className="inp" type="number" value={goalCur} onChange={e => setGoalCur(e.target.value)} placeholder="Valor actual" style={{ flex: 1, marginBottom: 0 }} />
                <input className="inp" type="number" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} placeholder="Meta" style={{ flex: 1, marginBottom: 0 }} />
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
                style={{ width: '100%', background: 'color-mix(in srgb, var(--color-volt) 28%, transparent)', border: '1px solid color-mix(in srgb, var(--color-volt) 40%, transparent)', color: 'var(--color-text)', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, padding: 12, borderRadius: 14, cursor: 'pointer' }}>Añadir objetivo</button>
            </div>
          </div>
        )}
      </div>

      {/* Actividad reciente — plegable. */}
      <div className="section">
        <button className="fold" onClick={() => setShowActivity(v => !v)} aria-expanded={showActivity}>
          <span className="fold-label">Actividad reciente · {recentLog.length}</span>
          <span className={`fold-chev${showActivity ? ' open' : ''}`} aria-hidden="true">▾</span>
        </button>
        {showActivity && (
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
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontStyle: 'italic', color: AREA_COLORS[e.stat as AreaStat] }}>+{e.amount} XP</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Logros — plegable. */}
      {(() => {
        const achievements: { icon: string; title: string; desc: string; unlocked: boolean }[] = []
        const dbHL = JSON.parse(localStorage.getItem(STORE_KEYS.lifeos_habits_log) || '{}')
        const allDates2 = Object.keys(dbHL)
        const totalCheckins = allDates2.reduce((s: number, d: string) => s + Object.values(dbHL[d] as Record<string, number>).reduce((ss: number, v: number) => ss + (v > 0 ? 1 : 0), 0), 0)
        const combinedStreak = streak

        const allTasks2 = Object.values(JSON.parse(localStorage.getItem(STORE_KEYS.agenda_tasks) || '{}')).flat() as { done: boolean }[]
        const totalDone2 = allTasks2.filter((t: { done: boolean }) => t.done).length
        const sessCount = JSON.parse(localStorage.getItem(STORE_KEYS.fisico_sessions) || '[]').length
        const txCount2 = JSON.parse(localStorage.getItem(STORE_KEYS.finances_tx) || '[]').length

        achievements.push({ icon: 'Z', title: 'Principiante', desc: '7 días de racha', unlocked: combinedStreak >= 7 })
        achievements.push({ icon: 'Z', title: 'Constante', desc: '30 días de racha', unlocked: combinedStreak >= 30 })
        achievements.push({ icon: '✓', title: 'Productivo', desc: '100 tareas completadas', unlocked: totalDone2 >= 100 })
        achievements.push({ icon: '*', title: 'Hábito maestro', desc: '1000 check-ins', unlocked: totalCheckins >= 1000 })
        achievements.push({ icon: 'D', title: 'Fuerza', desc: '50 sesiones de entreno', unlocked: sessCount >= 50 })
        achievements.push({ icon: '€', title: 'Ahorrador', desc: '100 transacciones', unlocked: txCount2 >= 100 })
        const unlocked = achievements.filter(a => a.unlocked)
        if (unlocked.length === 0) return null
        return (
          <div className="section">
            <button className="fold" onClick={() => setShowAchievements(v => !v)} aria-expanded={showAchievements}>
              <span className="fold-label">🏆 Logros · {unlocked.length}/{achievements.length}</span>
              <span className={`fold-chev${showAchievements ? ' open' : ''}`} aria-hidden="true">▾</span>
            </button>
            {showAchievements && (
              <div className="achievements-grid">
                {achievements.map(a => (
                  <div key={a.title} className={`achievement${a.unlocked ? '' : ' locked'}`}>
                    <div className="achievement-icon">{a.icon}</div>
                    <div className="achievement-title">{a.title}</div>
                    <div className="achievement-desc">{a.desc}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* Hoja Registro rápido */}
      <Modal open={quickOpen} onClose={() => setQuickOpen(false)} title="Registro rápido">
        <div style={{ padding: '4px 20px 8px', fontSize: 13, color: 'var(--color-sub)', lineHeight: 1.5 }}>
          Atajos a las pantallas de cada módulo. La app abre el módulo con su estado actual, no simula escrituras.
        </div>
        <div className="quick-grid" style={{ padding: '0 20px 16px' }}>
          <button className="quick-grid-item" onClick={() => { setQuickOpen(false); navigate('/agenda') }}>
            <span className="quick-grid-icon tasks"><ClipboardList size={18} aria-hidden="true" /></span>
            <span className="quick-grid-title">Tareas</span>
            <span className="quick-grid-sub">Abrir Agenda</span>
          </button>
          <button className="quick-grid-item" onClick={() => { setQuickOpen(false); navigate('/nutricion') }}>
            <span className="quick-grid-icon food"><UtensilsCrossed size={18} aria-hidden="true" /></span>
            <span className="quick-grid-title">Comida</span>
            <span className="quick-grid-sub">Abrir Nutrición</span>
          </button>
          <button className="quick-grid-item" onClick={() => { setQuickOpen(false); navigate('/fisico') }}>
            <span className="quick-grid-icon fit"><Dumbbell size={18} aria-hidden="true" /></span>
            <span className="quick-grid-title">Entreno</span>
            <span className="quick-grid-sub">Abrir Físico</span>
          </button>
          <button className="quick-grid-item" onClick={() => { setQuickOpen(false); navigate('/finanzas') }}>
            <span className="quick-grid-icon money"><Receipt size={18} aria-hidden="true" /></span>
            <span className="quick-grid-title">Movimiento</span>
            <span className="quick-grid-sub">Abrir Finanzas</span>
          </button>
        </div>
      </Modal>
    </div>
  )
}

function agendaSummary(): string {
  const db = JSON.parse(localStorage.getItem(STORE_KEYS.agenda_tasks) || '{}')
  const today = new Date().toISOString().slice(0, 10)
  const tasks = db[today] || []
  if (!tasks.length) return 'Sin tareas'
  return `${tasks.filter((t: { done: boolean }) => t.done).length}/${tasks.length} hechas`
}
function agendaSub(): string {
  const db = JSON.parse(localStorage.getItem(STORE_KEYS.agenda_tasks) || '{}')
  const today = new Date().toISOString().slice(0, 10)
  const tasks = db[today] || []
  if (!tasks.length) return 'Toca para planificar'
  const pending = tasks.filter((t: { done: boolean }) => !t.done).length
  return pending === 0 ? 'Día completado' : `${pending} pendientes`
}

function fitnessSummary(): string {
  const db = JSON.parse(localStorage.getItem(STORE_KEYS.fisico_sessions) || '[]')
  const today = new Date().toISOString().slice(0, 10)
  const s = db.find((s: { date: string }) => s.date === today)
  if (!s) return 'Sin entreno'
  return `${s.duration ?? 0} min`
}
function fitnessSub(): string {
  const db = JSON.parse(localStorage.getItem(STORE_KEYS.fisico_sessions) || '[]')
  const today = new Date().toISOString().slice(0, 10)
  const s = db.find((s: { date: string }) => s.date === today)
  if (!s) return 'Toca para registrar'
  return `${Math.round(s.totalKg || 0)} kg movidos`
}

function nutritionSummary(): string {
  const db = JSON.parse(localStorage.getItem(STORE_KEYS.nutri_log) || '{}')
  const today = new Date().toISOString().slice(0, 10)
  const foods: { kcal?: number }[] = db[today] || []
  if (!foods.length) return '0 kcal'
  return `${Math.round(foods.reduce((s, f) => s + (f.kcal || 0), 0)).toLocaleString('es-ES')} kcal`
}
function nutritionSub(): string {
  const db = JSON.parse(localStorage.getItem(STORE_KEYS.nutri_log) || '{}')
  const today = new Date().toISOString().slice(0, 10)
  const foods: { meal?: string }[] = db[today] || []
  if (!foods.length) return 'Toca para registrar'
  const meals = new Set(foods.map(f => f.meal).filter(Boolean))
  return `${foods.length} alimentos · ${meals.size} comidas`
}

function financeSummary(): string {
  const db: Tx[] = JSON.parse(localStorage.getItem(STORE_KEYS.finances_tx) || '[]')
  const today = new Date().toISOString().slice(0, 10)
  const txs = db.filter(t => t.date === today && isFlow(t))
  if (!txs.length) return 'Sin movimientos'
  const balance = sumEuros(txs.map(t => (t.type === 'income' ? 1 : -1) * flowAmount(t)))
  return `${balance >= 0 ? '+' : '−'}${Math.abs(balance).toLocaleString('es-ES', { maximumFractionDigits: 2 })} €`
}
function financeSub(): string {
  const db = JSON.parse(localStorage.getItem(STORE_KEYS.finances_tx) || '[]')
  const today = new Date().toISOString().slice(0, 10)
  const txs = db.filter((t: { date: string }) => t.date === today)
  if (!txs.length) return 'Toca para añadir'
  return `${txs.length} movimiento${txs.length === 1 ? '' : 's'}`
}
