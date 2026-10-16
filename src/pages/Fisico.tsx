import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useFisicoStore, STATIC_EXERCISES, EXERCISE_GROUPS, EQUIPMENT_TYPES, EQUIPMENT_LABELS, EXERCISE_COLORS } from '@/stores/fisicoStore'
import { ChipTabs, Input, Modal } from '@/components/ui'
import { useToast } from '@/stores/toast'
import { parseActivity, toRunRecord, isDuplicateRun, type ParsedActivity } from '@/lib/activityImport'
import { ROUTINES, ROUTINE_OBJECTIVES, ROUTINE_LEVELS, ROUTINE_PLACES, getObjLabel, getNivelLabel, getLugarLabel, filterRoutines } from '@/data/routinesDB'
import type { NewPost } from '@/lib/social'
import { ShareSheet } from '@/components/social/ShareSheet'
import { sessionToPost, routineToPost, prToPost, runToPost } from '@/lib/socialShare'
import { NotesFor } from '@/components/notes/NotesFor'
import { HealthTab } from '@/components/fisico/HealthTab'
import {
  Dumbbell, Eye, EyeOff,
  Play, Check,
  Search, SlidersHorizontal, Upload, Share2, Trash2, Calendar, Award,
  Activity as ActivityIcon,
  Plus,
} from 'lucide-react'
import '@/styles/fisico.css'
import '@/styles/module-ui.css'

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

