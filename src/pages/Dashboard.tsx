import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TopBar } from '@/components/layout/TopBar'
import { Card, Badge, ProgressBar, EmptyState, Input, Button } from '@/components/ui'
import { useXP } from '@/contexts/XPContext'
import { useToast } from '@/stores/toast'
import { calcLevel } from '@/lib/xp-engine'
import { getDisplayName } from '@/lib/storage'
import { AREA_COLORS, AREA_ICONS, AREA_NAMES, type AreaStat, type Goal } from '@/types'

export default function Dashboard() {
  const { xp, awardXP: award } = useXP()
  const todayStr = new Date().toISOString().slice(0, 10)

  const areas: AreaStat[] = ['disc', 'fuerza', 'intel', 'riqueza']
  const [goals, setGoals] = useState<Goal[]>(() => {
    try { return JSON.parse(localStorage.getItem('josema_rpg_missions_v1') || '[]') } catch { return [] }
  })
  const [goalName, setGoalName] = useState('')
  const [goalCur, setGoalCur] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalStat, setGoalStat] = useState<AreaStat>('disc')
  const toast = useToast()
  const acClass: Record<AreaStat, string> = {
    disc: 'ac-a',
    fuerza: 'ac-b',
    intel: 'ac-c',
    riqueza: 'ac-d',
  }

  useEffect(() => {
    const runEngine = () => {
      const dbTime = JSON.parse(localStorage.getItem('josema_rpg_time_v4') || '{}')
      const dbNutri = JSON.parse(localStorage.getItem('josema_rpg_nutri_log') || '{}')
      const dbSessions = JSON.parse(localStorage.getItem('lifeos_sessions_v1') || '[]')
      const dbTx = JSON.parse(localStorage.getItem('lifeos_finances_tx_v1') || '[]')

      // Check and award XP for completed tasks
      const tasks = dbTime[todayStr] || []
      const done = tasks.filter((t: { done: boolean }) => t.done).length
      const total = tasks.length
      if (total > 0 && done === total) {
        // Award agenda XP only once per day
        const todayLog = xp.disc.log.filter(e => e.date === todayStr && e.concept === 'Agenda completada')
        if (todayLog.length === 0) {
          award('disc', 50, 'Agenda completada', todayStr)
        }
      }

      // Nutrition
      const todayMeals = dbNutri[todayStr] || {}
      const allFoods: unknown[] = Object.values(todayMeals).flat()
      if (allFoods.length > 0) {
        const todayLog2 = xp.fuerza.log.filter(e => e.date === todayStr && e.concept === 'Nutrición registrada')
        if (todayLog2.length === 0) {
          award('fuerza', 50, 'Nutrición registrada', todayStr)
        }
      }

      // Training
      const todaySess = dbSessions.find((s: { date: string }) => s.date === todayStr)
      if (todaySess) {
        const todayLog3 = xp.intel.log.filter(e => e.date === todayStr && e.concept === 'Entrenamiento completado')
        if (todayLog3.length === 0) {
          award('intel', 50, 'Entrenamiento completado', todayStr)
        }
      }

      // Finances
      const todayTx = dbTx.filter((t: { date: string }) => t.date === todayStr)
      if (todayTx.length > 0) {
        const todayLog4 = xp.riqueza.log.filter(e => e.date === todayStr && e.concept === 'Finanzas registradas')
        if (todayLog4.length === 0) {
          award('riqueza', 50, 'Finanzas registradas', todayStr)
        }
      }
    }

    runEngine()
  }, [todayStr, xp])

  const recentLog = Object.entries(xp)
    .flatMap(([stat, area]) => (area.log || []).map(e => ({ ...e, stat })))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)

  // Habits preview
  const dbHabits = JSON.parse(localStorage.getItem('lifeos_habits_v1') || '[]')
  const dbLog = JSON.parse(localStorage.getItem('lifeos_habits_log_v1') || '{}')
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
    return h.type === 'bool' ? !!val : val >= h.goal
  }).length
  const habitsPct = activeHabits.length ? Math.round(habitsDone / activeHabits.length * 100) : 0

  return (
    <div>
      <TopBar />

      {/* Habits Dashboard */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-2.5">
          <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px]">Hábitos de hoy</div>
          <Link to="/habitos" className="text-[11px] font-semibold text-[var(--color-sub)] bg-[var(--color-s1)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 font-sans">
            Gestionar
          </Link>
        </div>

        {activeHabits.length === 0 ? (
          <Card padded className="text-center mb-2.5">
            <div className="text-[13px] text-[var(--color-sub)] mb-2.5">Sin hábitos creados todavía</div>
            <Link to="/habitos" className="inline-block bg-[#9b7fe0]/[0.1] text-[#9b7fe0] border border-[#9b7fe0]/[0.2] rounded-lg px-4 py-2 text-xs font-semibold font-sans">
              + Crear primer hábito
            </Link>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-xs text-[var(--color-sub)]">
                <span className="font-bold text-[var(--color-text)]">{habitsDone}</span> / {activeHabits.length} completados
              </div>
              <div className="font-serif text-lg text-[#9b7fe0]">{habitsPct}%</div>
            </div>
            <ProgressBar value={habitsPct} color="gradient" height={5} className="mb-2.5" animated />
          </>
        )}
      </div>

      {/* Today Summary */}
      <div className="px-4">
        <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-3">Resumen de hoy</div>
        <Card>
          {[
            { icon: '📋', title: 'Agenda', color: '#5b8af0', link: '/agenda' },
            { icon: '🥗', title: 'Nutrición', color: '#52b788', link: '/nutricion' },
            { icon: '🏋️', title: 'Físico', color: '#e07a5f', link: '/fisico' },
            { icon: '💶', title: 'Finanzas', color: '#c9a84c', link: '/finanzas' },
          ].map((item, i) => (
            <Link
              key={item.link}
              to={item.link}
              className="flex items-center gap-3.5 px-4 py-3.5 border-b border-[var(--color-border)] last:border-b-0 cursor-pointer transition-colors duration-150 active:bg-white/[0.03] relative"
              style={{
                borderLeftColor: item.color,
                borderLeftWidth: 3,
                borderLeftStyle: 'solid',
                borderTopLeftRadius: i === 0 ? 0 : undefined,
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: `${item.color}1e` }}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[var(--color-text)] truncate">{item.title}</div>
                <div className="text-xs text-[var(--color-sub)] mt-0.5 truncate">Toca para abrir</div>
              </div>
              <Badge variant="pending">+50 XP</Badge>
            </Link>
          ))}
        </Card>
      </div>

      {/* Areas Grid */}
      <div className="px-4 pt-4">
        <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-3">Progreso por área</div>
        <div className="grid grid-cols-2 gap-2.5">
          {areas.map(stat => {
            const area = xp[stat]
            const lv = calcLevel(area?.total || 0)
            return (
              <Link
                key={stat}
                to={stat === 'disc' ? '/agenda' : stat === 'fuerza' ? '/nutricion' : stat === 'intel' ? '/fisico' : '/finanzas'}
                className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 relative overflow-hidden cursor-pointer transition-all duration-250 hover:border-white/[0.2] hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
              >
                <div
                  className="absolute top-0 left-4 right-[40%] h-0.5 rounded-b-sm"
                  style={{ background: AREA_COLORS[stat] }}
                />
                <span className="text-[22px] mb-3 block">{AREA_ICONS[stat]}</span>
                <div className="text-[11px] font-semibold text-[var(--color-sub)] uppercase tracking-wide mb-1">
                  {AREA_NAMES[stat]}
                </div>
                <div className="font-serif text-[38px] leading-none mb-2.5" style={{ color: AREA_COLORS[stat] }}>
                  {lv.level}
                </div>
                <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${lv.pct}%`, background: AREA_COLORS[stat] }} />
                </div>
                <div className="text-[11px] text-[var(--color-dim)] font-medium">
                  {area?.total || 0} XP · −{lv.needed - lv.current}
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Goals / Objetivos */}
      <div className="px-4 pt-4">
        <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-3">Objetivos a largo plazo</div>
        {goals.map((g, i) => {
          const pct = g.goal > 0 ? Math.min(100, Math.round(g.current / g.goal * 100)) : 0
          const done = g.current >= g.goal
          const col = AREA_COLORS[g.stat]
          return (
            <div key={i} className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mb-2.5 relative">
              {done && <div className="inline-block text-[11px] font-semibold text-[#52b788] bg-[#52b788]/10 border border-[#52b788]/20 rounded-md px-2.5 py-0.5 mb-1.5">✓ Completado</div>}
              <button
                onClick={() => {
                  const next = goals.filter((_, ii) => ii !== i)
                  setGoals(next)
                  localStorage.setItem('josema_rpg_missions_v1', JSON.stringify(next))
                }}
                className="absolute top-3.5 right-4 text-[11px] font-semibold text-[var(--color-dim)] bg-transparent border-none cursor-pointer px-1.5 py-0.5"
              >✕</button>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-sub)] uppercase tracking-wide mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: col }} />
                {AREA_NAMES[g.stat]}
              </div>
              <div className="font-serif text-lg text-[var(--color-text)] mb-2.5 leading-tight">{g.name}</div>
              <div className="flex justify-between text-xs text-[var(--color-sub)] mb-1.5">
                <span>{g.current}</span><span>{g.goal}</span>
              </div>
              <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden mb-3">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: col }} />
              </div>
              {!done && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Nuevo valor"
                    className="flex-1 bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3 py-2 text-[13px] font-sans outline-none"
                    id={`gv-${i}`}
                  />
                  <button
                    onClick={() => {
                      const inp = document.getElementById(`gv-${i}`) as HTMLInputElement
                      const val = parseFloat(inp?.value || '0')
                      if (isNaN(val)) return
                      const next = [...goals]
                      const wasDone = next[i].current >= next[i].goal
                      next[i] = { ...next[i], current: val }
                      setGoals(next)
                      localStorage.setItem('josema_rpg_missions_v1', JSON.stringify(next))
                      if (!wasDone && val >= next[i].goal) {
                        award(next[i].stat, 200, 'Objetivo: ' + next[i].name, todayStr)
                        toast.show('+200 XP — ¡Objetivo completado!')
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-[13px] font-semibold font-sans cursor-pointer border"
                    style={{ background: col + '18', color: col, borderColor: col + '33' }}
                  >Actualizar</button>
                </div>
              )}
            </div>
          )
        })}

        <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mb-2.5">
          <div className="text-[13px] font-semibold text-[var(--color-sub)] mb-3.5">Añadir objetivo</div>
          <Input value={goalName} onChange={setGoalName} placeholder="¿Qué quieres conseguir?" className="mb-2" />
          <div className="flex gap-2 mb-2">
            <Input value={goalCur} onChange={setGoalCur} type="number" placeholder="Valor actual" className="flex-1" />
            <Input value={goalTarget} onChange={setGoalTarget} type="number" placeholder="Meta" className="flex-1" />
          </div>
          <select
            value={goalStat}
            onChange={e => setGoalStat(e.target.value as AreaStat)}
            className="w-full bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-sub)] rounded-xl px-3.5 py-2.5 text-[13px] font-sans mb-2.5 outline-none cursor-pointer"
          >
            {areas.map(a => <option key={a} value={a}>{AREA_ICONS[a]} {AREA_NAMES[a]}</option>)}
          </select>
          <button
            onClick={() => {
              if (!goalName.trim()) return
              const next = [...goals, { name: goalName.trim(), current: parseFloat(goalCur) || 0, goal: parseFloat(goalTarget) || 100, stat: goalStat }]
              setGoals(next)
              localStorage.setItem('josema_rpg_missions_v1', JSON.stringify(next))
              setGoalName(''); setGoalCur(''); setGoalTarget('')
              toast.show('✓ Objetivo añadido')
            }}
            className="w-full py-3 rounded-xl bg-[#5b8af0]/[0.12] text-[var(--color-acc-blue)] border border-[#5b8af0]/[0.2] text-sm font-semibold font-sans cursor-pointer"
          >Añadir objetivo</button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-4 pt-4 pb-4">
        <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-3">Actividad reciente</div>
        <Card>
          {recentLog.length === 0 ? (
            <EmptyState message="Sin actividad registrada aún." />
          ) : (
            recentLog.map((e, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] last:border-b-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: AREA_COLORS[e.stat as AreaStat] }} />
                <div className="flex-1">
                  <div className="text-[13px] font-medium text-[var(--color-text)]">
                    {AREA_ICONS[e.stat as AreaStat]} {e.concept}
                  </div>
                  <div className="text-[11px] text-[var(--color-dim)] mt-0.5">{e.date}</div>
                </div>
                <div className="font-serif text-base italic" style={{ color: AREA_COLORS[e.stat as AreaStat] }}>
                  +{e.amount} XP
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  )
}
