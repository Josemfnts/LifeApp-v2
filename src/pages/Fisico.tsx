import { useState, useEffect, useRef } from 'react'
import { useFisicoStore, STATIC_EXERCISES, EXERCISE_GROUPS, EQUIPMENT_TYPES, EQUIPMENT_LABELS, EXERCISE_COLORS } from '@/stores/fisicoStore'
import { Input, Modal } from '@/components/ui'
import { useToast } from '@/stores/toast'
import { parseActivity, toRunRecord, isDuplicateRun, type ParsedActivity } from '@/lib/activityImport'
import { ROUTINES, ROUTINE_OBJECTIVES, ROUTINE_LEVELS, ROUTINE_PLACES, getObjLabel, getNivelLabel, getLugarLabel, filterRoutines } from '@/data/routinesDB'
import type { NewPost } from '@/lib/social'
import { ShareSheet } from '@/components/social/ShareSheet'
import { sessionToPost, routineToPost, prToPost, runToPost } from '@/lib/socialShare'
import { NotesFor } from '@/components/notes/NotesFor'
import { HealthTab } from '@/components/fisico/HealthTab'

/* ── Timer Hook ── */
function useTimer() {
  const timer = useFisicoStore(s => s.activeTimer)
  const tickTimer = useFisicoStore(s => s.tickTimer)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (timer?.running) {
      intervalRef.current = setInterval(() => tickTimer(), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [timer?.running, tickTimer])

  return timer
}

/* ── STRENGTH TAB ── */
function StrengthTab() {
  const [sub, setSub] = useState<'today' | 'history' | 'routines' | 'library' | 'progress'>('today')
  const sessions = useFisicoStore(s => s.sessions)
  const routines = useFisicoStore(s => s.routines)
  const customExercises = useFisicoStore(s => s.customExercises)
  const toast = useToast()
  const activeSession = useFisicoStore(s => s.activeSession)
  const startSession = useFisicoStore(s => s.startSession)
  const addExerciseToSession = useFisicoStore(s => s.addExerciseToSession)
  const updateSet = useFisicoStore(s => s.updateSet)
  const addSetToExercise = useFisicoStore(s => s.addSetToExercise)
  const removeSet = useFisicoStore(s => s.removeSet)
  const updateExercise = useFisicoStore(s => s.updateExercise)
  const generateWarmupSets = useFisicoStore(s => s.generateWarmupSets)
  const getLastExerciseData = useFisicoStore(s => s.getLastExerciseData)
  const unit = useFisicoStore(s => s.unit)
  const programs = useFisicoStore(s => s.programs)
  const addProgram = useFisicoStore(s => s.addProgram)
  const removeProgram = useFisicoStore(s => s.removeProgram)
  const getMuscleAnalysis = useFisicoStore(s => s.getMuscleAnalysis)
  const shareSummary = useFisicoStore(s => s.shareSummary)
  const wakeLock = useFisicoStore(s => s.wakeLock)
  const setWakeLock = useFisicoStore(s => s.setWakeLock)
  const finishSession = useFisicoStore(s => s.finishSession)
  const cancelSession = useFisicoStore(s => s.cancelSession)
  const deleteSession = useFisicoStore(s => s.deleteSession)
  const saveRoutine = useFisicoStore(s => s.saveRoutine)
  const deleteRoutine = useFisicoStore(s => s.deleteRoutine)
  const addCustomExercise = useFisicoStore(s => s.addCustomExercise)
  const startTimer = useFisicoStore(s => s.startTimer)
  const stopTimer = useFisicoStore(s => s.stopTimer)
  const t = useTimer()
  const [sharePost, setSharePost] = useState<NewPost | null>(null)

  const [rtnName, setRtnName] = useState('')
  const [builderExs, setBuilderExs] = useState<{ name: string; group: string; color: string; sets: number }[]>([])
  const [showExPicker, setShowExPicker] = useState(false)
  const [restPreset, setRestPreset] = useState(90)
  const [notes, setNotes] = useState('')
  const [cexName, setCexName] = useState('')
  const [cexGroup, setCexGroup] = useState('Pecho')
  const [cexEquip, setCexEquip] = useState('')
  const [showAddEx, setShowAddEx] = useState(false)
  const [selRoutine, setSelRoutine] = useState('')
  const [equipFilter, setEquipFilter] = useState('')
  const [libGroup, setLibGroup] = useState('')  // filtro de grupo muscular en la pestaña Ejercicios
  const [progEx, setProgEx] = useState('')      // ejercicio seleccionado en Progreso por ejercicio
  const [dbObj, setDbObj] = useState('')
  const [dbNivel, setDbNivel] = useState('')
  const [dbLugar, setDbLugar] = useState('')
  const [dbSearch2, setDbSearch2] = useState('')
  const [showProgForm, setShowProgForm] = useState(false)
  const [progName, setProgName] = useState('')
  const [progRoutineSel, setProgRoutineSel] = useState<number[]>([])
  const [progColor, setProgColor] = useState('#dd7d55')
  const allExercises = [...STATIC_EXERCISES, ...customExercises.map(e => ({ ...e, equipment: '' }))]
  const [weeklyModal, setWeeklyModal] = useState<string | null>(null)
  const todayStr = new Date().toISOString().slice(0, 10)
  const todaySessions = sessions.filter(s => s.date === todayStr)
  const todayKg = todaySessions.reduce((s, x) => s + x.totalKg, 0)
  const todaySets = todaySessions.reduce((s, x) => s + x.exercises.reduce((ss, ex) => ss + ex.sets.length, 0), 0)

  // La hoja de compartir vive dentro de subBar para estar disponible en todas
  // las sub-pestañas (cada rama del render incluye {subBar}).
  const subBar = (
    <>
    {sharePost && <ShareSheet post={sharePost} onClose={() => setSharePost(null)} />}
    <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto' }}>
      {(['today','history','routines','library','progress'] as const).map(k => (
        <button key={k} onClick={() => setSub(k)}
          style={{
            flex: 1, padding: '9px 4px', borderRadius: 10, fontSize: 12, fontWeight: 700,
            fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid', whiteSpace: 'nowrap',
            background: sub === k ? 'var(--color-acc-orange)26' : 'transparent',
            color: sub === k ? 'var(--color-acc-orange)' : 'var(--color-dim)',
            borderColor: sub === k ? 'var(--color-acc-orange)4d' : 'var(--color-border)',
            transition: 'all 0.15s',
          }}
        >{{today:'Hoy',history:'Historial',routines:'Rutinas',library:'Ejercicios',progress:'Progreso'}[k]}</button>
      ))}
    </div>
    </>
  )

  /* ── TODAY / ACTIVE SESSION ── */
  if (sub === 'today') {
    return (
      <div className="animate-tab">
        {subBar}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-3.5 text-center relative overflow-hidden">
            <div className="absolute top-0 left-[10%] right-[10%] h-0.5 rounded-b-sm bg-[var(--color-acc-orange)]" />
            <div className="font-serif text-[26px] text-[var(--color-acc-orange)] leading-none">{todayKg}</div>
            <div className="text-[10px] font-semibold text-[var(--color-dim)] uppercase tracking-wide mt-1">kg totales</div>
          </div>
          <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-3.5 text-center relative overflow-hidden">
            <div className="absolute top-0 left-[10%] right-[10%] h-0.5 rounded-b-sm bg-[var(--color-acc-blue)]" />
            <div className="font-serif text-[26px] text-[var(--color-acc-blue)] leading-none">{todaySets}</div>
            <div className="text-[10px] font-semibold text-[var(--color-dim)] uppercase tracking-wide mt-1">series</div>
          </div>
          <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-3.5 text-center relative overflow-hidden">
            <div className="absolute top-0 left-[10%] right-[10%] h-0.5 rounded-b-sm bg-[var(--color-acc-green)]" />
            <div className="font-serif text-[26px] text-[var(--color-acc-green)] leading-none">{todaySessions.length}</div>
            <div className="text-[10px] font-semibold text-[var(--color-dim)] uppercase tracking-wide mt-1">sesiones</div>
          </div>
        </div>

        {/* Rest Timer */}
        {t && (
          <div className="bg-[var(--color-acc-blue)]/[0.06] border border-[var(--color-acc-blue)]/[0.2] rounded-2xl p-3.5 mb-3 flex flex-col">
            <div className="flex gap-1.5 mb-2.5">
              {[60, 90, 120, 180].map(s => (
                <button key={s} onClick={() => { setRestPreset(s); startTimer(s) }}
                  className={`flex-1 py-1 rounded-lg text-[11px] font-bold font-sans cursor-pointer border transition-all ${
                    restPreset === s ? 'bg-[var(--color-acc-blue)]/15 text-[var(--color-acc-blue)] border-[var(--color-acc-blue)]/30' : 'bg-[var(--color-s2)] text-[var(--color-dim)] border-[var(--color-border)]'
                  }`}
                >{s >= 60 ? `${s / 60}min` : `${s}s`}</button>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <svg width="72" height="72" className="flex-shrink-0" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                <circle cx="36" cy="36" r="30" fill="none" stroke="var(--color-blue)" strokeWidth="6"
                  strokeDasharray="188.5" strokeDashoffset={188.5 * (1 - t.remaining / t.preset)} strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.9s linear' }} />
              </svg>
              <div className="flex-1">
                <div className="text-[11px] font-semibold text-[var(--color-acc-blue)] uppercase tracking-wider mb-1.5">Descanso activo</div>
                <div className="font-serif text-[28px] leading-none">
                  {Math.floor(t.remaining / 60)}:{String(t.remaining % 60).padStart(2, '0')}
                </div>
              </div>
            </div>
            <div className="flex gap-1.5 mt-2.5">
              <button onClick={() => startTimer(restPreset)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-acc-green)]/10 text-[var(--color-acc-green)] border border-[var(--color-acc-green)]/20 font-sans cursor-pointer">↺ Reset</button>
              <button onClick={stopTimer} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/[0.1] text-[var(--color-red)] border border-red-500/[0.15] font-sans cursor-pointer">✕ Parar</button>
            </div>
          </div>
        )}

        {!activeSession ? (
          <div style={{ marginBottom: 12 }}>
            {/* Weekly program active — show today's session */}
            {(() => {
              const wp = useFisicoStore.getState().weeklyProgram
              if (!wp) return null
              const lib = ROUTINES.find(r => r.id === wp.routineId)

              // Handle custom-weekly: map day index to user's own routines
              if (!lib && wp.routineId === 'custom-weekly') {
                const today = new Date().getDay()
                const userRoutines = useFisicoStore.getState().routines
                const idx = wp.dayMapping[today]
                if (idx !== undefined && userRoutines[idx]) {
                  const r = userRoutines[idx]
                  return (
                    <div style={{ background: 'linear-gradient(145deg, var(--color-s1), color-mix(in srgb, var(--color-acc-orange) 10%, var(--color-s1)))', border: '1px solid color-mix(in srgb, var(--color-acc-orange) 25%, var(--color-border))', borderRadius: 16, padding: 16, marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div><div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-acc-orange)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Programa semanal · Hoy</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>{r.name}</div></div>
                        <button onClick={() => { useFisicoStore.getState().setWeeklyProgram(null); toast.show('Programa desactivado') }} style={{ background: 'none', border: 'none', color: 'var(--color-dim)', cursor: 'pointer', fontSize: 12 }}>✕</button>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-sub)', marginBottom: 10 }}>{r.exercises.map((e: { name: string }) => e.name).join(' · ')}</div>
                      <button onClick={() => startSession(r.name, r.exercises.map((e: { name: string; group: string; color: string; sets: number }) => ({ name: e.name, group: e.group, color: e.color, sets: e.sets })))}
                        style={{ width: '100%', padding: 12, borderRadius: 10, background: 'var(--color-acc-orange)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>▶ Empezar sesión de hoy</button>
                    </div>
                  )
                }
                return null
              }
              if (!lib) return null
              const today = new Date().getDay()
              const sessionIdx = wp.dayMapping[today]
              if (sessionIdx === undefined) return null
              const session = lib.sesiones[sessionIdx]
              if (!session) return null
              return (
                <div style={{ background: 'linear-gradient(145deg, var(--color-s1), color-mix(in srgb, var(--color-acc-orange) 10%, var(--color-s1)))', border: '1px solid color-mix(in srgb, var(--color-acc-orange) 25%, var(--color-border))', borderRadius: 16, padding: 16, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-acc-orange)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Programa activo · Hoy</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>{lib.nombre} — {session.nombre}</div>
                    </div>
                    <button onClick={() => {
                      useFisicoStore.getState().setWeeklyProgram(null)
                      toast.show('Programa desactivado')
                    }} style={{ background: 'none', border: 'none', color: 'var(--color-dim)', cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-sub)', marginBottom: 10 }}>
                    {session.ejercicios.map(e => e.nombre).join(' · ')}
                  </div>
                  <button onClick={() => {
                    startSession(`${lib.nombre} - ${session.nombre}`, session.ejercicios.map(e => ({
                      name: e.nombre, group: e.grupo_muscular, color: EXERCISE_COLORS[e.grupo_muscular] || '#e07a5f', sets: e.series, restSeconds: e.descanso_seg
                    })))
                  }}
                    style={{ width: '100%', padding: 12, borderRadius: 10, background: 'var(--color-acc-orange)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>
                    Empezar sesión de hoy
                  </button>
                </div>
              )
            })()}

            <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>Iniciar sesión</div>

              {/* Quick start from favorites/recent */}
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-sub)', marginBottom: 8 }}>Mis rutinas</div>
              {routines.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--color-dim)', marginBottom: 10 }}>No tienes rutinas propias todavía.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                  {routines.slice(0, 4).map(r => (
                    <button key={r.id} onClick={() => startSession(r.name, r.exercises.map(e => ({ name: e.name, group: e.group, color: e.color, sets: e.sets })))}
                      style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 10, background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{r.name}</span>
                      <span style={{ fontSize: 10, color: 'var(--color-dim)', fontWeight: 500 }}>{r.exercises.length} ejercicios</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Library routines quick pick */}
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-sub)', marginBottom: 8 }}>Biblioteca</div>
              <select
                value={selRoutine}
                onChange={e => setSelRoutine(e.target.value)}
                className="w-full bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3.5 py-2.5 text-sm font-sans mb-2 outline-none cursor-pointer"
              >
                <option value="">— Elige de la biblioteca —</option>
                {ROUTINES.map(r => <option key={r.id} value={r.id}>{r.nombre} ({r.dias_semana}d, {getNivelLabel(r.nivel)})</option>)}
              </select>
              {selRoutine && (() => {
                const r = ROUTINES.find(r => r.id === selRoutine)
                if (!r) return null
                return (
                  <div style={{ background: 'var(--color-s2)', borderRadius: 10, padding: 10, marginBottom: 8, fontSize: 11, color: 'var(--color-sub)' }}>
                    <div style={{ marginBottom: 4 }}>{getObjLabel(r.objetivo)} · {getLugarLabel(r.lugar)} · {r.duracion_sesion_min}min · {r.sesiones.length > 0 ? r.sesiones.length + ' sesiones' : r.ejercicios.length + ' ejercicios'}</div>
                    {r.sesiones.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 6 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 2 }}>Sesiones del programa:</div>
                        {r.sesiones.map((s, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderRadius: 6, background: 'var(--color-s1)' }}>
                            <span style={{ fontWeight: 600 }}>{s.nombre}</span>
                            <span style={{ color: 'var(--color-dim)' }}>{s.ejercicios.length} ejercicios</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {r.ejercicios.slice(0, 4).map(e => <span key={e.nombre} style={{ padding: '2px 6px', borderRadius: 4, background: 'var(--color-s1)', fontSize: 10 }}>{e.nombre}</span>)}
                        {r.ejercicios.length > 4 && <span style={{ color: 'var(--color-dim)', fontSize: 10 }}>+{r.ejercicios.length - 4} más</span>}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Session selector for multi-session routines */}
              {selRoutine && (() => {
                const r = ROUTINES.find(r => r.id === selRoutine)
                if (!r || r.sesiones.length === 0) return null
                return (
                  <select id="session-select" className="inp" style={{ marginBottom: 8 }}>
                    {r.sesiones.map((s, i) => <option key={i} value={i}>{s.nombre} ({s.ejercicios.length} ejercicios)</option>)}
                  </select>
                )
              })()}

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => {
                  const rtn = routines.find(r => r.id === +selRoutine)
                  const lib = ROUTINES.find(r => r.id === selRoutine)
                  if (rtn) startSession(rtn.name, rtn.exercises.map(e => ({ name: e.name, group: e.group, color: e.color, sets: e.sets })))
                  else if (lib) {
                    // Get selected session or default to first
                    const sel = document.getElementById('session-select') as HTMLSelectElement
                    const sessionIdx = sel ? parseInt(sel.value) : 0
                    const session = lib.sesiones.length > 0 ? lib.sesiones[sessionIdx] : null
                    const exs = session ? session.ejercicios : lib.ejercicios
                    const name = session ? `${lib.nombre} - ${session.nombre}` : lib.nombre
                    startSession(name, exs.map(e => ({ name: e.nombre, group: e.grupo_muscular, color: EXERCISE_COLORS[e.grupo_muscular] || '#e07a5f', sets: e.series, restSeconds: e.descanso_seg })))
                  }
                  else startSession('Sesión libre')
                }}
                  className="py-2.5 rounded-xl font-semibold text-sm font-sans cursor-pointer bg-[var(--color-acc-blue)] text-white border-[var(--color-acc-blue)] shadow-lg shadow-[var(--color-acc-blue)]/25">
                  Empezar
                </button>
                <button onClick={() => { const last = sessions[0]; startSession(last?.name || 'Sesión libre', last?.exercises.map(e => ({ name: e.name, group: e.group, color: e.color, sets: e.sets.length }))) }}
                  className="py-2.5 rounded-xl font-semibold text-sm font-sans cursor-pointer bg-[var(--color-s2)] text-[var(--color-sub)] border border-[var(--color-border)]">
                  Repetir última
                </button>
              </div>
            </div>

            {/* Quick stats before starting */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Este mes</div>
                <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 24, color: 'var(--color-acc-orange)', lineHeight: 1 }}>
                  {sessions.filter(s => s.date.startsWith(new Date().toISOString().slice(0, 7))).length}
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-dim)', marginTop: 2 }}>sesiones</div>
              </div>
              <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Última sesión</div>
                <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 24, color: 'var(--color-acc-blue)', lineHeight: 1 }}>
                  {sessions[0] ? sessions[0].date.slice(8) + '/' + sessions[0].date.slice(5, 7) : '—'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-dim)', marginTop: 2 }}>{sessions[0]?.name || 'Sin datos'}</div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeSession.name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 2 }}>
                  {activeSession.exercises.length} ejercicios · {unit.toUpperCase()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => { setWakeLock(!wakeLock); toast.show(wakeLock ? 'Pantalla normal' : '✓ Pantalla siempre activa') }}
                  title="Mantener pantalla activa"
                  style={{ padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid', background: wakeLock ? 'color-mix(in srgb, var(--color-acc-green) 12%, transparent)' : 'var(--color-s2)', color: wakeLock ? 'var(--color-acc-green)' : 'var(--color-dim)', borderColor: wakeLock ? 'color-mix(in srgb, var(--color-acc-green) 22%, transparent)' : 'var(--color-border)' }}>
                  {wakeLock ? 'Activa' : 'Pantalla'}
                </button>
                <button onClick={() => {
                  const prs = finishSession()
                  if (prs.length) toast.show(`${prs.length} récord${prs.length > 1 ? 's' : ''} batido${prs.length > 1 ? 's' : ''}`)
                  // Ofrece compartir el entreno recién terminado (queda en sessions[0])
                  const done = useFisicoStore.getState().sessions[0]
                  if (done) setSharePost(sessionToPost(done, unit))
                }}
                  style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: 'none', background: 'var(--color-acc-green)', color: '#fff' }}>
                  Finalizar
                </button>
              </div>
            </div>

            {activeSession.exercises.map((ex, ei) => {
              const lastData = getLastExerciseData(ex.name)
              const doneSets = ex.sets.filter(s => s.done).length
              return (
                <div key={ei} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden', marginBottom: 10 }}>
                  {/* Exercise header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: ex.color }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{ex.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--color-dim)', marginTop: 1 }}>{ex.group}{lastData ? ` · Última: ${lastData.weight}${unit} x ${lastData.reps}` : ''}</div>
                    </div>
                    {doneSets === ex.sets.length && ex.sets.length > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-acc-green)' }}>✓</span>}
                    <button onClick={() => { const ses = useFisicoStore.getState().activeSession; if (ses) useFisicoStore.setState({ activeSession: { ...ses, exercises: ses.exercises.filter((_, i) => i !== ei) } }) }}
                      style={{ background: 'none', border: 'none', color: 'var(--color-dim)', cursor: 'pointer', fontSize: 14 }}>✕</button>
                  </div>

                  {/* Set type buttons */}
                  <div style={{ display: 'flex', gap: 4, padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    {(['warmup','normal','dropset','failure'] as const).map(t => (
                      <button key={t} onClick={() => addSetToExercise(ei, lastData?.weight || 0, lastData?.reps || 10)}
                        style={{
                          fontSize: 10, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer',
                          padding: '3px 8px', borderRadius: 6, border: '1px solid var(--color-border)',
                          background: 'var(--color-s2)', color: 'var(--color-dim)',
                        }}>
                        {{warmup:'Calent.',normal:'Normal',dropset:'Drop',failure:'Al fallo'}[t]}
                      </button>
                    ))}
                    <div style={{ flex: 1 }} />
                    <button onClick={() => {
                      const w = lastData?.weight || ex.sets.find(s => s.weight)?.weight
                      if (!w) { toast.show('Introduce un peso primero'); return }
                      generateWarmupSets(ei, w)
                    }}
                      style={{ fontSize: 10, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', padding: '3px 8px', borderRadius: 6, border: '1px solid color-mix(in srgb, var(--color-acc-gold) 22%, transparent)', background: 'color-mix(in srgb, var(--color-acc-gold) 9%, transparent)', color: 'var(--color-acc-gold)' }}>
                      Auto calent.
                    </button>
                  </div>

                  {/* Sets */}
                  <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 40px 28px 28px', gap: 4, padding: '6px 14px', fontSize: 10, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ textAlign: 'left' }}>#</div><div>Peso</div><div>Reps</div><div>✓</div><div>Tipo</div><div></div>
                  </div>
                  {ex.sets.map((set, si) => (
                    <div key={si} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 40px 28px 28px', gap: 4, padding: '6px 14px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.02)', background: set.done ? 'rgba(82,183,136,0.04)' : set.type === 'warmup' ? 'rgba(201,168,76,0.03)' : 'transparent' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: set.type === 'warmup' ? 'var(--color-acc-gold)' : 'var(--color-dim)' }}>{set.setNumber}</div>
                      <input type="number" value={set.weight || ''} onChange={e => updateSet(ei, si, { weight: parseFloat(e.target.value) || 0 })}
                        style={{ width: '100%', background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 8, padding: '5px 4px', fontSize: 12, fontFamily: 'DM Sans,sans-serif', outline: 'none', textAlign: 'center' }}
                        placeholder={unit} />
                      <input type="number" value={set.reps || ''} onChange={e => updateSet(ei, si, { reps: parseInt(e.target.value) || 0 })}
                        style={{ width: '100%', background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 8, padding: '5px 4px', fontSize: 12, fontFamily: 'DM Sans,sans-serif', outline: 'none', textAlign: 'center' }}
                        placeholder="reps" />
                      <button onClick={() => { updateSet(ei, si, { done: !set.done }); if (!set.done && ex.restSeconds) startTimer(ex.restSeconds, ei) }}
                        style={{ width: 28, height: 28, borderRadius: 8, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, cursor: 'pointer', background: set.done ? '#166534' : 'transparent', border: `1.5px solid ${set.done ? 'var(--color-acc-green)' : 'var(--color-border2)'}`, color: set.done ? '#4ade80' : 'transparent' }}>
                        {set.done ? '✓' : ''}
                      </button>
                      <div style={{ fontSize: 10, fontWeight: 700, color: set.type === 'warmup' ? 'var(--color-acc-gold)' : set.type === 'dropset' ? 'var(--color-acc-orange)' : set.type === 'failure' ? 'var(--color-red)' : 'var(--color-dim)', textAlign: 'center' }}>
                        {set.type === 'warmup' ? 'W' : set.type === 'dropset' ? 'D' : set.type === 'failure' ? 'F' : '—'}
                      </div>
                      <button onClick={() => removeSet(ei, si)} style={{ background: 'none', border: 'none', color: 'var(--color-dim)', cursor: 'pointer', fontSize: 12, textAlign: 'center' }}>✕</button>
                    </div>
                  ))}

                  {/* Exercise footer: rest timer, superset, discos, notes */}
                  <div style={{ display: 'flex', gap: 8, padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.03)', background: 'var(--color-s2)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Descanso</span>
                      <select value={ex.restSeconds || 90} onChange={e => updateExercise(ei, { restSeconds: parseInt(e.target.value) })}
                        style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', color: 'var(--color-sub)', borderRadius: 6, padding: '3px 6px', fontSize: 10, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>
                        {[30, 60, 90, 120, 180].map(s => <option key={s} value={s}>{s}s</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Superserie</span>
                      <select value={ex.supersetWith ?? -1} onChange={e => {
                        const v = parseInt(e.target.value)
                        updateExercise(ei, { supersetWith: v >= 0 ? v : undefined })
                        if (v >= 0) toast.show('✓ Superserie emparejada')
                      }}
                        style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', color: 'var(--color-sub)', borderRadius: 6, padding: '3px 6px', fontSize: 10, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>
                        <option value={-1}>No</option>
                        {activeSession.exercises.map((e2, i2) => i2 !== ei ? (
                          <option key={i2} value={i2}>{e2.name.slice(0, 15)}</option>
                        ) : null)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button onClick={() => {
                        const w = ex.sets.find(s => s.done)?.weight
                        if (!w) { toast.show('Completa una serie primero'); return }
                        const unit2 = useFisicoStore.getState().unit === 'kg' ? [25,20,15,10,5,2.5,1.25] : [45,35,25,10,5,2.5]
                        const barWeight = useFisicoStore.getState().unit === 'kg' ? 20 : 45
                        const perSide = (w - barWeight) / 2
                        if (!Number.isFinite(perSide) || perSide > 500) { toast.show('Peso fuera de rango'); return }
                        let remaining = perSide; const result: number[] = []
                        for (const p of unit2) { while (remaining >= p) { result.push(p); remaining = Math.round((remaining - p) * 100) / 100 } }
                        toast.show(`Barra: ${perSide.toFixed(1)}${unit}/lado → ${result.map(p => p + unit).join(' + ')}`)
                      }}
                        style={{ fontSize: 9, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(91,138,240,0.2)', background: 'rgba(91,138,240,0.08)', color: 'var(--color-blue)' }}>
                        Discos
                      </button>
                    </div>
                    <input className="inp" value={ex.notes || ''} onChange={e => updateExercise(ei, { notes: e.target.value })} placeholder="Nota..." style={{ flex: 1, marginBottom: 0, padding: '4px 8px', fontSize: 11 }} />
                  </div>
                </div>
              )
            })}

            <button onClick={() => setShowExPicker(true)} style={{ width: '100%', padding: 14, borderRadius: 14, background: 'rgba(224,122,95,0.08)', color: 'var(--color-acc-orange)', border: '1px dashed rgba(224,122,95,0.25)', fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', marginBottom: 8 }}>
              + Añadir ejercicio
            </button>

            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas de la sesión..."
              style={{ width: '100%', background: 'var(--color-s1)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 12, padding: 12, fontSize: 13, fontFamily: 'DM Sans,sans-serif', resize: 'none', height: 64, outline: 'none', marginBottom: 8 }} />

            <button onClick={cancelSession} style={{ width: '100%', padding: 12, borderRadius: 12, background: 'rgba(224,95,95,0.08)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.15)', fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>
              Cancelar sesión
            </button>
          </div>
        )}

        {/* Exercise picker modal (simplified) */}
        {showExPicker && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowExPicker(false) }}>
            <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-t-3xl w-full max-w-lg max-h-[70dvh] overflow-y-auto pb-8 animate-slideUp">
              <div className="flex justify-center pt-3 pb-1"><div className="w-9 h-1 bg-[var(--color-border2)] rounded-full" /></div>
              <div className="px-4 pt-2 pb-3 font-serif text-xl text-[var(--color-text)]">Añadir ejercicio</div>
              <div style={{ padding: '0 16px 8px' }}>
                <input className="inp" placeholder="🔍 Buscar ejercicio..." onChange={(e) => {
                  const val = e.target.value.toLowerCase()
                  const items = document.querySelectorAll('[data-ex-name]')
                  items.forEach(el => {
                    const name = (el as HTMLElement).dataset.exName?.toLowerCase() || ''
                    ;(el as HTMLElement).style.display = val ? (name.includes(val) ? '' : 'none') : ''
                  })
                }} />
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                  <button onClick={() => setEquipFilter('')} style={{ padding: '4px 10px', borderRadius: 99, fontSize: 10, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid', background: !equipFilter ? 'rgba(224,122,95,0.12)' : 'var(--color-s2)', color: !equipFilter ? 'var(--color-acc-orange)' : 'var(--color-dim)', borderColor: !equipFilter ? 'rgba(224,122,95,0.3)' : 'var(--color-border)' }}>Todo</button>
                  {EQUIPMENT_TYPES.map(eq => (
                    <button key={eq} onClick={() => setEquipFilter(eq)} style={{ padding: '4px 10px', borderRadius: 99, fontSize: 10, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid', background: equipFilter === eq ? 'rgba(224,122,95,0.12)' : 'var(--color-s2)', color: equipFilter === eq ? 'var(--color-acc-orange)' : 'var(--color-dim)', borderColor: equipFilter === eq ? 'rgba(224,122,95,0.3)' : 'var(--color-border)' }}>{EQUIPMENT_LABELS[eq]}</button>
                  ))}
                </div>
              </div>
              {EXERCISE_GROUPS.map(group => {
                const filtered = allExercises.filter(e => e.group === group && (!equipFilter || e.equipment === equipFilter))
                if (!filtered.length) return null
                return (
                  <div key={group}>
                    <div style={{ padding: '10px 16px 4px', fontSize: 10, fontWeight: 700, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.8px', background: 'var(--color-s1)', position: 'sticky', top: 0, zIndex: 1 }}>{group}</div>
                    {filtered.map(ex => (
                      <div key={ex.name} onClick={() => { addExerciseToSession({ name: ex.name, group: ex.group, color: EXERCISE_COLORS[ex.group] || 'var(--color-acc-orange)', sets: 3 }); setShowExPicker(false) }}
                        data-ex-name={ex.name}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'background 0.12s' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: EXERCISE_COLORS[ex.group] || 'var(--color-acc-orange)' }} />
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{ex.name}</span>
                        {ex.equipment && <span style={{ fontSize: 10, color: 'var(--color-dim)', background: 'var(--color-s2)', borderRadius: 4, padding: '1px 6px' }}>{EQUIPMENT_LABELS[ex.equipment]}</span>}
                      </div>
                    ))}
                  </div>
                )
              })}
              <div className="px-4 pt-3">
                <button onClick={() => setShowExPicker(false)} className="w-full py-3 rounded-xl bg-[var(--color-s2)] text-[var(--color-sub)] border border-[var(--color-border)] text-sm font-semibold font-sans cursor-pointer">Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ── HISTORY ── */
  if (sub === 'history') {
    return (
      <div className="animate-tab">
        {subBar}
        <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2.5">Sesiones recientes</div>
        {sessions.length === 0 ? (
          <div className="text-center py-12 text-[13px] text-[var(--color-dim)]">Sin sesiones registradas.</div>
        ) : (
          sessions.map((s, i) => (
            <div key={i} className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl mb-2 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="text-center bg-[var(--color-acc-orange)]/10 border border-[var(--color-acc-orange)]/20 rounded-xl px-3 py-2 flex-shrink-0">
                  <div className="font-serif text-[22px] text-[var(--color-acc-orange)] leading-none">{s.date.slice(8)}</div>
                  <div className="text-[10px] font-bold text-[var(--color-acc-orange)] uppercase tracking-[1px]">{['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][new Date(s.date + 'T12:00').getMonth()]}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-[var(--color-text)]">{s.name}</div>
                  <div className="text-xs text-[var(--color-sub)] mt-1">{s.duration} min · {s.exercises.length} ejercicios</div>
                </div>
                <div className="font-serif text-[22px] text-[var(--color-acc-orange)] italic">{Math.round(s.totalKg)} {unit}</div>
                <button title="Compartir en comunidad" onClick={() => setSharePost(sessionToPost(s, unit))} className="w-7 h-7 rounded-lg bg-[var(--color-acc-purple)]/[0.1] text-[var(--color-acc-purple)] border border-[var(--color-acc-purple)]/20 text-[12px] flex items-center justify-center cursor-pointer">↗</button>
                <button onClick={() => deleteSession(i)} className="w-7 h-7 rounded-lg bg-red-500/[0.08] text-[var(--color-red)] border border-red-500/[0.15] text-[11px] font-bold flex items-center justify-center cursor-pointer">✕</button>
              </div>
              <div className="px-4 pb-3">
                <NotesFor entityType="workout" entityId={String(s.id ?? s.date)} defaultTitle={`Notas · ${s.name}`} />
              </div>
            </div>
          ))
        )}
      </div>
    )
  }

  /* ── ROUTINES ── */
  if (sub === 'routines') {
    return (
      <div className="animate-tab">
        {subBar}

        {/* Programas (carpetas de rutinas) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px]">Programas</div>
          <button onClick={() => setShowProgForm(!showProgForm)} style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-acc-orange)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>{showProgForm ? 'Cerrar' : '+ Nuevo programa'}</button>
        </div>
        {showProgForm && (
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <Input value={progName} onChange={setProgName} placeholder="Nombre del programa (ej: PPL, Fuerza 5x5)" className="mb-2" />
            <div style={{ fontSize: 11, color: 'var(--color-dim)', marginBottom: 6 }}>Rutinas incluidas</div>
            {routines.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--color-dim)', marginBottom: 8 }}>Crea rutinas primero para agruparlas.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {routines.map(r => {
                  const on = progRoutineSel.includes(r.id)
                  return (
                    <button key={r.id} onClick={() => setProgRoutineSel(prev => on ? prev.filter(x => x !== r.id) : [...prev, r.id])}
                      style={{ padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid', background: on ? 'color-mix(in srgb, var(--color-acc-orange) 14%, transparent)' : 'var(--color-s2)', color: on ? 'var(--color-acc-orange)' : 'var(--color-sub)', borderColor: on ? 'color-mix(in srgb, var(--color-acc-orange) 30%, transparent)' : 'var(--color-border)' }}>
                      {on ? '✓ ' : ''}{r.name}
                    </button>
                  )
                })}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {['#dd7d55', '#6d76f0', '#48b586', '#c8a24e', '#9a82e8'].map(c => (
                <button key={c} onClick={() => setProgColor(c)} style={{ width: 24, height: 24, borderRadius: '50%', border: progColor === c ? '2.5px solid var(--color-text)' : '2.5px solid transparent', background: c, cursor: 'pointer' }} />
              ))}
            </div>
            <button onClick={() => {
              if (!progName.trim()) { toast.show('Ponle nombre al programa'); return }
              addProgram({ id: Date.now(), name: progName.trim(), description: '', routines: progRoutineSel, color: progColor })
              setProgName(''); setProgRoutineSel([]); setShowProgForm(false); toast.show('✓ Programa creado')
            }} className="btn-primary" style={{ background: 'var(--color-acc-orange)' }}>Crear programa</button>
          </div>
        )}
        {programs.map(pr => (
          <div key={pr.id} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderLeft: `3px solid ${pr.color}`, borderRadius: 14, padding: '12px 14px', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{pr.name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 2 }}>
                  {pr.routines.map(rid => routines.find(r => r.id === rid)?.name).filter(Boolean).join(' · ') || 'Sin rutinas'}
                </div>
              </div>
              <button onClick={() => { removeProgram(pr.id); toast.show('Programa eliminado') }} style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(224,95,95,0.08)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.15)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>✕</button>
            </div>
          </div>
        ))}

        {/* Routine database library */}
        <div style={{ marginTop: 12 }}>
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 14, marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>📚 Biblioteca ({ROUTINES.length} rutinas)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
              <select className="inp" value={dbObj} onChange={e => setDbObj(e.target.value)} style={{ marginBottom: 0, fontSize: 11 }}>
                <option value="">Objetivo</option>
                {ROUTINE_OBJECTIVES.map(o => <option key={o} value={o}>{getObjLabel(o)}</option>)}
              </select>
              <select className="inp" value={dbNivel} onChange={e => setDbNivel(e.target.value)} style={{ marginBottom: 0, fontSize: 11 }}>
                <option value="">Nivel</option>
                {ROUTINE_LEVELS.map(n => <option key={n} value={n}>{getNivelLabel(n)}</option>)}
              </select>
              <select className="inp" value={dbLugar} onChange={e => setDbLugar(e.target.value)} style={{ marginBottom: 0, fontSize: 11 }}>
                <option value="">Lugar</option>
                {ROUTINE_PLACES.map(l => <option key={l} value={l}>{getLugarLabel(l)}</option>)}
              </select>
            </div>
            <input className="inp" value={dbSearch2} onChange={e => setDbSearch2(e.target.value)} placeholder="🔍 Buscar rutina..." style={{ marginBottom: 0 }} />
          </div>
          {filterRoutines({ objetivo: dbObj || undefined, nivel: dbNivel || undefined, lugar: dbLugar || undefined, search: dbSearch2 || undefined }).slice(0, 10).map(r => (
            <div key={r.id} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{r.nombre}</div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 99, background: 'rgba(224,122,95,0.1)', color: 'var(--color-acc-orange)' }}>{getObjLabel(r.objetivo)}</span>
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 99, background: 'var(--color-s2)', color: 'var(--color-dim)' }}>{getNivelLabel(r.nivel)}</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-sub)', marginBottom: 8 }}>
                  {getLugarLabel(r.lugar)} · {r.dias_semana}d/sem · {r.duracion_sesion_min}min · {r.duracion_programa_semanas}semanas
                  {r.sesiones.length > 1 && <span style={{ marginLeft: 6, fontWeight: 600, color: 'var(--color-acc-orange)' }}>· {r.sesiones.length} sesiones</span>}
                </div>
                {r.sesiones.length > 1 ? (
                  <div style={{ marginBottom: 8 }}>
                    {r.sesiones.map((s, i) => (
                      <div key={i} style={{ fontSize: 11, color: 'var(--color-dim)', marginBottom: 2, display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-sub)', minWidth: 48, flexShrink: 0 }}>{s.nombre}:</span>
                        <span>{s.ejercicios.slice(0, 3).map(e => e.nombre).join(' · ')}{s.ejercicios.length > 3 ? ` +${s.ejercicios.length - 3} más` : ''}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--color-dim)', marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {r.ejercicios.slice(0, 5).map(e => <span key={e.nombre} style={{ padding: '2px 6px', borderRadius: 4, background: 'var(--color-s2)' }}>{e.nombre} {e.series}x{e.repeticiones}</span>)}
                    {r.ejercicios.length > 5 && <span style={{ color: 'var(--color-dim)', fontSize: 10 }}>+{r.ejercicios.length - 5} más</span>}
                  </div>
                )}
                <button onClick={() => { const session = r.sesiones.length > 0 ? r.sesiones[0] : null; const exs = session ? session.ejercicios : r.ejercicios; const name = session ? `${r.nombre} - ${session.nombre}` : r.nombre; startSession(name, exs.map(e => ({ name: e.nombre, group: e.grupo_muscular, color: EXERCISE_COLORS[e.grupo_muscular] || '#e07a5f', sets: e.series, restSeconds: e.descanso_seg }))) }} style={{ width: '100%', padding: 10, borderRadius: 10, background: 'var(--color-acc-orange)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', marginBottom: 4 }}>Empezar esta rutina</button>
                {r.sesiones.length > 1 && (
                  <button onClick={() => { setWeeklyModal(r.id) }}
                    style={{ width: '100%', padding: 10, borderRadius: 10, background: 'color-mix(in srgb, var(--color-acc-orange) 12%, transparent)', color: 'var(--color-acc-orange)', border: '1px solid color-mix(in srgb, var(--color-acc-orange) 25%, transparent)', fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>
                    📅 Programar semanal
                  </button>
                )}
              </div>
            </div>
          ))}
          <div style={{ fontSize: 10, color: 'var(--color-dim)', textAlign: 'center', marginBottom: 12 }}>
            {filterRoutines({ objetivo: dbObj || undefined, nivel: dbNivel || undefined, lugar: dbLugar || undefined, search: dbSearch2 || undefined }).length} de {ROUTINES.length} rutinas
          </div>
        </div>

        <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2.5 mt-4">Mis rutinas</div>
        {routines.map(r => (
          <div key={r.id} className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl overflow-hidden mb-2">
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--color-border)]">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-acc-orange)]/10 border border-[var(--color-acc-orange)]/20 flex items-center justify-center text-lg">🏋️</div>
              <div className="flex-1">
                <div className="text-[15px] font-semibold text-[var(--color-text)]">{r.name}</div>
                <div className="text-xs text-[var(--color-sub)] mt-0.5">{r.exercises.length} ejercicios</div>
              </div>
              <button onClick={() => startSession(r.name, r.exercises)} className="px-4 py-2 rounded-xl bg-[var(--color-acc-orange)] text-white text-[13px] font-semibold font-sans cursor-pointer shadow-lg shadow-[var(--color-acc-orange)]/25">▶</button>
              <button title="Compartir en comunidad" onClick={() => setSharePost(routineToPost(r))} className="w-7 h-7 rounded-lg bg-[var(--color-acc-purple)]/[0.1] text-[var(--color-acc-purple)] border border-[var(--color-acc-purple)]/20 text-[12px] flex items-center justify-center cursor-pointer">↗</button>
              <button onClick={() => deleteRoutine(r.id)} className="w-7 h-7 rounded-lg bg-red-500/[0.08] text-[var(--color-red)] border border-red-500/[0.15] text-[11px] font-bold flex items-center justify-center cursor-pointer">✕</button>
            </div>
          </div>
        ))}
        {routines.length === 0 && <div className="text-center py-8 text-[13px] text-[var(--color-dim)]">Sin rutinas. Crea la primera.</div>}

        <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mt-2">
          <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2.5">Crear rutina</div>
          <Input value={rtnName} onChange={setRtnName} placeholder="Nombre (ej: Pecho & Tríceps)" className="mb-2" />
          <div className="mb-2">
            {builderExs.map((ex, i) => (
              <div key={i} className="flex items-center gap-2.5 py-2.5 border-b border-white/[0.04] last:border-b-0">
                <div className="w-2 h-2 rounded-full" style={{ background: ex.color }} />
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-[var(--color-text)]">{ex.name}</div>
                  <div className="text-[11px] text-[var(--color-dim)] mt-0.5">{ex.sets} series · {ex.group}</div>
                </div>
                <button onClick={() => setBuilderExs(prev => prev.filter((_, ii) => ii !== i))} className="text-[var(--color-dim)] text-xs">✕</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mb-2.5">
            <select
              onChange={e => {
                const ex = allExercises.find(x => x.name === e.target.value)
                if (ex) setBuilderExs(prev => [...prev, { name: ex.name, group: ex.group, color: EXERCISE_COLORS[ex.group] || 'var(--color-acc-orange)', sets: 3 }])
              }}
              className="flex-1 bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3 py-2.5 text-sm font-sans outline-none cursor-pointer"
            >
              <option value="">+ Añadir ejercicio...</option>
              {allExercises.map(e => <option key={e.name} value={e.name}>{e.name}</option>)}
            </select>
          </div>
          <button
            onClick={() => { if (rtnName.trim() && builderExs.length) { saveRoutine(rtnName.trim(), builderExs); setRtnName(''); setBuilderExs([]) } }}
            className="w-full py-2.5 rounded-xl bg-[var(--color-acc-orange)] text-white text-sm font-semibold font-sans cursor-pointer shadow-lg shadow-[var(--color-acc-orange)]/25"
          >Guardar rutina</button>
        </div>
      </div>
    )
  }

  /* ── LIBRARY ── */
  if (sub === 'library') {
    return (
      <div className="animate-tab">
        {subBar}

        {/* Añadir ejercicio propio: plegable, arriba del todo para encontrarlo fácil */}
        <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl overflow-hidden mb-3">
          <button onClick={() => setShowAddEx(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 cursor-pointer bg-transparent border-none">
            <span className="text-sm font-semibold text-[var(--color-acc-orange)]">+ Añadir ejercicio propio</span>
            <span className="text-[var(--color-dim)] text-xs">{showAddEx ? '▲' : '▼'}</span>
          </button>
          {showAddEx && (
            <div className="px-4 pb-4 pt-1 border-t border-[var(--color-border)]">
              <Input value={cexName} onChange={setCexName} placeholder="Nombre del ejercicio" className="mb-2" />
              <div className="grid grid-cols-2 gap-2 mb-2.5">
                <select value={cexGroup} onChange={e => setCexGroup(e.target.value)} className="bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3 py-2.5 text-sm font-sans outline-none cursor-pointer">
                  {EXERCISE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select value={cexEquip} onChange={e => setCexEquip(e.target.value)} className="bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3 py-2.5 text-sm font-sans outline-none cursor-pointer">
                  <option value="">Material…</option>
                  {EQUIPMENT_TYPES.map(eq => <option key={eq} value={eq}>{EQUIPMENT_LABELS[eq]}</option>)}
                </select>
              </div>
              <button onClick={() => { if (cexName.trim()) { addCustomExercise({ name: cexName.trim(), group: cexGroup, equipment: cexEquip || undefined }); setCexName(''); setCexEquip(''); toast.show('✓ Ejercicio añadido'); setShowAddEx(false) } }}
                className="w-full py-2.5 rounded-xl bg-[var(--color-acc-orange)] text-white text-sm font-semibold font-sans cursor-pointer shadow-lg shadow-[var(--color-acc-orange)]/25">Guardar ejercicio</button>
            </div>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto mb-3.5 pb-0.5">
          <button onClick={() => setLibGroup('')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border cursor-pointer whitespace-nowrap flex-shrink-0 ${libGroup === '' ? 'bg-[var(--color-acc-orange)]/[0.14] border-[var(--color-acc-orange)]/40 text-[var(--color-acc-orange)]' : 'bg-[var(--color-s1)] border-[var(--color-border)] text-[var(--color-sub)]'}`}>Todos</button>
          {EXERCISE_GROUPS.map(g => (
            <button key={g} onClick={() => setLibGroup(g === libGroup ? '' : g)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border cursor-pointer whitespace-nowrap flex-shrink-0 ${libGroup === g ? 'bg-[var(--color-acc-orange)]/[0.14] border-[var(--color-acc-orange)]/40 text-[var(--color-acc-orange)]' : 'bg-[var(--color-s1)] border-[var(--color-border)] text-[var(--color-sub)]'}`}>{g}</button>
          ))}
        </div>
        {(() => {
          const libExercises = allExercises.filter(ex => !libGroup || ex.group === libGroup)
          return (
        <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
          {libExercises.length === 0 ? (
            <div className="text-center py-8 text-[13px] text-[var(--color-dim)]">Sin ejercicios de {libGroup}.</div>
          ) : libExercises.map(ex => (
            <div key={ex.name} className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] last:border-b-0">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: EXERCISE_COLORS[ex.group] || 'var(--color-acc-orange)' }} />
              <div className="flex-1">
                <div className="text-sm font-medium text-[var(--color-text)]">{ex.name}</div>
                <div className="text-[11px] text-[var(--color-dim)] mt-0.5">{ex.group}</div>
              </div>
            </div>
          ))}
        </div>
          )
        })()}
      </div>
    )
  }

  /* ── PROGRESS ── */
  if (sub === 'progress') {
    const { prs } = useFisicoStore.getState()

    if (sessions.length === 0) {
      return (
        <div className="animate-tab">
          {subBar}
          <div className="text-center py-16 text-[var(--color-dim)] text-sm">
            <div className="text-4xl mb-3">📊</div>
            <div className="font-semibold text-[var(--color-sub)] mb-2">Sin datos todavía</div>
            <div>Registra sesiones de entrenamiento para ver gráficos.</div>
        </div>
        {weeklyModal && <WeeklyModal routineId={weeklyModal} onClose={() => setWeeklyModal(null)} />}
      </div>
  )
}

/* Weekly program modal */
function WeeklyModal({ routineId, onClose }: { routineId: string; onClose: () => void }) {
  const r = ROUTINES.find(r => r.id === routineId)
  const toast = useToast()
  const [wMap, setWMap] = useState<Record<number, number>>({})
  if (!r) return null
  const DOW = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 40px', maxHeight: '80dvh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, background: 'var(--color-border2)', borderRadius: 99, margin: '0 auto 16px' }} />
        <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 20, marginBottom: 4 }}>Programar semanal</div>
        <div style={{ fontSize: 13, color: 'var(--color-sub)', marginBottom: 16 }}>{r.nombre} · {r.sesiones.length} sesiones</div>
        {DOW.map((day, di) => (
          <div key={di} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', minWidth: 80 }}>{day}</span>
            <select className="inp" value={wMap[di] ?? -1} onChange={e => {
              const v = parseInt(e.target.value)
              setWMap(prev => v >= 0 ? { ...prev, [di]: v } : Object.fromEntries(Object.entries(prev).filter(([k]) => +k !== di)))
            }} style={{ flex: 1, marginBottom: 0 }}>
              <option value={-1}>— Descanso —</option>
              {r.sesiones.map((s, si) => <option key={si} value={si}>{s.nombre} ({s.ejercicios.length} ejercicios)</option>)}
            </select>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
          <button onClick={onClose} className="btn-ghost" style={{ width: '100%' }}>Cancelar</button>
          <button onClick={() => {
            if (Object.keys(wMap).length > 0) {
              useFisicoStore.getState().setWeeklyProgram({ routineId: r.id, dayMapping: wMap })
              toast.show('✓ Programa semanal activado')
            }
            onClose()
          }} className="btn-primary" style={{ background: 'var(--color-acc-orange)', width: 'auto' }}>Activar programa</button>
        </div>
      </div>
    </div>
  )
}

    const last12 = [...sessions].reverse().slice(-12)
    const labels = last12.map(s => {
      const d = new Date(s.date + 'T12:00')
      return d.getDate() + '/' + (d.getMonth() + 1)
    })

    const maxKg = Math.max(...last12.map(s => s.totalKg), 1)

    // Training calendar data (last 30 days)
    const calDays: { date: string; day: number; hasSession: boolean; isToday: boolean }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const ds = d.toISOString().slice(0, 10)
      calDays.push({
        date: ds,
        day: d.getDate(),
        hasSession: sessions.some(s => s.date === ds),
        isToday: i === 0,
      })
    }

    return (
      <div className="animate-tab">
        {subBar}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Sesiones totales</div>
            <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 28, color: 'var(--color-acc-orange)', lineHeight: 1 }}>{sessions.length}</div>
          </div>
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Kg totales</div>
            <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 28, color: 'var(--color-acc-blue)', lineHeight: 1 }}>{Math.round(sessions.reduce((s, x) => s + x.totalKg, 0))}</div>
          </div>
        </div>

        {/* Compartir resumen */}
        <button onClick={async () => {
          const text = shareSummary()
          const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> }
          if (nav.share) { try { await nav.share({ text }) } catch { /* cancelado */ } }
          else { try { await navigator.clipboard.writeText(text); toast.show('✓ Resumen copiado al portapapeles') } catch { toast.show('No se pudo copiar') } }
        }}
          style={{ width: '100%', padding: 12, borderRadius: 12, marginBottom: 12, border: '1px solid color-mix(in srgb, var(--color-acc-orange) 25%, transparent)', background: 'color-mix(in srgb, var(--color-acc-orange) 10%, transparent)', color: 'var(--color-acc-orange)', fontSize: 13, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>
          Compartir resumen de fuerza
        </button>

        {/* Progreso por ejercicio: peso máximo por sesión a lo largo del tiempo */}
        {(() => {
          const exNames = [...new Set(sessions.flatMap(s => s.exercises.map(e => e.name)))].sort()
          if (exNames.length === 0) return null
          const sel = progEx && exNames.includes(progEx) ? progEx : exNames[0]
          const points = [...sessions].reverse()
            .map(s => {
              const ex = s.exercises.find(e => e.name === sel)
              if (!ex) return null
              const maxW = Math.max(0, ...ex.sets.filter(st => st.done && st.type !== 'warmup').map(st => st.weight))
              return maxW > 0 ? { date: s.date, w: maxW } : null
            })
            .filter((x): x is { date: string; w: number } => x !== null)
          const W = 300, H = 80, PAD = 6
          const maxW = Math.max(...points.map(p => p.w), 1)
          const minW = Math.min(...points.map(p => p.w), maxW)
          const span = maxW - minW || 1
          const xy = points.map((p, i) => {
            const x = points.length === 1 ? W / 2 : PAD + i * (W - PAD * 2) / (points.length - 1)
            const y = H - PAD - (p.w - minW) / span * (H - PAD * 2)
            return { x, y, w: p.w }
          })
          const line = xy.map(p => `${p.x},${p.y}`).join(' ')
          const best = Math.max(...points.map(p => p.w), 0)
          return (
            <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-sub)', letterSpacing: '0.3px' }}>📈 Progreso por ejercicio</span>
                <select value={sel} onChange={e => setProgEx(e.target.value)}
                  style={{ background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 8, padding: '5px 8px', fontSize: 12, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', maxWidth: 180 }}>
                  {exNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              {points.length < 2 ? (
                <div style={{ fontSize: 12, color: 'var(--color-dim)', padding: '12px 0', textAlign: 'center' }}>
                  {points.length === 1 ? `Un registro (${points[0].w} ${unit}). Entrena más para ver la evolución.` : 'Sin registros con peso para este ejercicio.'}
                </div>
              ) : (
                <>
                  <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 90, display: 'block' }} preserveAspectRatio="none">
                    <polyline points={line} fill="none" stroke="var(--color-acc-orange)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    {xy.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="var(--color-acc-orange)" />)}
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-dim)', marginTop: 6 }}>
                    <span>Primer: {points[0].w} {unit}</span>
                    <span style={{ color: 'var(--color-acc-gold)', fontWeight: 700 }}>Máx: {best} {unit}</span>
                    <span>Último: {points[points.length - 1].w} {unit}</span>
                  </div>
                </>
              )}
            </div>
          )
        })()}

        {/* Análisis por músculo */}
        {(() => {
          const analysis = getMuscleAnalysis().filter(a => a.sets > 0).sort((a, b) => b.sets - a.sets)
          if (analysis.length === 0) return null
          const maxSets = Math.max(...analysis.map(a => a.sets), 1)
          return (
            <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-sub)', letterSpacing: '0.3px', marginBottom: 12 }}>Series por grupo muscular</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {analysis.map(a => (
                  <div key={a.group} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 74, flexShrink: 0, fontSize: 12, fontWeight: 500, color: 'var(--color-sub)' }}>{a.group}</span>
                    <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round(a.sets / maxSets * 100)}%`, background: a.color, borderRadius: 99, transition: 'width 0.5s' }} />
                    </div>
                    <span style={{ width: 28, flexShrink: 0, textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{a.sets}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-dim)', marginTop: 10 }}>Series completadas · histórico total</div>
            </div>
          )
        })()}

        {/* Training calendar */}
        <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-sub)', letterSpacing: '0.3px', marginBottom: 10 }}>Calendario de entrenamiento</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
            {['L','M','X','J','V','S','D'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 600, color: 'var(--color-dim)', padding: '2px 0' }}>{d}</div>)}
            {Array.from({ length: new Date(Date.now() - 29 * 86400000).getDay() === 0 ? 6 : (new Date(Date.now() - 29 * 86400000).getDay() - 1) }, (_, i) => (
              <div key={`e${i}`} style={{ aspectRatio: '1' }} />
            ))}
            {calDays.map((d, i) => (
              <div key={i} style={{
                aspectRatio: '1', borderRadius: 6,
                background: d.hasSession ? 'var(--color-acc-orange)44' : 'rgba(255,255,255,0.03)',
                border: d.isToday ? '1.5px solid rgba(255,255,255,0.3)' : d.hasSession ? '1px solid var(--color-acc-orange)33' : '1px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: d.isToday ? 700 : 500,
                color: d.hasSession ? 'var(--color-acc-orange)' : 'var(--color-dim)',
              }}>{d.day}</div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-sub)', letterSpacing: '0.3px', marginBottom: 10 }}>Volumen (kg totales)</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 }}>
            {last12.map((s, i) => {
              const h = Math.max(3, (s.totalKg / maxKg) * 76)
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ width: '100%', borderRadius: '3px 3px 0 0', height: h, background: 'var(--color-acc-orange)', transition: 'height 0.5s' }} title={`${s.date}: ${Math.round(s.totalKg)} kg`} />
                  <span style={{ fontSize: 8, color: 'var(--color-dim)' }}>{labels[i]}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* PRs */}
        {prs.length > 0 && (
          <>
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-sub)', letterSpacing: '0.3px', marginBottom: 10 }}>🏆 Records personales</div>
            {prs.map((pr, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < prs.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                <span style={{ fontSize: 18 }}>🏆</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{pr.exercise}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-dim)' }}>{pr.date}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 20, color: 'var(--color-acc-gold)' }}>{pr.weight} kg</div>
                  <div style={{ fontSize: 10, color: 'var(--color-dim)' }}>{pr.reps} reps</div>
                </div>
                <button title="Compartir en comunidad" onClick={() => setSharePost(prToPost(pr, unit))} style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: 'color-mix(in srgb, var(--color-acc-purple) 10%, transparent)', color: 'var(--color-acc-purple)', border: '1px solid color-mix(in srgb, var(--color-acc-purple) 20%, transparent)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↗</button>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-sub)', letterSpacing: '0.3px', marginBottom: 10 }}>🧮 Calculadora 1RM</div>
            <div style={{ fontSize: 11, color: 'var(--color-sub)', marginBottom: 8 }}>Estima tu repetición máxima basada en un set</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <input className="inp" id="1rm-weight" type="number" placeholder="Peso (kg)" style={{ marginBottom: 0 }} />
              <input className="inp" id="1rm-reps" type="number" placeholder="Reps" style={{ marginBottom: 0 }} />
            </div>
            <button onClick={() => {
              const w = parseFloat((document.getElementById('1rm-weight') as HTMLInputElement)?.value || '0')
              const r = parseInt((document.getElementById('1rm-reps') as HTMLInputElement)?.value || '0')
              if (!w || !r) { toast.show('Introduce peso y reps'); return }
              const rm = Math.round(w * (1 + r / 30))
              toast.show(`🏋️ 1RM estimado: ${rm} kg`)
            }}
              className="btn-ghost" style={{ border: '1px solid rgba(224,122,95,0.2)', color: 'var(--color-acc-orange)', background: 'rgba(224,122,95,0.08)' }}>Calcular 1RM</button>
          </div>
          </>
        )}
      </div>
    )
  }

  return null
}

/* ── RUNNING TAB ── */
function RunningTab() {
  const runs = useFisicoStore(s => s.runs)
  const addRun = useFisicoStore(s => s.addRun)
  const deleteRun = useFisicoStore(s => s.deleteRun)
  const toast = useToast()

  const [dist, setDist] = useState('')
  const [time, setTime] = useState('')
  const [runDate, setRunDate] = useState(new Date().toISOString().slice(0, 10))
  const [runHr, setRunHr] = useState('')
  const [runElev, setRunElev] = useState('')
  const [runType, setRunType] = useState('easy')
  const [runNotes, setRunNotes] = useState('')
  const [sharePost, setSharePost] = useState<NewPost | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<ParsedActivity | null>(null)

  const totalKm = runs.reduce((s, r) => s + r.distance, 0)
  const totalRuns = runs.length
  const totalTime = runs.reduce((s, r) => s + r.timeSeconds, 0)

  function parseTime(t: string): number {
    const parts = t.split(':').map(Number)
    if (parts.length === 2) return parts[0] * 60 + (parts[1] || 0)
    return parseInt(t) || 0
  }

  function formatTime(sec: number): string {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    if (h > 0) return `${h}h ${m}min`
    return `${m}:${String(s).padStart(2, '0')}`
  }

  function handleAdd() {
    if (!dist || !time) return
    addRun({ date: runDate, distance: parseFloat(dist), timeSeconds: parseTime(time), hr: runHr ? parseInt(runHr) : undefined, elevation: runElev ? parseInt(runElev) : undefined, type: runType, notes: runNotes })
    setDist(''); setTime(''); setRunHr(''); setRunElev(''); setRunNotes('')
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permitir reimportar el mismo fichero
    if (!file) return
    if (/\.fit$/i.test(file.name)) {
      toast.show('Los .fit no se pueden leer. Exporta como GPX o TCX.')
      return
    }
    if (!/\.(gpx|tcx|xml)$/i.test(file.name)) {
      toast.show('Formato no soportado. Usa un fichero GPX o TCX.')
      return
    }
    try {
      const text = await file.text()
      const parsed = parseActivity(text)
      if (!parsed) {
        toast.show('No se pudo leer la actividad del fichero.')
        return
      }
      setPreview(parsed)
    } catch {
      toast.show('No se pudo leer el fichero.')
    }
  }

  function confirmImport() {
    if (!preview) return
    const record = toRunRecord(preview)
    if (isDuplicateRun(runs, record)) {
      toast.show('Ya tienes una carrera con esa fecha y distancia.')
      setPreview(null)
      return
    }
    addRun(record)
    setPreview(null)
    toast.show('Actividad importada')
  }

  const previewPace = preview && preview.distanceKm > 0
    ? (() => { const t = Math.round(preview.timeSeconds / preview.distanceKm); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')} /km` })()
    : '—'

  return (
    <div className="animate-tab">
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-3.5">
          <div className="text-[10px] font-semibold text-[var(--color-dim)] uppercase tracking-wider mb-1.5">Km totales</div>
          <div className="font-serif text-[28px] text-[var(--color-acc-blue)] leading-none">{totalKm.toFixed(1)}</div>
          <div className="text-xs text-[var(--color-dim)] mt-1">{totalRuns} carreras</div>
        </div>
        <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-3.5">
          <div className="text-[10px] font-semibold text-[var(--color-dim)] uppercase tracking-wider mb-1.5">Tiempo total</div>
          <div className="font-serif text-[28px] text-[var(--color-acc-green)] leading-none">{formatTime(totalTime)}</div>
          <div className="text-xs text-[var(--color-dim)] mt-1">acumulado</div>
        </div>
      </div>

      <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mb-3">
        <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-3">Registrar carrera</div>
        <div className="grid grid-cols-2 gap-2 mb-1.5">
          <Input value={dist} onChange={setDist} type="number" step="0.01" placeholder="Distancia (km)" />
          <Input value={time} onChange={setTime} placeholder="Tiempo (mm:ss)" />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-1.5">
          <Input value={runHr} onChange={setRunHr} type="number" placeholder="FC media (bpm)" />
          <Input value={runElev} onChange={setRunElev} type="number" placeholder="Desnivel + (m)" />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <Input value={runDate} onChange={setRunDate} type="date" />
          <select value={runType} onChange={e => setRunType(e.target.value)} className="w-full bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3.5 py-2.5 text-sm font-sans outline-none cursor-pointer">
          <option value="easy">🟢 Rodaje suave</option>
          <option value="tempo">🔵 Tempo / Umbral</option>
          <option value="interval">🟡 Series / Intervalos</option>
          <option value="long">🟠 Tirada larga</option>
          <option value="race">🔴 Competición</option>
          <option value="trail">🟤 Trail / montaña</option>
        </select>
        </div>
        <Input value={runNotes} onChange={setRunNotes} placeholder="Notas (sensaciones, ruta...)" className="mb-2" />
        <button onClick={handleAdd} className="w-full py-2.5 rounded-xl bg-[var(--color-acc-blue)] text-white text-sm font-semibold font-sans cursor-pointer shadow-lg shadow-[var(--color-acc-blue)]/25">Guardar carrera</button>
        <input ref={fileInputRef} type="file" accept=".gpx,.tcx" onChange={handleFile} className="hidden" />
        <button onClick={() => fileInputRef.current?.click()} className="w-full mt-2 py-2.5 rounded-xl bg-[var(--color-acc-blue)]/[0.1] text-[var(--color-acc-blue)] border border-[var(--color-acc-blue)]/30 text-sm font-semibold font-sans cursor-pointer">📁 Importar actividad (GPX/TCX)</button>
      </div>

      <Modal open={!!preview} onClose={() => setPreview(null)} title="Importar actividad">
        {preview && (
          <div className="px-5 pb-1">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-[var(--color-s2)] border border-[var(--color-border)] rounded-2xl p-3.5">
                <div className="text-[10px] font-semibold text-[var(--color-dim)] uppercase tracking-wider mb-1.5">Distancia</div>
                <div className="font-serif text-[26px] text-[var(--color-acc-blue)] leading-none">{(Math.round(preview.distanceKm * 10) / 10).toFixed(1)}<span className="text-sm text-[var(--color-dim)]"> km</span></div>
              </div>
              <div className="bg-[var(--color-s2)] border border-[var(--color-border)] rounded-2xl p-3.5">
                <div className="text-[10px] font-semibold text-[var(--color-dim)] uppercase tracking-wider mb-1.5">Tiempo</div>
                <div className="font-serif text-[26px] text-[var(--color-acc-green)] leading-none">{formatTime(preview.timeSeconds)}</div>
              </div>
              <div className="bg-[var(--color-s2)] border border-[var(--color-border)] rounded-2xl p-3.5">
                <div className="text-[10px] font-semibold text-[var(--color-dim)] uppercase tracking-wider mb-1.5">Ritmo</div>
                <div className="font-serif text-[22px] text-[var(--color-text)] leading-none">{previewPace}</div>
              </div>
              <div className="bg-[var(--color-s2)] border border-[var(--color-border)] rounded-2xl p-3.5">
                <div className="text-[10px] font-semibold text-[var(--color-dim)] uppercase tracking-wider mb-1.5">FC media</div>
                <div className="font-serif text-[22px] text-[var(--color-text)] leading-none">{preview.hr ? `${preview.hr}` : '—'}<span className="text-sm text-[var(--color-dim)]">{preview.hr ? ' bpm' : ''}</span></div>
              </div>
            </div>
            <div className="text-xs text-[var(--color-sub)] mb-3">
              {new Date(preview.date + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              {preview.elevation ? ` · +${preview.elevation} m desnivel` : ''} · {preview.points} puntos
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPreview(null)} className="flex-1 py-2.5 rounded-xl bg-[var(--color-s2)] text-[var(--color-dim)] border border-[var(--color-border)] text-sm font-semibold font-sans cursor-pointer">Cancelar</button>
              <button onClick={confirmImport} className="flex-1 py-2.5 rounded-xl bg-[var(--color-acc-blue)] text-white text-sm font-semibold font-sans cursor-pointer">Guardar carrera</button>
            </div>
          </div>
        )}
      </Modal>

      {sharePost && <ShareSheet post={sharePost} onClose={() => setSharePost(null)} />}
      <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2.5">Historial</div>
      {runs.length === 0 ? (
        <div className="text-center py-8 text-[13px] text-[var(--color-dim)]">Sin carreras registradas.</div>
      ) : (
        runs.map((r, i) => (
          <div key={i} className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl mb-2 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="text-center bg-[var(--color-acc-blue)]/10 border border-[var(--color-acc-blue)]/20 rounded-xl px-3 py-2 flex-shrink-0">
                <div className="font-serif text-[22px] text-[var(--color-acc-blue)] leading-none">{r.date.slice(8)}</div>
                <div className="text-[10px] font-bold text-[var(--color-acc-blue)] uppercase tracking-[1px]">{['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][new Date(r.date + 'T12:00').getMonth()]}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[var(--color-text)]">{r.distance} km · {formatTime(r.timeSeconds)}</div>
                <div className="text-xs text-[var(--color-sub)] mt-0.5">{r.type} {r.hr ? '· ' + r.hr + ' bpm' : ''}{r.elevation ? ' · +' + r.elevation + 'm' : ''}</div>
              </div>
              <button title="Compartir en comunidad" onClick={() => setSharePost(runToPost(r))} className="w-7 h-7 rounded-lg bg-[var(--color-acc-purple)]/[0.1] text-[var(--color-acc-purple)] border border-[var(--color-acc-purple)]/20 text-[12px] flex items-center justify-center cursor-pointer">↗</button>
              <button onClick={() => deleteRun(i)} className="w-7 h-7 rounded-lg bg-red-500/[0.08] text-[var(--color-red)] border border-red-500/[0.15] text-[11px] font-bold flex items-center justify-center cursor-pointer">✕</button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

/* ── MOBILITY TAB ── */
function MobilityTab() {
  const mobRoutines = useFisicoStore(s => s.mobRoutines)
  const mobSessions = useFisicoStore(s => s.mobSessions)
  const activeSession = useFisicoStore(s => s.activeMobSession)
  const addMobRoutine = useFisicoStore(s => s.addMobRoutine)
  const startMobSession = useFisicoStore(s => s.startMobSession)
  const toggleMobExercise = useFisicoStore(s => s.toggleMobExercise)
  const finishMobSession = useFisicoStore(s => s.finishMobSession)
  const cancelMobSession = useFisicoStore(s => s.cancelMobSession)

  const [mobSub, setMobSub] = useState<'session' | 'routines' | 'history'>('session')
  const [rtnName, setRtnName] = useState('')
  const [rtnFocus, setRtnFocus] = useState('full')
  const [builderExs, setBuilderExs] = useState<{ name: string; duration: number }[]>([])
  const [exName, setExName] = useState('')

  const FOCUS_OPTIONS = [
    { v: 'full', l: '🔄 Cuerpo completo' }, { v: 'upper', l: '💪 Tren superior' },
    { v: 'lower', l: '🦵 Tren inferior' }, { v: 'spine', l: '🔃 Columna y core' },
    { v: 'hips', l: '🍑 Caderas' }, { v: 'shoulders', l: '🤸 Hombros' },
    { v: 'morning', l: '☀️ Rutina matutina' }, { v: 'night', l: '🌙 Rutina nocturna' },
  ]

  const mobBar = (
    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
      {(['session','routines','history'] as const).map(k => (
        <button key={k} onClick={() => setMobSub(k)}
          style={{
            flex: 1, padding: '8px 4px', borderRadius: 10, fontSize: 11, fontWeight: 700,
            fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid',
            background: mobSub === k ? 'var(--color-acc-purple)26' : 'var(--color-s2)',
            color: mobSub === k ? 'var(--color-acc-purple)' : 'var(--color-dim)',
            borderColor: mobSub === k ? 'var(--color-acc-purple)4d' : 'var(--color-border)',
            transition: 'all 0.15s',
          }}
        >{{session:'🧘 Sesión',routines:'📋 Rutinas',history:'📊 Historial'}[k]}</button>
      ))}
    </div>
  )

  if (mobSub === 'session') {
    return (
      <div className="animate-tab">
        {mobBar}
        {!activeSession ? (
          <>
            <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mb-3">
              <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2.5">Elegir rutina</div>
              <select
                onChange={e => {
                  const r = mobRoutines.find(r => r.id === +e.target.value)
                  if (r) startMobSession(r.name, r.exercises.map(e => ({ name: e.name, duration: e.duration })))
                }}
                className="w-full bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3.5 py-2.5 text-sm font-sans mb-2.5 outline-none cursor-pointer"
              >
                <option value="">— Selecciona una rutina —</option>
                {mobRoutines.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <button onClick={() => startMobSession('Sesión libre', [])} className="w-full py-2.5 rounded-xl bg-[var(--color-acc-purple)]/15 text-[var(--color-acc-purple)] border border-[var(--color-acc-purple)]/30 text-sm font-semibold font-sans cursor-pointer">▶ Sesión libre</button>
            </div>
          </>
        ) : (
          <div>
            <div className="bg-[var(--color-s1)] border border-[var(--color-acc-purple)]/30 rounded-2xl overflow-hidden mb-3">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--color-border)]">
                <div>
                  <div className="text-sm font-bold text-[var(--color-text)]">{activeSession.name}</div>
                  <div className="text-[11px] text-[var(--color-dim)] mt-0.5">
                    <span className="text-[var(--color-acc-purple)] font-bold">{activeSession.exercises.filter(e => e.done).length}</span>
                    {' / '}{activeSession.exercises.length} ejercicios
                  </div>
                </div>
                <button onClick={cancelMobSession} className="px-3.5 py-1.5 rounded-lg bg-red-500/[0.08] text-[var(--color-red)] border border-red-500/[0.2] text-xs font-semibold font-sans cursor-pointer">Cancelar</button>
              </div>
              <div className="h-1 bg-white/[0.05]">
                <div className="h-full bg-gradient-to-r from-[var(--color-acc-purple)] to-[var(--color-acc-green)] transition-all duration-400" style={{ width: `${activeSession.exercises.length ? Math.round(activeSession.exercises.filter(e => e.done).length / activeSession.exercises.length * 100) : 0}%` }} />
              </div>
              {activeSession.exercises.map((ex, i) => (
                <div
                  key={i}
                  onClick={() => toggleMobExercise(i)}
                  className={`flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.04] last:border-b-0 cursor-pointer transition-colors active:bg-white/[0.03] ${ex.done ? 'bg-[var(--color-acc-green)]/[0.04]' : ''}`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${ex.done ? 'bg-[var(--color-acc-green)]' : 'bg-[var(--color-acc-purple)]'}`} />
                  <span className="flex-1 text-[13px] font-medium text-[var(--color-text)]">{ex.name}</span>
                </div>
              ))}
              <div className="p-4 border-t border-[var(--color-border)]">
                <button onClick={finishMobSession} className="w-full py-2.5 rounded-xl bg-[var(--color-acc-purple)]/15 text-[var(--color-acc-purple)] border border-[var(--color-acc-purple)]/30 text-sm font-semibold font-sans cursor-pointer">✓ Guardar sesión</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (mobSub === 'routines') {
    return (
      <div className="animate-tab">
        {mobBar}
        <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mb-3">
          <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2.5">Nueva rutina</div>
          <Input value={rtnName} onChange={setRtnName} placeholder="Nombre de la rutina..." className="mb-2" />
          <select value={rtnFocus} onChange={e => setRtnFocus(e.target.value)} className="w-full bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3.5 py-2.5 text-sm font-sans mb-2 outline-none cursor-pointer">
            {FOCUS_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
          <div className="flex gap-2 mb-2">
            <Input value={exName} onChange={setExName} placeholder="Nombre del ejercicio" className="flex-1 mb-0" />
            <button onClick={() => { if (exName.trim()) { setBuilderExs(prev => [...prev, { name: exName.trim(), duration: 60 }]); setExName('') } }}
              className="px-4 py-2.5 rounded-xl bg-[var(--color-acc-purple)]/15 text-[var(--color-acc-purple)] border border-[var(--color-acc-purple)]/30 text-xs font-semibold font-sans cursor-pointer">+</button>
          </div>
          {builderExs.length > 0 && (
            <div className="mb-2.5">
              <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-wider mb-2">Ejercicios ({builderExs.length})</div>
              {builderExs.map((ex, i) => (
                <div key={i} className="flex items-center gap-2.5 py-2 border-b border-white/[0.04] last:border-b-0">
                  <div className="flex-1 text-[13px] text-[var(--color-text)]">{ex.name}</div>
                  <button onClick={() => setBuilderExs(prev => prev.filter((_, ii) => ii !== i))} className="text-[var(--color-dim)] text-xs">✕</button>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => {
            if (rtnName.trim() && builderExs.length) {
              addMobRoutine({ id: Date.now(), name: rtnName.trim(), focus: rtnFocus, exercises: builderExs })
              setRtnName(''); setBuilderExs([])
            }
          }} className="w-full py-2.5 rounded-xl bg-[var(--color-acc-purple)] text-white text-sm font-semibold font-sans cursor-pointer">Guardar rutina</button>
        </div>

        <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2.5">Mis rutinas</div>
        {mobRoutines.length === 0 ? (
          <div className="text-center py-8 text-[13px] text-[var(--color-dim)]">Sin rutinas de movilidad.</div>
        ) : (
          mobRoutines.map(r => (
            <div key={r.id} className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl overflow-hidden mb-2">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-acc-purple)]/10 border border-[var(--color-acc-purple)]/20 flex items-center justify-center text-lg">🧘</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-[var(--color-text)]">{r.name}</div>
                  <div className="text-xs text-[var(--color-sub)] mt-0.5">{r.exercises.length} ejercicios</div>
                </div>
                <button onClick={() => startMobSession(r.name, r.exercises)} className="px-4 py-2 rounded-xl bg-[var(--color-acc-purple)]/15 text-[var(--color-acc-purple)] border border-[var(--color-acc-purple)]/30 text-xs font-semibold font-sans cursor-pointer">▶</button>
              </div>
            </div>
          ))
        )}
      </div>
    )
  }

  if (mobSub === 'history') {
    return (
      <div className="animate-tab">
        {mobBar}
        <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2.5">Historial de sesiones</div>
        {mobSessions.length === 0 ? (
          <div className="text-center py-12 text-[13px] text-[var(--color-dim)]">Sin sesiones registradas.</div>
        ) : (
          mobSessions.map((s, i) => (
            <div key={i} className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl mb-2 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-acc-purple)]/10 border border-[var(--color-acc-purple)]/20 flex items-center justify-center text-lg flex-shrink-0">🧘</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-[var(--color-text)]">{s.routineName}</div>
                  <div className="text-xs text-[var(--color-sub)] mt-0.5">{s.date} · {s.exercises.filter(e => e.done).length}/{s.exercises.length}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    )
  }

  return null
}

/* ── MAIN FÍSICO PAGE ── */
export default function Fisico() {
  const [section, setSection] = useState<'strength' | 'running' | 'mobility' | 'health'>('strength')

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Físico</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 2, paddingBottom: 6, overflowX: 'auto' }}>
          {([
            { k: 'strength' as const, l: '💪 Fuerza', c: 'var(--color-acc-orange)' },
            { k: 'running' as const, l: '🏃 Running', c: 'var(--color-acc-blue)' },
            { k: 'mobility' as const, l: '🧘 Movilidad', c: 'var(--color-acc-purple)' },
            { k: 'health' as const, l: '❤️ Salud', c: 'var(--color-red)' },
          ]).map(s => (
            <button key={s.k} onClick={() => setSection(s.k)}
              style={{
                flex: 1, padding: '9px 4px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid', whiteSpace: 'nowrap',
                background: section === s.k ? s.c + '26' : 'transparent',
                color: section === s.k ? s.c : 'var(--color-dim)',
                borderColor: section === s.k ? s.c + '4d' : 'var(--color-border)',
                transition: 'all 0.15s',
              }}
            >{s.l}</button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {section === 'strength' && <StrengthTab />}
        {section === 'running' && <RunningTab />}
        {section === 'mobility' && <MobilityTab />}
        {section === 'health' && <HealthTab />}
        </div>
    </div>
  )
}