const SET_TYPE_LABEL: Record<string, string> = { warmup: 'Calent.', normal: 'Normal', dropset: 'Drop', failure: 'Al fallo' }

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
  const [libGroup, setLibGroup] = useState('')
  const [progEx, setProgEx] = useState('')
  const [dbObj, setDbObj] = useState('')
  const [dbNivel, setDbNivel] = useState('')
  const [dbLugar, setDbLugar] = useState('')
  const [dbSearch2, setDbSearch2] = useState('')
  const [dbSearchOpen, setDbSearchOpen] = useState(false)
  const [dbFilterOpen, setDbFilterOpen] = useState(false)
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

  const subBar = (
    <>
    {sharePost && <ShareSheet post={sharePost} onClose={() => setSharePost(null)} />}
    <ChipTabs variant="line" color="var(--color-acc-orange)" value={sub} onChange={setSub} items={STRENGTH_SUBS} />
    </>
  )

  if (sub === 'today') {
    return (
      <div className="animate-tab">
        {subBar}
        <div className="fis-stat">
          <div><div className="fis-stat-num" style={{ color: 'var(--color-acc-orange)' }}>{todayKg}</div><div className="fis-stat-lbl">kg totales</div></div>
          <div><div className="fis-stat-num" style={{ color: 'var(--color-acc-blue)' }}>{todaySets}</div><div className="fis-stat-lbl">series</div></div>
          <div><div className="fis-stat-num" style={{ color: 'var(--color-acc-green)' }}>{todaySessions.length}</div><div className="fis-stat-lbl">sesiones</div></div>
        </div>

        {t && (
          <div className="fis-timer-card volt">
            <svg width="72" height="72" className="fis-timer-svg" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="36" cy="36" r="30" fill="none" stroke="var(--color-border2)" strokeWidth="6" />
              <circle cx="36" cy="36" r="30" fill="none" stroke="var(--color-volt)" strokeWidth="6"
                strokeDasharray="188.5" strokeDashoffset={188.5 * (1 - t.remaining / t.preset)} strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.9s linear' }} />
            </svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="fis-timer-tag">Descanso activo</div>
              <div className="fis-timer-big">
                {Math.floor(t.remaining / 60)}:{String(t.remaining % 60).padStart(2, '0')}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
              <button onClick={() => startTimer(restPreset)} className="fis-secondary" style={{ background: 'color-mix(in srgb, var(--color-acc-green) 12%, transparent)', color: 'var(--color-acc-green)', borderColor: 'color-mix(in srgb, var(--color-acc-green) 24%, transparent)' }}>↺ Reset</button>
              <button onClick={stopTimer} className="fis-secondary danger">✕ Parar</button>
            </div>
          </div>
        )}
        {t && (
          <div className="fis-preset-row">
            {[60, 90, 120, 180].map(s => (
              <button key={s} onClick={() => { setRestPreset(s); startTimer(s) }}
                className={`fis-preset${restPreset === s ? ' active' : ''}`}>
                {s >= 60 ? `${s / 60}min` : `${s}s`}
              </button>
            ))}
          </div>
        )}

        {!activeSession ? (
          <div>
            {(() => {
              const wp = useFisicoStore.getState().weeklyProgram
              if (!wp) return null
              const lib = ROUTINES.find(r => r.id === wp.routineId)

              if (!lib && wp.routineId === 'custom-weekly') {
                const todayD = new Date().getDay()
                const userRoutines = useFisicoStore.getState().routines
                const idx = wp.dayMapping[todayD]
                if (idx !== undefined && userRoutines[idx]) {
                  const r = userRoutines[idx]
                  return (
                    <div className="program-card">
                      <div className="program-card-head">
                        <div>
                          <div className="program-card-tag">Programa semanal · Hoy</div>
                          <div className="program-card-name">{r.name}</div>
                        </div>
                        <button onClick={() => { useFisicoStore.getState().setWeeklyProgram(null); toast.show('Programa desactivado') }} className="program-card-close" aria-label="Desactivar programa">✕</button>
                      </div>
                      <div className="program-card-sub">{r.exercises.map(e => e.name).join(' · ')}</div>
                      <button onClick={() => startSession(r.name, r.exercises.map(e => ({ name: e.name, group: e.group, color: e.color, sets: e.sets })))}
                        className="fis-cta">
                        <Play size={16} aria-hidden="true" /> Empezar sesión de hoy
                      </button>
                    </div>
                  )
                }
                return null
              }
              if (!lib) return null
              const todayD = new Date().getDay()
              const sessionIdx = wp.dayMapping[todayD]
              if (sessionIdx === undefined) return null
              const session = lib.sesiones[sessionIdx]
              if (!session) return null
              return (
                <div className="program-card">
                  <div className="program-card-head">
                    <div>
                      <div className="program-card-tag">Programa activo · Hoy</div>
                      <div className="program-card-name">{lib.nombre} — {session.nombre}</div>
                    </div>
                    <button onClick={() => {
                      useFisicoStore.getState().setWeeklyProgram(null)
                      toast.show('Programa desactivado')
                    }} className="program-card-close" aria-label="Desactivar programa">✕</button>
                  </div>
                  <div className="program-card-sub">
                    {session.ejercicios.map(e => e.nombre).join(' · ')}
                  </div>
                  <button onClick={() => {
                    startSession(`${lib.nombre} - ${session.nombre}`, session.ejercicios.map(e => ({
                      name: e.nombre, group: e.grupo_muscular, color: EXERCISE_COLORS[e.grupo_muscular] || '#e07a5f', sets: e.series, restSeconds: e.descanso_seg
                    })))
                  }} className="fis-cta">
                    <Play size={16} aria-hidden="true" /> Empezar sesión de hoy
                  </button>
                </div>
              )
            })()}

            <div className="start-card">
              <div className="start-card-title">Iniciar sesión</div>
              <div className="start-card-title" style={{ marginBottom: 8, color: 'var(--color-sub)' }}>Mis rutinas</div>
              {routines.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--color-dim)', marginBottom: 10 }}>No tienes rutinas propias todavía.</div>
              ) : (
                <div className="routines-list">
                  {routines.slice(0, 4).map(r => (
                    <button key={r.id} onClick={() => startSession(r.name, r.exercises.map(e => ({ name: e.name, group: e.group, color: e.color, sets: e.sets })))}
                      className="routine-row">
                      <span className="routine-row-name">{r.name}</span>
                      <span className="routine-row-meta">{r.exercises.length} ejercicios</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="start-card-title" style={{ marginBottom: 8, color: 'var(--color-sub)' }}>Biblioteca</div>
              <select
                value={selRoutine}
                onChange={e => setSelRoutine(e.target.value)}
                className="input-mini"
                style={{ marginBottom: 8 }}
              >
                <option value="">— Elige de la biblioteca —</option>
                {ROUTINES.map(r => <option key={r.id} value={r.id}>{r.nombre} ({r.dias_semana}d, {getNivelLabel(r.nivel)})</option>)}
              </select>
              {selRoutine && (() => {
                const r = ROUTINES.find(r => r.id === selRoutine)
                if (!r) return null
                return (
                  <div style={{ background: 'var(--color-s2)', borderRadius: 12, padding: 12, marginBottom: 10, fontSize: 11, color: 'var(--color-sub)' }}>
                    <div style={{ marginBottom: 4 }}>{getObjLabel(r.objetivo)} · {getLugarLabel(r.lugar)} · {r.duracion_sesion_min}min · {r.sesiones.length > 0 ? r.sesiones.length + ' sesiones' : r.ejercicios.length + ' ejercicios'}</div>
                    {r.sesiones.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-dim)', marginBottom: 2 }}>Sesiones del programa:</div>
                        {r.sesiones.map((s, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 8, background: 'var(--color-s1)' }}>
                            <span style={{ fontWeight: 600 }}>{s.nombre}</span>
                            <span style={{ color: 'var(--color-dim)' }}>{s.ejercicios.length} ejercicios</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                        {r.ejercicios.slice(0, 4).map(e => <span key={e.nombre} style={{ padding: '2px 7px', borderRadius: 6, background: 'var(--color-s1)', fontSize: 10 }}>{e.nombre}</span>)}
                        {r.ejercicios.length > 4 && <span style={{ color: 'var(--color-dim)', fontSize: 10 }}>+{r.ejercicios.length - 4} más</span>}
                      </div>
                    )}
                  </div>
                )
              })()}

              {selRoutine && (() => {
                const r = ROUTINES.find(r => r.id === selRoutine)
                if (!r || r.sesiones.length === 0) return null
                return (
                  <select id="session-select" className="input-mini" style={{ marginBottom: 8 }}>
                    {r.sesiones.map((s, i) => <option key={i} value={i}>{s.nombre} ({s.ejercicios.length} ejercicios)</option>)}
                  </select>
                )
              })()}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button onClick={() => {
                  const rtn = routines.find(r => r.id === +selRoutine)
                  const lib = ROUTINES.find(r => r.id === selRoutine)
                  if (rtn) startSession(rtn.name, rtn.exercises.map(e => ({ name: e.name, group: e.group, color: e.color, sets: e.sets })))
                  else if (lib) {
                    const sel = document.getElementById('session-select') as HTMLSelectElement
                    const sessionIdx = sel ? parseInt(sel.value) : 0
                    const session = lib.sesiones.length > 0 ? lib.sesiones[sessionIdx] : null
                    const exs = session ? session.ejercicios : lib.ejercicios
                    const name = session ? `${lib.nombre} - ${session.nombre}` : lib.nombre
                    startSession(name, exs.map(e => ({ name: e.nombre, group: e.grupo_muscular, color: EXERCISE_COLORS[e.grupo_muscular] || '#e07a5f', sets: e.series, restSeconds: e.descanso_seg })))
                  }
                  else startSession('Sesión libre')
                }} className="fis-cta">
                  <Play size={16} aria-hidden="true" /> Empezar
                </button>
                <button onClick={() => { const last = sessions[0]; startSession(last?.name || 'Sesión libre', last?.exercises.map(e => ({ name: e.name, group: e.group, color: e.color, sets: e.sets.length }))) }}
                  className="fis-secondary">
                  Repetir última
                </button>
              </div>
            </div>

            <div className="fis-stat" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
              <div>
                <div className="fis-stat-num" style={{ color: 'var(--color-acc-orange)' }}>
                  {sessions.filter(s => s.date.startsWith(new Date().toISOString().slice(0, 7))).length}
                </div>
                <div className="fis-stat-lbl">sesiones este mes</div>
              </div>
              <div>
                <div className="fis-stat-num" style={{ color: 'var(--color-acc-blue)' }}>
                  {sessions[0] ? sessions[0].date.slice(8) + '/' + sessions[0].date.slice(5, 7) : '—'}
                </div>
                <div className="fis-stat-lbl" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sessions[0]?.name || 'Última sesión'}</div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="session-hero">
              <div className="session-hero-head">
                <div>
                  <div className="session-hero-tag">En curso</div>
                  <div className={`session-hero-name${activeSession.name.length > 24 ? ' long' : ''}`}>{activeSession.name}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, position: 'relative' }}>
                  <button onClick={() => { setWakeLock(!wakeLock); toast.show(wakeLock ? 'Pantalla normal' : 'Pantalla siempre activa') }}
                    title="Mantener pantalla activa"
                    className={`fis-round${wakeLock ? ' active' : ''}`}
                    aria-label={wakeLock ? 'Pantalla siempre activa' : 'Mantener pantalla activa'}>
                    {wakeLock ? <Eye size={18} aria-hidden="true" /> : <EyeOff size={18} aria-hidden="true" />}
                  </button>
                </div>
              </div>
              <div className="session-hero-progress">
                <span>Ejercicios</span>
                <strong>{activeSession.exercises.filter(e => e.sets.some(s => s.done)).length} / {activeSession.exercises.length}</strong>
                <span>{unit.toUpperCase()}</span>
              </div>
              <div className="session-hero-progress" style={{ marginTop: 6 }}>
                <span>Series</span>
                <strong>{activeSession.exercises.reduce((s, e) => s + e.sets.filter(st => st.done).length, 0)} / {activeSession.exercises.reduce((s, e) => s + e.sets.length, 0)}</strong>
                <span>—</span>
              </div>
              <div className="session-segments" aria-hidden="true">
                {activeSession.exercises.map((_, i) => {
                  const ex = activeSession.exercises[i]
                  const isDone = ex.sets.length > 0 && ex.sets.every(s => s.done)
                  const isStarted = ex.sets.some(s => s.done)
                  return <div key={i} className={`session-seg${isDone || isStarted ? ' on' : ''}`} />
                })}
              </div>
              <div style={{ marginTop: 14, position: 'relative' }}>
                <button onClick={() => {
                  const prs = finishSession()
                  if (prs.length) toast.show(`${prs.length} récord${prs.length > 1 ? 's' : ''} batido${prs.length > 1 ? 's' : ''}`)
                  const done = useFisicoStore.getState().sessions[0]
                  if (done) setSharePost(sessionToPost(done, unit))
                }} className="fis-cta">
                  <Check size={16} aria-hidden="true" /> Finalizar entrenamiento
                </button>
              </div>
            </div>

            {activeSession.exercises.map((ex, ei) => {
              const lastData = getLastExerciseData(ex.name)
              const doneSets = ex.sets.filter(s => s.done).length
              return (
                <div key={ei} className="ex-card">
                  <div className="ex-head">
                    <span className="dot" style={{ background: ex.color }} aria-hidden="true" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="ex-head-name">{ex.name}</div>
                      <div className="ex-head-meta">{ex.group}{lastData ? ` · Última: ${lastData.weight}${unit} × ${lastData.reps}` : ''}</div>
                    </div>
                    {doneSets === ex.sets.length && ex.sets.length > 0 && (
                      <span className="fis-chip green"><Check size={12} aria-hidden="true" /></span>
                    )}
                    <button onClick={() => { const ses = useFisicoStore.getState().activeSession; if (ses) useFisicoStore.setState({ activeSession: { ...ses, exercises: ses.exercises.filter((_, i) => i !== ei) } }) }}
                      aria-label="Quitar ejercicio" className="meal-action" style={{ width: 28, height: 28 }}>✕</button>
                  </div>

                  <div className="ex-actions">
                    {(['warmup','normal','dropset','failure'] as const).map(tk => (
                      <button key={tk} onClick={() => addSetToExercise(ei, lastData?.weight || 0, lastData?.reps || 10)}
                        className={`ex-chip${tk === 'warmup' ? ' warmup' : ''}`}>
                        {SET_TYPE_LABEL[tk]}
                      </button>
                    ))}
                    <div style={{ flex: 1 }} />
                    <button onClick={() => {
                      const w = lastData?.weight || ex.sets.find(s => s.weight)?.weight
                      if (!w) { toast.show('Introduce un peso primero'); return }
                      generateWarmupSets(ei, w)
                    }} className="ex-chip warmup">
                      Auto calent.
                    </button>
                  </div>

                  <div className="set-head">
                    <span>#</span><span>Peso</span><span>Reps</span><span>✓</span><span>Tipo</span><span></span>
                  </div>
                  {ex.sets.map((set, si) => (
                    <div key={si} className={`set-row${set.done ? ' done' : set.type === 'warmup' ? ' warmup' : ''}`}>
                      <div className={`set-idx${set.done ? ' done' : set.type === 'warmup' ? ' warmup' : ''}`}>{set.setNumber}</div>
                      <input type="number" value={set.weight || ''} onChange={e => updateSet(ei, si, { weight: parseFloat(e.target.value) || 0 })}
                        className="set-input"
                        placeholder={unit} aria-label={`Peso serie ${set.setNumber}`} />
                      <input type="number" value={set.reps || ''} onChange={e => updateSet(ei, si, { reps: parseInt(e.target.value) || 0 })}
                        className="set-input"
                        placeholder="reps" aria-label={`Reps serie ${set.setNumber}`} />
                      <button onClick={() => { updateSet(ei, si, { done: !set.done }); if (!set.done && ex.restSeconds) startTimer(ex.restSeconds, ei) }}
                        aria-label={set.done ? 'Serie completada' : 'Marcar serie hecha'}
                        className={`set-check${set.done ? ' done' : ''}`}>
                        {set.done && <Check size={14} aria-hidden="true" />}
                      </button>
                      <div className={`set-type${set.done ? ' done' : ''}${set.type === 'warmup' ? ' warmup' : set.type === 'dropset' ? ' dropset' : set.type === 'failure' ? ' failure' : ''}`}>
                        {set.type === 'warmup' ? 'W' : set.type === 'dropset' ? 'D' : set.type === 'failure' ? 'F' : '—'}
                      </div>
                      <button onClick={() => removeSet(ei, si)} aria-label="Quitar serie" className="set-del">✕</button>
                    </div>
                  ))}

                  <div className="ex-foot">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="ex-foot-label">Descanso</span>
                      <select value={ex.restSeconds || 90} onChange={e => updateExercise(ei, { restSeconds: parseInt(e.target.value) })}
                        className="ex-foot-select" aria-label="Segundos de descanso">
                        {[30, 60, 90, 120, 180].map(s => <option key={s} value={s}>{s}s</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="ex-foot-label">Superserie</span>
                      <select value={ex.supersetWith ?? -1} onChange={e => {
                        const v = parseInt(e.target.value)
                        updateExercise(ei, { supersetWith: v >= 0 ? v : undefined })
                        if (v >= 0) toast.show('✓ Superserie emparejada')
                      }} className="ex-foot-select" aria-label="Superserie">
                        <option value={-1}>No</option>
                        {activeSession.exercises.map((e2, i2) => i2 !== ei ? (
                          <option key={i2} value={i2}>{e2.name.slice(0, 15)}</option>
                        ) : null)}
                      </select>
                    </div>
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
                    }} className="ex-foot-select" style={{ cursor: 'pointer', padding: '4px 8px' }}>
                      Discos
                    </button>
                    <input className="ex-foot-input" value={ex.notes || ''} onChange={e => updateExercise(ei, { notes: e.target.value })} placeholder="Nota del ejercicio..." aria-label="Nota" />
                  </div>
                </div>
              )
            })}

            {activeSession.exercises.length > 0 && <button onClick={() => addSetToExercise(activeSession.exercises.length - 1, 0, 0)} aria-label="Añadir serie vacía" className="set-add-row" style={{ width: 'auto', marginLeft: 12, marginRight: 12 }}>
              <div className="set-add-dots">+ Añadir serie</div>
            </button>}

            <div style={{ padding: '0 14px' }}>
              <button onClick={() => setShowExPicker(true)} className="add-ex">
                <Plus size={16} aria-hidden="true" /> Añadir ejercicio
              </button>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas de la sesión..."
                className="notes-area" aria-label="Notas de la sesión" />
              <button onClick={cancelSession} className="fis-secondary danger" style={{ width: '100%' }}>
                Cancelar sesión
              </button>
            </div>

            <ExercisePicker
              open={showExPicker}
              onClose={() => setShowExPicker(false)}
              allExercises={allExercises}
              equipFilter={equipFilter}
              setEquipFilter={setEquipFilter}
              onPick={(ex) => { addExerciseToSession({ name: ex.name, group: ex.group, color: EXERCISE_COLORS[ex.group] || 'var(--color-acc-orange)', sets: 3 }); setShowExPicker(false) }}
            />
          </div>
        )}
      </div>
    )
  }

  if (sub === 'history') {
    return (
      <div className="animate-tab">
        {subBar}
        <div className="section-head" style={{ marginBottom: 10 }}>
          <span className="lbl">Sesiones recientes</span>
        </div>
        {sessions.length === 0 ? (
          <div className="meal-empty">Sin sesiones registradas.</div>
        ) : (
          sessions.map((s, i) => (
            <div key={i} className="hist-list-item">
              <div className="hist-row">
                <div className="hist-datebox">
                  <div className="d">{s.date.slice(8)}</div>
                  <div className="m">{['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][new Date(s.date + 'T12:00').getMonth()]}</div>
                </div>
                <div className="hist-spacer">
                  <div className="hist-title">{s.name}</div>
                  <div className="hist-meta">{s.duration} min · {s.exercises.length} ejercicios</div>
                </div>
                <div className="hist-kg">{Math.round(s.totalKg)} {unit}</div>
                <button title="Compartir en comunidad" onClick={() => setSharePost(sessionToPost(s, unit))} className="hist-icon-btn purple" aria-label="Compartir sesión">
                  <Share2 size={14} aria-hidden="true" />
                </button>
                <button onClick={() => deleteSession(i)} className="hist-icon-btn danger" aria-label="Eliminar sesión">
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
              <div style={{ padding: '0 16px 14px' }}>
                <NotesFor entityType="workout" entityId={String(s.id ?? s.date)} defaultTitle={`Notas · ${s.name}`} />
              </div>
            </div>
          ))
        )}
      </div>
    )
  }

  if (sub === 'routines') {
    return (
      <div className="animate-tab">
        {subBar}

        <div className="section-head">
          <span className="lbl">Programas</span>
          <button onClick={() => setShowProgForm(!showProgForm)} className="add-btn">
            {showProgForm ? 'Cerrar' : '+ Nuevo programa'}
          </button>
        </div>
        {showProgForm && (
          <div className="start-card">
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
                      className={`fis-chip${on ? ' gold' : ''}`} style={{ cursor: 'pointer' }}>
                      {on ? '✓ ' : ''}{r.name}
                    </button>
                  )
                })}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {['#dd7d55', '#6d76f0', '#48b586', '#c8a24e', '#9a82e8'].map(c => (
                <button key={c} onClick={() => setProgColor(c)} aria-label={`Color ${c}`}
                  style={{ width: 24, height: 24, borderRadius: '50%', border: progColor === c ? '2.5px solid var(--color-text)' : '2.5px solid transparent', background: c, cursor: 'pointer' }} />
              ))}
            </div>
            <button onClick={() => {
              if (!progName.trim()) { toast.show('Ponle nombre al programa'); return }
              addProgram({ id: Date.now(), name: progName.trim(), description: '', routines: progRoutineSel, color: progColor })
              setProgName(''); setProgRoutineSel([]); setShowProgForm(false); toast.show('✓ Programa creado')
            }} className="fis-cta" style={{ background: 'var(--color-acc-orange)' }}>
              Crear programa
            </button>
          </div>
        )}
        {programs.map(pr => (
          <div key={pr.id} className="program-row" style={{ '--c': pr.color } as React.CSSProperties}>
            <div className="program-row-spacer">
              <div className="program-row-name">{pr.name}</div>
              <div className="program-row-meta">
                {pr.routines.map(rid => routines.find(r => r.id === rid)?.name).filter(Boolean).join(' · ') || 'Sin rutinas'}
              </div>
            </div>
            <button onClick={() => { removeProgram(pr.id); toast.show('Programa eliminado') }} aria-label="Eliminar programa" className="program-row-close">✕</button>
          </div>
        ))}

        <div style={{ marginTop: 12 }}>
          <div className="db-head">
            <span className="db-head-title">Biblioteca · {filterRoutines({ objetivo: dbObj || undefined, nivel: dbNivel || undefined, lugar: dbLugar || undefined, search: dbSearch2 || undefined }).length} rutinas</span>
            <button type="button" aria-label="Buscar rutina" onClick={() => setDbSearchOpen(v => !v)}
              className={`db-icon-btn${dbSearchOpen || dbSearch2 ? ' active' : ''}`}>
              <Search size={16} aria-hidden="true" />
            </button>
            <button type="button" aria-label="Filtrar rutinas" onClick={() => setDbFilterOpen(true)}
              className={`db-icon-btn${dbObj || dbNivel || dbLugar ? ' active' : ''}`}>
              <SlidersHorizontal size={16} aria-hidden="true" />
              {[dbObj, dbNivel, dbLugar].filter(Boolean).length > 0 && (
                <span className="db-badge">{[dbObj, dbNivel, dbLugar].filter(Boolean).length}</span>
              )}
            </button>
          </div>
          {(dbSearchOpen || dbSearch2) && (
            <input className="input-mini" autoFocus value={dbSearch2} onChange={e => setDbSearch2(e.target.value)} placeholder="Buscar rutina..." style={{ marginBottom: 10 }} />
          )}
          <Modal open={dbFilterOpen} onClose={() => setDbFilterOpen(false)} title="Filtrar rutinas">
            <div style={{ padding: '0 20px 8px' }}>
              {([
                { label: 'Objetivo', value: dbObj, set: setDbObj, options: ROUTINE_OBJECTIVES.map(o => [o, getObjLabel(o)]) },
                { label: 'Nivel', value: dbNivel, set: setDbNivel, options: ROUTINE_LEVELS.map(n => [n, getNivelLabel(n)]) },
                { label: 'Lugar', value: dbLugar, set: setDbLugar, options: ROUTINE_PLACES.map(l => [l, getLugarLabel(l)]) },
              ] as const).map(f => (
                <div key={f.label} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-sub)', marginBottom: 6 }}>{f.label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {[['', 'Cualquiera'] as const, ...f.options].map(([v, l]) => (
                      <button key={v === '' ? '__sin-filtro' : v} type="button" onClick={() => f.set(v)}
                        className={`fis-chip${f.value === v ? ' volt' : ''}`} style={{ cursor: 'pointer' }}>{l}</button>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                <button type="button" className="fis-secondary" style={{ width: '100%' }} onClick={() => { setDbObj(''); setDbNivel(''); setDbLugar('') }}>Limpiar</button>
                <button type="button" className="fis-cta" style={{ background: 'var(--color-acc-orange)' }} onClick={() => setDbFilterOpen(false)}>Ver rutinas</button>
              </div>
            </div>
          </Modal>
          {filterRoutines({ objetivo: dbObj || undefined, nivel: dbNivel || undefined, lugar: dbLugar || undefined, search: dbSearch2 || undefined }).slice(0, 10).map(r => (
            <div key={r.id} className="db-row">
              <div className="db-row-pad">
                <div className="db-row-head">
                  <div className="db-row-name">{r.nombre}</div>
                  <div className="db-row-tags">
                    <span className="db-row-tag">{getObjLabel(r.objetivo)}</span>
                    <span className="db-row-tag muted">{getNivelLabel(r.nivel)}</span>
                  </div>
                </div>
                <div className="db-row-meta">
                  {getLugarLabel(r.lugar)} · {r.dias_semana}d/sem · {r.duracion_sesion_min}min · {r.duracion_programa_semanas}semanas
                  {r.sesiones.length > 1 && <span style={{ marginLeft: 6, fontWeight: 600, color: 'var(--color-acc-orange)' }}>· {r.sesiones.length} sesiones</span>}
                </div>
                {r.sesiones.length > 1 ? (
                  <div style={{ marginBottom: 10 }}>
                    {r.sesiones.map((s, i) => (
                      <div key={i} style={{ fontSize: 11, color: 'var(--color-dim)', marginBottom: 3, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-sub)', minWidth: 56, flexShrink: 0 }}>{s.nombre}:</span>
                        <span>{s.ejercicios.slice(0, 3).map(e => e.nombre).join(' · ')}{s.ejercicios.length > 3 ? ` +${s.ejercicios.length - 3} más` : ''}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="db-row-detail" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {r.ejercicios.slice(0, 5).map(e => <span key={e.nombre} className="dish-pill">{e.nombre} {e.series}x{e.repeticiones}</span>)}
                    {r.ejercicios.length > 5 && <span style={{ color: 'var(--color-dim)', fontSize: 10 }}>+{r.ejercicios.length - 5} más</span>}
                  </div>
                )}
                <button onClick={() => { const session = r.sesiones.length > 0 ? r.sesiones[0] : null; const exs = session ? session.ejercicios : r.ejercicios; const name = session ? `${r.nombre} - ${session.nombre}` : r.nombre; startSession(name, exs.map(e => ({ name: e.nombre, group: e.grupo_muscular, color: EXERCISE_COLORS[e.grupo_muscular] || '#e07a5f', sets: e.series, restSeconds: e.descanso_seg }))) }} className="db-row-cta full-orange">
                  <Play size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  Empezar esta rutina
                </button>
                {r.sesiones.length > 1 && (
                  <button onClick={() => { setWeeklyModal(r.id) }} className="db-row-cta ghost">
                    <Calendar size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    Programar semanal
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="db-row-count">
            {filterRoutines({ objetivo: dbObj || undefined, nivel: dbNivel || undefined, lugar: dbLugar || undefined, search: dbSearch2 || undefined }).length} de {ROUTINES.length} rutinas
          </div>
        </div>

        <div className="section-head" style={{ marginTop: 16 }}>
          <span className="lbl">Mis rutinas</span>
        </div>
        {routines.map(r => (
          <div key={r.id} className="routine-card">
            <div className="routine-card-head">
              <div className="routine-card-icon">
                <Dumbbell size={20} aria-hidden="true" />
              </div>
              <div className="routine-card-spacer">
                <div className="routine-card-name">{r.name}</div>
                <div className="routine-card-meta">{r.exercises.length} ejercicios</div>
              </div>
              <button onClick={() => startSession(r.name, r.exercises)} className="routine-card-cta">
                <Play size={14} aria-hidden="true" />
              </button>
              <button title="Compartir en comunidad" onClick={() => setSharePost(routineToPost(r))} aria-label="Compartir rutina" className="hist-icon-btn purple" style={{ width: 32, height: 32 }}>
                <Share2 size={14} aria-hidden="true" />
              </button>
              <button onClick={() => deleteRoutine(r.id)} aria-label="Eliminar rutina" className="hist-icon-btn danger" style={{ width: 32, height: 32 }}>
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
        {routines.length === 0 && <div className="meal-empty">Sin rutinas. Crea la primera.</div>}

        <div className="start-card" style={{ marginTop: 8 }}>
          <div className="start-card-title">Crear rutina</div>
          <Input value={rtnName} onChange={setRtnName} placeholder="Nombre (ej: Pecho & Tríceps)" className="mb-2" />
          <div style={{ marginBottom: 8 }}>
            {builderExs.map((ex, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                <div className="dot" style={{ width: 8, height: 8, borderRadius: '50%', background: ex.color }} aria-hidden="true" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{ex.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 2 }}>{ex.sets} series · {ex.group}</div>
                </div>
                <button onClick={() => setBuilderExs(prev => prev.filter((_, ii) => ii !== i))} aria-label="Quitar ejercicio" className="meal-action" style={{ width: 28, height: 28 }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <select
              onChange={e => {
                const ex = allExercises.find(x => x.name === e.target.value)
                if (ex) setBuilderExs(prev => [...prev, { name: ex.name, group: ex.group, color: EXERCISE_COLORS[ex.group] || 'var(--color-acc-orange)', sets: 3 }])
              }}
              className="input-mini"
              style={{ flex: 1 }}
            >
              <option value="">+ Añadir ejercicio...</option>
              {allExercises.map(e => <option key={e.name} value={e.name}>{e.name}</option>)}
            </select>
          </div>
          <button
            onClick={() => { if (rtnName.trim() && builderExs.length) { saveRoutine(rtnName.trim(), builderExs); setRtnName(''); setBuilderExs([]) } }}
            className="fis-cta"
            style={{ background: 'var(--color-acc-orange)' }}
          >Guardar rutina</button>
        </div>

        {weeklyModal && <WeeklyModal routineId={weeklyModal} onClose={() => setWeeklyModal(null)} />}
      </div>
    )
  }

  if (sub === 'library') {
    return (
      <div className="animate-tab">
        {subBar}

        <div className="nut-card" style={{ marginBottom: 12 }}>
          <button onClick={() => setShowAddEx(v => !v)}
            className="nut-card-head" style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <span className="nut-card-title" style={{ color: 'var(--color-acc-orange)' }}>+ Añadir ejercicio propio</span>
            <span style={{ color: 'var(--color-dim)', fontSize: 12 }}>{showAddEx ? '▲' : '▼'}</span>
          </button>
          {showAddEx && (
            <div className="nut-card-pad" style={{ borderTop: '1px solid var(--color-border)' }}>
              <Input value={cexName} onChange={setCexName} placeholder="Nombre del ejercicio" className="mb-2" />
              <div className="register-grid-2">
                <select value={cexGroup} onChange={e => setCexGroup(e.target.value)} className="input-mini">
                  {EXERCISE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select value={cexEquip} onChange={e => setCexEquip(e.target.value)} className="input-mini">
                  <option value="">Material…</option>
                  {EQUIPMENT_TYPES.map(eq => <option key={eq} value={eq}>{EQUIPMENT_LABELS[eq]}</option>)}
                </select>
              </div>
              <div style={{ marginTop: 8 }}>
                <button onClick={() => { if (cexName.trim()) { addCustomExercise({ name: cexName.trim(), group: cexGroup, equipment: cexEquip || undefined }); setCexName(''); setCexEquip(''); toast.show('✓ Ejercicio añadido'); setShowAddEx(false) } }}
                  className="fis-cta" style={{ background: 'var(--color-acc-orange)' }}>Guardar ejercicio</button>
              </div>
            </div>
          )}
        </div>

        <div className="lib-pill-row">
          <button onClick={() => setLibGroup('')} className={`lib-pill${libGroup === '' ? ' active' : ''}`}>Todos</button>
          {EXERCISE_GROUPS.map(g => (
            <button key={g} onClick={() => setLibGroup(g === libGroup ? '' : g)} className={`lib-pill${libGroup === g ? ' active' : ''}`}>{g}</button>
          ))}
        </div>
        {(() => {
          const libExercises = allExercises.filter(ex => !libGroup || ex.group === libGroup)
          return (
            <div className="nut-card">
              {libExercises.length === 0 ? (
                <div className="meal-empty">Sin ejercicios de {libGroup}.</div>
              ) : libExercises.map(ex => (
                <div key={ex.name} className="lib-row">
                  <div className="dot" style={{ background: EXERCISE_COLORS[ex.group] || 'var(--color-acc-orange)' }} aria-hidden="true" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{ex.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 2 }}>{ex.group}</div>
                  </div>
                </div>
              ))}
            </div>
          )
        })()}
      </div>
    )
  }

  if (sub === 'progress') {
    const { prs } = useFisicoStore.getState()

    if (sessions.length === 0) {
      return (
        <div className="animate-tab">
          {subBar}
          <div className="empty-state">
            <div style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto 14px', background: 'color-mix(in srgb, var(--color-acc-orange) 14%, transparent)', color: 'var(--color-acc-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden="true">
              <ActivityIcon size={28} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>Sin datos todavía</div>
            <div>Registra sesiones de entrenamiento para ver gráficos.</div>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div className="prog-stat-card">
            <div className="lbl">Sesiones totales</div>
            <div className="big" style={{ color: 'var(--color-acc-orange)' }}>{sessions.length}</div>
          </div>
          <div className="prog-stat-card">
            <div className="lbl">Kg totales</div>
            <div className="big" style={{ color: 'var(--color-acc-blue)' }}>{Math.round(sessions.reduce((s, x) => s + x.totalKg, 0))}</div>
          </div>
        </div>

        <button onClick={async () => {
          const text = shareSummary()
          const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> }
          if (nav.share) { try { await nav.share({ text }) } catch { /* cancelado */ } }
          else { try { await navigator.clipboard.writeText(text); toast.show('✓ Resumen copiado al portapapeles') } catch { toast.show('No se pudo copiar') } }
        }} className="share-row">
          <Share2 size={14} aria-hidden="true" /> Compartir resumen de fuerza
        </button>

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
            <div className="nut-card" style={{ padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-sub)', letterSpacing: '0.3px' }}>Progreso por ejercicio</span>
                <select value={sel} onChange={e => setProgEx(e.target.value)}
                  className="ex-foot-select" style={{ maxWidth: 200 }}>
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
                  <div className="prog-spread">
                    <span>Primer: {points[0].w} {unit}</span>
                    <b>Máx: {best} {unit}</b>
                    <span>Último: {points[points.length - 1].w} {unit}</span>
                  </div>
                </>
              )}
            </div>
          )
        })()}

        {(() => {
          const analysis = getMuscleAnalysis().filter(a => a.sets > 0).sort((a, b) => b.sets - a.sets)
          if (analysis.length === 0) return null
          const maxSets = Math.max(...analysis.map(a => a.sets), 1)
          return (
            <div className="nut-card" style={{ padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-sub)', letterSpacing: '0.3px', marginBottom: 12 }}>Series por grupo muscular</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {analysis.map(a => (
                  <div key={a.group} className="prog-muscle-row">
                    <span className="name">{a.group}</span>
                    <div className="prog-muscle-track">
                      <div className="prog-muscle-fill" style={{ width: `${Math.round(a.sets / maxSets * 100)}%`, background: a.color }} />
                    </div>
                    <span className="prog-muscle-val">{a.sets}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-dim)', marginTop: 10 }}>Series completadas · histórico total</div>
            </div>
          )
        })()}

        <div className="nut-card" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-sub)', letterSpacing: '0.3px', marginBottom: 10 }}>Calendario de entrenamiento</div>
          <div className="prog-cal">
            {['L','M','X','J','V','S','D'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: 'var(--color-dim)', padding: '2px 0' }}>{d}</div>)}
            {Array.from({ length: new Date(Date.now() - 29 * 86400000).getDay() === 0 ? 6 : (new Date(Date.now() - 29 * 86400000).getDay() - 1) }, (_, i) => (
              <div key={`e${i}`} style={{ aspectRatio: '1' }} />
            ))}
            {calDays.map((d, i) => (
              <div key={i} className="prog-cal-cell"
                style={{
                  background: d.hasSession ? 'color-mix(in srgb, var(--color-acc-orange) 30%, transparent)' : 'color-mix(in srgb, var(--color-ink) 6%, transparent)',
                  fontWeight: d.isToday ? 700 : 500,
                  color: d.hasSession ? 'var(--color-acc-orange)' : 'var(--color-dim)',
                  outline: d.isToday ? '1.5px solid var(--color-ink)' : 'none',
                }}>{d.day}</div>
            ))}
          </div>
        </div>

        <div className="nut-card" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-sub)', letterSpacing: '0.3px', marginBottom: 10 }}>Volumen (kg totales)</div>
          <div className="prog-vol">
            {last12.map((s, i) => {
              const h = Math.max(3, (s.totalKg / maxKg) * 76)
              return (
                <div key={i} className="prog-vol-col">
                  <div className="prog-vol-bar" style={{ height: h }} title={`${s.date}: ${Math.round(s.totalKg)} kg`} />
                  <span className="prog-vol-lbl">{labels[i]}</span>
                </div>
              )
            })}
          </div>
        </div>

        {prs.length > 0 && (
          <>
            <div className="nut-card" style={{ padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-sub)', letterSpacing: '0.3px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Award size={14} aria-hidden="true" style={{ color: 'var(--color-acc-gold)' }} /> Récords personales
              </div>
              {prs.map((pr, i) => (
                <div key={i} className="pr-row">
                  <Award size={18} aria-hidden="true" style={{ color: 'var(--color-acc-gold)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{pr.exercise}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-dim)' }}>{pr.date}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="val">{pr.weight} kg</div>
                    <div className="reps">{pr.reps} reps</div>
                  </div>
                  <button title="Compartir en comunidad" onClick={() => setSharePost(prToPost(pr, unit))} aria-label="Compartir récord" className="hist-icon-btn purple" style={{ width: 26, height: 26 }}>
                    <Share2 size={12} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <div className="nut-card" style={{ padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-sub)', letterSpacing: '0.3px', marginBottom: 10 }}>Calculadora 1RM</div>
              <div style={{ fontSize: 11, color: 'var(--color-sub)', marginBottom: 10 }}>Estima tu repetición máxima basada en un set</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <input className="input-mini" id="1rm-weight" type="number" placeholder="Peso (kg)" />
                <input className="input-mini" id="1rm-reps" type="number" placeholder="Reps" />
              </div>
              <button onClick={() => {
                const w = parseFloat((document.getElementById('1rm-weight') as HTMLInputElement)?.value || '0')
                const r = parseInt((document.getElementById('1rm-reps') as HTMLInputElement)?.value || '0')
                if (!w || !r) { toast.show('Introduce peso y reps'); return }
                const rm = Math.round(w * (1 + r / 30))
                toast.show(`🏋️ 1RM estimado: ${rm} kg`)
              }} className="fis-secondary" style={{ background: 'color-mix(in srgb, var(--color-acc-orange) 10%, transparent)', color: 'var(--color-acc-orange)', borderColor: 'color-mix(in srgb, var(--color-acc-orange) 24%, transparent)' }}>
                Calcular 1RM
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return null
}

/* Hoja "Añadir ejercicio" — extraída para reutilizar el estilo IMPULSO. */
function ExercisePicker({ open, onClose, allExercises, equipFilter, setEquipFilter, onPick }: {
  open: boolean
  onClose: () => void
  allExercises: { name: string; group: string; equipment?: string }[]
  equipFilter: string
  setEquipFilter: (v: string) => void
  onPick: (ex: { name: string; group: string }) => void
}) {
  if (!open) return null
  return createPortal(
    <div className="ex-picker" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ex-picker-sheet">
        <div className="ex-picker-handle" aria-hidden="true" />
        <div className="ex-picker-head">
          <div className="ex-picker-title">Añadir ejercicio</div>
          <button onClick={onClose} aria-label="Cerrar" className="ex-picker-close">✕</button>
        </div>
        <div style={{ padding: '0 18px 10px' }}>
          <input className="input-mini" placeholder="Buscar ejercicio..." onChange={(e) => {
            const val = e.target.value.toLowerCase()
            const items = document.querySelectorAll('[data-ex-name]')
            items.forEach(el => {
              const name = (el as HTMLElement).dataset.exName?.toLowerCase() || ''
              ;(el as HTMLElement).style.display = val ? (name.includes(val) ? '' : 'none') : ''
            })
          }} />
          <div className="ex-picker-filters">
            <button onClick={() => setEquipFilter('')} className={`ex-picker-pill${!equipFilter ? ' active' : ''}`}>Todo</button>
            {EQUIPMENT_TYPES.map(eq => (
              <button key={eq} onClick={() => setEquipFilter(eq)} className={`ex-picker-pill${equipFilter === eq ? ' active' : ''}`}>{EQUIPMENT_LABELS[eq]}</button>
            ))}
          </div>
        </div>
        <div className="ex-picker-body">
          {EXERCISE_GROUPS.map(group => {
            const filtered = allExercises.filter(e => e.group === group && (!equipFilter || e.equipment === equipFilter))
            if (!filtered.length) return null
            return (
              <div key={group}>
                <div className="ex-picker-group">{group}</div>
                {filtered.map(ex => (
                  <div key={ex.name} data-ex-name={ex.name} onClick={() => onPick(ex)} className="ex-picker-row">
                    <span className="dot" style={{ background: EXERCISE_COLORS[ex.group] || 'var(--color-acc-orange)' }} aria-hidden="true" />
                    <span className="name">{ex.name}</span>
                    {ex.equipment && <span className="ex-picker-tag">{EQUIPMENT_LABELS[ex.equipment]}</span>}
                  </div>
                ))}
              </div>
            )
          })}
          <div style={{ padding: '14px 18px' }}>
            <button onClick={onClose} className="fis-secondary" style={{ width: '100%' }}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>, document.body
  )
}

/* Programar semanal — hoja modal (mantiene comportamiento legacy). */
function WeeklyModal({ routineId, onClose }: { routineId: string; onClose: () => void }) {
  const r = ROUTINES.find(r => r.id === routineId)
  const toast = useToast()
  const [wMap, setWMap] = useState<Record<number, number>>({})
  if (!r) return null
  const DOW = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
  return createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      className="ex-picker">
      <div className="ex-picker-sheet" style={{ maxWidth: 520, overflowY: 'auto', padding: '20px 20px calc(24px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="ex-picker-handle" aria-hidden="true" />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 4, color: 'var(--color-text)' }}>Programar semanal</div>
        <div style={{ fontSize: 13, color: 'var(--color-sub)', marginBottom: 16 }}>{r.nombre} · {r.sesiones.length} sesiones</div>
        {DOW.map((day, di) => (
          <div key={di} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', minWidth: 80 }}>{day}</span>
            <select className="input-mini" value={wMap[di] ?? -1} onChange={e => {
              const v = parseInt(e.target.value)
              setWMap(prev => v >= 0 ? { ...prev, [di]: v } : Object.fromEntries(Object.entries(prev).filter(([k]) => +k !== di)))
            }} style={{ flex: 1, marginBottom: 0 }}>
              <option value={-1}>— Descanso —</option>
              {r.sesiones.map((s, si) => <option key={si} value={si}>{s.nombre} ({s.ejercicios.length} ejercicios)</option>)}
            </select>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
          <button onClick={onClose} className="fis-secondary" style={{ width: '100%' }}>Cancelar</button>
          <button onClick={() => {
            if (Object.keys(wMap).length > 0) {
              useFisicoStore.getState().setWeeklyProgram({ routineId: r.id, dayMapping: wMap })
              toast.show('✓ Programa semanal activado')
            }
            onClose()
          }} className="fis-cta">Activar programa</button>
        </div>
      </div>
    </div>, document.body
  )
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
    e.target.value = ''
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div className="run-stat">
          <div className="run-stat-lbl">Km totales</div>
          <div className="run-stat-big" style={{ color: 'var(--color-acc-blue)' }}>{totalKm.toFixed(1)}</div>
          <div className="run-stat-sub">{totalRuns} carreras</div>
        </div>
        <div className="run-stat">
          <div className="run-stat-lbl">Tiempo total</div>
          <div className="run-stat-big" style={{ color: 'var(--color-acc-green)' }}>{formatTime(totalTime)}</div>
          <div className="run-stat-sub">acumulado</div>
        </div>
      </div>

      <div className="start-card">
        <div className="start-card-title">Registrar carrera</div>
        <div className="register-grid-2">
          <Input value={dist} onChange={setDist} type="number" step="0.01" placeholder="Distancia (km)" />
          <Input value={time} onChange={setTime} placeholder="Tiempo (mm:ss)" />
        </div>
        <div className="register-grid-2" style={{ marginTop: 8 }}>
          <Input value={runHr} onChange={setRunHr} type="number" placeholder="FC media (bpm)" />
          <Input value={runElev} onChange={setRunElev} type="number" placeholder="Desnivel + (m)" />
        </div>
        <div className="register-grid-2" style={{ marginTop: 8 }}>
          <Input value={runDate} onChange={setRunDate} type="date" />
          <select value={runType} onChange={e => setRunType(e.target.value)} className="input-mini">
            <option value="easy">Rodaje suave</option>
            <option value="tempo">Tempo / Umbral</option>
            <option value="interval">Series / Intervalos</option>
            <option value="long">Tirada larga</option>
            <option value="race">Competición</option>
            <option value="trail">Trail / montaña</option>
          </select>
        </div>
        <div style={{ marginTop: 8 }}>
          <Input value={runNotes} onChange={setRunNotes} placeholder="Notas (sensaciones, ruta...)" />
        </div>
        <div style={{ marginTop: 8 }}>
          <button onClick={handleAdd} className="fis-cta" style={{ background: 'var(--color-acc-blue)' }}>
            <Check size={14} aria-hidden="true" /> Guardar carrera
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept=".gpx,.tcx" onChange={handleFile} style={{ display: 'none' }} />
        <button onClick={() => fileInputRef.current?.click()} className="fis-secondary" style={{ width: '100%', marginTop: 8, background: 'color-mix(in srgb, var(--color-acc-blue) 10%, transparent)', color: 'var(--color-acc-blue)', borderColor: 'color-mix(in srgb, var(--color-acc-blue) 24%, transparent)' }}>
          <Upload size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 6 }} /> Importar actividad (GPX/TCX)
        </button>
      </div>

      <Modal open={!!preview} onClose={() => setPreview(null)} title="Importar actividad">
        {preview && (
          <div style={{ padding: '0 20px 8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div className="preview-stat">
                <div className="lbl">Distancia</div>
                <div className="big" style={{ color: 'var(--color-acc-blue)' }}>{(Math.round(preview.distanceKm * 10) / 10).toFixed(1)}<span style={{ fontSize: 12, color: 'var(--color-dim)' }}> km</span></div>
              </div>
              <div className="preview-stat">
                <div className="lbl">Tiempo</div>
                <div className="big" style={{ color: 'var(--color-acc-green)' }}>{formatTime(preview.timeSeconds)}</div>
              </div>
              <div className="preview-stat">
                <div className="lbl">Ritmo</div>
                <div className="big" style={{ color: 'var(--color-text)', fontSize: 20 }}>{previewPace}</div>
              </div>
              <div className="preview-stat">
                <div className="lbl">FC media</div>
                <div className="big" style={{ color: 'var(--color-text)', fontSize: 20 }}>{preview.hr ? `${preview.hr}` : '—'}<span style={{ fontSize: 12, color: 'var(--color-dim)' }}>{preview.hr ? ' bpm' : ''}</span></div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-sub)', marginBottom: 14 }}>
              {new Date(preview.date + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              {preview.elevation ? ` · +${preview.elevation} m desnivel` : ''} · {preview.points} puntos
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPreview(null)} className="fis-secondary" style={{ flex: 1 }}>Cancelar</button>
              <button onClick={confirmImport} className="fis-cta" style={{ flex: 1, background: 'var(--color-acc-blue)' }}>Guardar carrera</button>
            </div>
          </div>
        )}
      </Modal>

      {sharePost && <ShareSheet post={sharePost} onClose={() => setSharePost(null)} />}
      <div className="section-head" style={{ marginTop: 14, marginBottom: 10 }}>
        <span className="lbl">Historial</span>
      </div>
      {runs.length === 0 ? (
        <div className="meal-empty">Sin carreras registradas.</div>
      ) : (
        runs.map((r, i) => (
          <div key={i} className="hist-list-item">
            <div className="hist-row">
              <div className="hist-datebox" style={{ background: 'color-mix(in srgb, var(--color-acc-blue) 12%, transparent)', borderColor: 'color-mix(in srgb, var(--color-acc-blue) 24%, transparent)' }}>
                <div className="d" style={{ color: 'var(--color-acc-blue)' }}>{r.date.slice(8)}</div>
                <div className="m" style={{ color: 'var(--color-acc-blue)' }}>{['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][new Date(r.date + 'T12:00').getMonth()]}</div>
              </div>
              <div className="hist-spacer">
                <div className="hist-title">{r.distance} km · {formatTime(r.timeSeconds)}</div>
                <div className="hist-meta">{r.type} {r.hr ? '· ' + r.hr + ' bpm' : ''}{r.elevation ? ' · +' + r.elevation + 'm' : ''}</div>
              </div>
              <button title="Compartir en comunidad" onClick={() => setSharePost(runToPost(r))} className="hist-icon-btn purple" aria-label="Compartir carrera">
                <Share2 size={14} aria-hidden="true" />
              </button>
              <button onClick={() => deleteRun(i)} className="hist-icon-btn danger" aria-label="Borrar carrera">
                <Trash2 size={14} aria-hidden="true" />
              </button>
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
    { v: 'full', l: 'Cuerpo completo' }, { v: 'upper', l: 'Tren superior' },
    { v: 'lower', l: 'Tren inferior' }, { v: 'spine', l: 'Columna y core' },
    { v: 'hips', l: 'Caderas' }, { v: 'shoulders', l: 'Hombros' },
    { v: 'morning', l: 'Rutina matutina' }, { v: 'night', l: 'Rutina nocturna' },
  ]

  const mobBar = (
    <ChipTabs variant="line" color="var(--color-acc-purple)" value={mobSub} onChange={setMobSub} items={MOBILITY_SUBS} />
  )

  if (mobSub === 'session') {
    return (
      <div className="animate-tab">
        {mobBar}
        {!activeSession ? (
          <div className="start-card">
            <div className="start-card-title">Elegir rutina</div>
            <select
              onChange={e => {
                const r = mobRoutines.find(r => r.id === +e.target.value)
                if (r) startMobSession(r.name, r.exercises.map(e => ({ name: e.name, duration: e.duration })))
              }}
              className="input-mini" style={{ marginBottom: 10 }}
            >
              <option value="">— Selecciona una rutina —</option>
              {mobRoutines.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button onClick={() => startMobSession('Sesión libre', [])} className="fis-secondary" style={{ width: '100%', background: 'color-mix(in srgb, var(--color-acc-purple) 14%, transparent)', color: 'var(--color-acc-purple)', borderColor: 'color-mix(in srgb, var(--color-acc-purple) 26%, transparent)' }}>
              <Play size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 6 }} /> Sesión libre
            </button>
          </div>
        ) : (
          <div className="mob-card violet" style={{ padding: 0 }}>
            <div className="mob-head">
              <div>
                <div className="name">{activeSession.name}</div>
                <div className="meta">
                  <span className="count">
                    <strong>{activeSession.exercises.filter(e => e.done).length}</strong>
                  </span> / {activeSession.exercises.length} ejercicios
                </div>
              </div>
              <button onClick={cancelMobSession} className="fis-secondary danger">Cancelar</button>
            </div>
            <div className="mob-progress">
              <div className="mob-progress-fill" style={{ width: `${activeSession.exercises.length ? Math.round(activeSession.exercises.filter(e => e.done).length / activeSession.exercises.length * 100) : 0}%` }} />
            </div>
            {activeSession.exercises.map((ex, i) => (
              <div
                key={i}
                onClick={() => toggleMobExercise(i)}
                className={`mob-row${ex.done ? ' done' : ''}`}
                role="button" tabIndex={0} aria-pressed={ex.done}
              >
                <div className={`indicator${ex.done ? ' done' : ' pending'}`} aria-hidden="true" />
                <span className="name">{ex.name}</span>
                {ex.done && <Check size={14} aria-hidden="true" style={{ color: 'var(--color-acc-green)' }} />}
              </div>
            ))}
            <div style={{ padding: 14, borderTop: '1px solid var(--color-border)' }}>
              <button onClick={finishMobSession} className="fis-secondary" style={{ width: '100%', background: 'color-mix(in srgb, var(--color-acc-purple) 14%, transparent)', color: 'var(--color-acc-purple)', borderColor: 'color-mix(in srgb, var(--color-acc-purple) 26%, transparent)' }}>
                <Check size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 6 }} /> Guardar sesión
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (mobSub === 'routines') {
    const ejerciciosLabel = `Ejercicios (${builderExs.length})`
    return (
      <div className="animate-tab">
        {mobBar}
        <div className="start-card" style={{ marginBottom: 12 }}>
          <div className="start-card-title">Nueva rutina</div>
          <Input value={rtnName} onChange={setRtnName} placeholder="Nombre de la rutina..." className="mb-2" />
          <select value={rtnFocus} onChange={e => setRtnFocus(e.target.value)} className="input-mini" style={{ marginBottom: 8 }}>
            {FOCUS_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <Input value={exName} onChange={setExName} placeholder="Nombre del ejercicio" className="flex-1 mb-0" />
            <button onClick={() => { if (exName.trim()) { setBuilderExs(prev => [...prev, { name: exName.trim(), duration: 60 }]); setExName('') } }}
              className="fis-secondary" style={{ background: 'color-mix(in srgb, var(--color-acc-purple) 14%, transparent)', color: 'var(--color-acc-purple)', borderColor: 'color-mix(in srgb, var(--color-acc-purple) 26%, transparent)', padding: '11px 14px' }}>+</button>
          </div>
          {builderExs.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>{ejerciciosLabel}</div>
              {builderExs.map((ex, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ flex: 1, fontSize: 13, color: 'var(--color-text)' }}>{ex.name}</div>
                  <button onClick={() => setBuilderExs(prev => prev.filter((_, ii) => ii !== i))} aria-label="Quitar ejercicio" className="meal-action">✕</button>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => {
            if (rtnName.trim() && builderExs.length) {
              addMobRoutine({ id: Date.now(), name: rtnName.trim(), focus: rtnFocus, exercises: builderExs })
              setRtnName(''); setBuilderExs([])
            }
          }} className="fis-cta" style={{ background: 'var(--color-acc-purple)' }}>Guardar rutina</button>
        </div>

        <div className="section-head" style={{ marginBottom: 10 }}>
          <span className="lbl">Mis rutinas</span>
        </div>
        {mobRoutines.length === 0 ? (
          <div className="meal-empty">Sin rutinas de movilidad.</div>
        ) : (
          mobRoutines.map(r => (
            <div key={r.id} className="routine-card">
              <div className="routine-card-head">
                <div className="mob-tile-icon">
                  <ActivityIcon size={20} aria-hidden="true" />
                </div>
                <div className="routine-card-spacer">
                  <div className="routine-card-name">{r.name}</div>
                  <div className="routine-card-meta">{r.exercises.length} ejercicios</div>
                </div>
                <button onClick={() => startMobSession(r.name, r.exercises)} className="routine-card-cta" style={{ background: 'color-mix(in srgb, var(--color-acc-purple) 14%, transparent)', color: 'var(--color-acc-purple)', border: '1px solid color-mix(in srgb, var(--color-acc-purple) 26%, transparent)' }}>
                  <Play size={14} aria-hidden="true" />
                </button>
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
        <div className="section-head" style={{ marginBottom: 10 }}>
          <span className="lbl">Historial de sesiones</span>
        </div>
        {mobSessions.length === 0 ? (
          <div className="meal-empty">Sin sesiones registradas.</div>
        ) : (
          mobSessions.map((s, i) => (
            <div key={i} className="hist-list-item">
              <div className="hist-row">
                <div className="mob-tile-icon">
                  <ActivityIcon size={20} aria-hidden="true" />
                </div>
                <div className="hist-spacer">
                  <div className="hist-title">{s.routineName}</div>
                  <div className="hist-meta">{s.date} · {s.exercises.filter(e => e.done).length}/{s.exercises.length}</div>
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
const SECTIONS = [
  { key: 'strength', label: 'Fuerza', color: 'var(--color-acc-orange)' },
  { key: 'running', label: 'Running', color: 'var(--color-acc-blue)' },
  { key: 'mobility', label: 'Movilidad', color: 'var(--color-acc-purple)' },
  { key: 'health', label: 'Salud', color: 'var(--color-red)' },
] as const
const STRENGTH_SUBS = [
  { key: 'today', label: 'Hoy' }, { key: 'history', label: 'Historial' }, { key: 'routines', label: 'Rutinas' },
  { key: 'library', label: 'Ejercicios' }, { key: 'progress', label: 'Progreso' },
] as const
const MOBILITY_SUBS = [
  { key: 'session', label: 'Sesión' }, { key: 'routines', label: 'Rutinas' }, { key: 'history', label: 'Historial' },
] as const

export default function Fisico() {
  const [section, setSection] = useState<'strength' | 'running' | 'mobility' | 'health'>('strength')

  return (
    <div>
      <div className="page-header fis-head">
        <div className="page-title">Físico</div>
        <div className="fis-tabs-row">
          <ChipTabs value={section} onChange={setSection} items={SECTIONS} />
        </div>
      </div>

      <div key={section} className="animate-tab" style={{ padding: '14px 14px 0' }}>
        {section === 'strength' && <StrengthTab />}
        {section === 'running' && <RunningTab />}
        {section === 'mobility' && <MobilityTab />}
        {section === 'health' && <HealthTab />}
      </div>
    </div>
  )
}
