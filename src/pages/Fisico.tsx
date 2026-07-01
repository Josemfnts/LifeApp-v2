import { useState, useEffect, useRef } from 'react'
import { useFisicoStore, type RunRecord } from '@/stores/fisicoStore'
import type { Routine, SessionExercise, MobRoutine } from '@/stores/fisicoStore'
import { Input, Button } from '@/components/ui'
import { EXERCISES_DB, EXERCISE_GROUPS, EXERCISE_COLORS } from '@/data/exercises'

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
  const activeSession = useFisicoStore(s => s.activeSession)
  const startSession = useFisicoStore(s => s.startSession)
  const addExerciseToSession = useFisicoStore(s => s.addExerciseToSession)
  const updateSet = useFisicoStore(s => s.updateSet)
  const finishSession = useFisicoStore(s => s.finishSession)
  const cancelSession = useFisicoStore(s => s.cancelSession)
  const deleteSession = useFisicoStore(s => s.deleteSession)
  const saveRoutine = useFisicoStore(s => s.saveRoutine)
  const deleteRoutine = useFisicoStore(s => s.deleteRoutine)
  const addCustomExercise = useFisicoStore(s => s.addCustomExercise)
  const startTimer = useFisicoStore(s => s.startTimer)
  const stopTimer = useFisicoStore(s => s.stopTimer)
  const t = useTimer()

  const [rtnName, setRtnName] = useState('')
  const [builderExs, setBuilderExs] = useState<{ name: string; group: string; color: string; sets: number }[]>([])
  const [showExPicker, setShowExPicker] = useState(false)
  const [cexName, setCexName] = useState('')
  const [cexGroup, setCexGroup] = useState('Pecho')
  const [selRoutine, setSelRoutine] = useState('')
  const [restPreset, setRestPreset] = useState(90)
  const [notes, setNotes] = useState('')

  const allExercises = [...EXERCISES_DB, ...customExercises]
  const todayStr = new Date().toISOString().slice(0, 10)
  const todaySessions = sessions.filter(s => s.date === todayStr)
  const todayKg = todaySessions.reduce((s, x) => s + x.totalKg, 0)
  const todaySets = todaySessions.reduce((s, x) => s + x.exercises.reduce((ss, ex) => ss + ex.sets.length, 0), 0)

  /* ── TODAY / ACTIVE SESSION ── */
  if (sub === 'today') {
    return (
      <div className="animate-tab">
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-3.5 text-center relative overflow-hidden">
            <div className="absolute top-0 left-[10%] right-[10%] h-0.5 rounded-b-sm bg-[#e07a5f]" />
            <div className="font-serif text-[26px] text-[#e07a5f] leading-none">{todayKg}</div>
            <div className="text-[10px] font-semibold text-[var(--color-dim)] uppercase tracking-wide mt-1">kg totales</div>
          </div>
          <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-3.5 text-center relative overflow-hidden">
            <div className="absolute top-0 left-[10%] right-[10%] h-0.5 rounded-b-sm bg-[#5b8af0]" />
            <div className="font-serif text-[26px] text-[#5b8af0] leading-none">{todaySets}</div>
            <div className="text-[10px] font-semibold text-[var(--color-dim)] uppercase tracking-wide mt-1">series</div>
          </div>
          <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-3.5 text-center relative overflow-hidden">
            <div className="absolute top-0 left-[10%] right-[10%] h-0.5 rounded-b-sm bg-[#52b788]" />
            <div className="font-serif text-[26px] text-[#52b788] leading-none">{todaySessions.length}</div>
            <div className="text-[10px] font-semibold text-[var(--color-dim)] uppercase tracking-wide mt-1">sesiones</div>
          </div>
        </div>

        {/* Rest Timer */}
        {t && (
          <div className="bg-[#5b8af0]/[0.06] border border-[#5b8af0]/[0.2] rounded-2xl p-3.5 mb-3 flex flex-col">
            <div className="flex gap-1.5 mb-2.5">
              {[60, 90, 120, 180].map(s => (
                <button key={s} onClick={() => { setRestPreset(s); startTimer(s) }}
                  className={`flex-1 py-1 rounded-lg text-[11px] font-bold font-sans cursor-pointer border transition-all ${
                    restPreset === s ? 'bg-[#5b8af0]/15 text-[#5b8af0] border-[#5b8af0]/30' : 'bg-[var(--color-s2)] text-[var(--color-dim)] border-[var(--color-border)]'
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
                <div className="text-[11px] font-semibold text-[#5b8af0] uppercase tracking-wider mb-1.5">Descanso activo</div>
                <div className="font-serif text-[28px] leading-none">
                  {Math.floor(t.remaining / 60)}:{String(t.remaining % 60).padStart(2, '0')}
                </div>
              </div>
            </div>
            <div className="flex gap-1.5 mt-2.5">
              <button onClick={() => startTimer(restPreset)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#52b788]/10 text-[#52b788] border border-[#52b788]/20 font-sans cursor-pointer">↺ Reset</button>
              <button onClick={stopTimer} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/[0.1] text-[var(--color-red)] border border-red-500/[0.15] font-sans cursor-pointer">✕ Parar</button>
            </div>
          </div>
        )}

        {!activeSession ? (
          <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mb-3">
            <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2.5">Iniciar sesión</div>
            <select
              value={selRoutine}
              onChange={e => setSelRoutine(e.target.value)}
              className="w-full bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3.5 py-2.5 text-sm font-sans mb-2 outline-none cursor-pointer"
            >
              <option value="">— Sesión libre —</option>
              {routines.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => {
                const rtn = routines.find(r => r.id === +selRoutine)
                startSession(rtn?.name || 'Sesión libre', rtn?.exercises || [])
              }} className="py-2.5 rounded-xl font-semibold text-sm font-sans cursor-pointer bg-[var(--color-acc-blue)] text-white border-[var(--color-acc-blue)] shadow-lg shadow-[#5b8af0]/25">
                ▶ Empezar
              </button>
              <button onClick={() => startSession('Sesión libre')} className="py-2.5 rounded-xl font-semibold text-sm font-sans cursor-pointer bg-[var(--color-s2)] text-[var(--color-sub)] border border-[var(--color-border)]">
                Libre
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-bold text-[var(--color-text)]">{activeSession.name}</div>
              <button onClick={finishSession} className="px-4 py-2 rounded-xl bg-[#52b788]/10 text-[#52b788] border border-[#52b788]/20 text-[13px] font-semibold font-sans cursor-pointer">Finalizar ✓</button>
            </div>

            {activeSession.exercises.map((ex, ei) => (
              <div key={ei} className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl overflow-hidden mb-2.5">
                <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-[var(--color-border)]">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ex.color }} />
                  <div className="flex-1 text-[15px] font-semibold text-[var(--color-text)]">{ex.name}</div>
                  <div className="text-[10px] font-semibold text-[var(--color-dim)] uppercase tracking-wider">{ex.group}</div>
                </div>

                <div className="grid grid-cols-[28px_1fr_1fr_1fr_36px] gap-1.5 px-3.5 py-2 text-[10px] font-semibold text-[var(--color-dim)] uppercase tracking-wider border-b border-white/[0.03]">
                  <div className="text-left">#</div><div>Peso</div><div>Reps</div><div>✓</div><div></div>
                </div>

                {ex.sets.map((set, si) => (
                  <div key={si} className={`grid grid-cols-[28px_1fr_1fr_1fr_36px] gap-1.5 px-3.5 py-2 items-center border-b border-white/[0.03] last:border-b-0 ${set.done ? 'bg-[#52b788]/[0.04]' : ''}`}>
                    <div className="text-[11px] font-bold text-[var(--color-dim)]">{si + 1}</div>
                    <input
                      type="number"
                      value={set.weight || ''}
                      onChange={e => updateSet(ei, si, { weight: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg px-2 py-1.5 text-xs font-sans outline-none text-center"
                      placeholder="kg"
                    />
                    <input
                      type="number"
                      value={set.reps || ''}
                      onChange={e => updateSet(ei, si, { reps: parseInt(e.target.value) || 0 })}
                      className="w-full bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg px-2 py-1.5 text-xs font-sans outline-none text-center"
                      placeholder="reps"
                    />
                    <button
                      onClick={() => { updateSet(ei, si, { done: !set.done }); if (!set.done) startTimer(restPreset) }}
                      className={`w-7 h-7 rounded-lg mx-auto flex items-center justify-center text-xs cursor-pointer border-1.5 ${
                        set.done ? 'bg-[#166534] border-[#52b788] text-[#4ade80]' : 'border-[var(--color-border2)]'
                      }`}
                    >{set.done ? '✓' : ''}</button>
                    <button onClick={() => {/* remove set */}} className="text-[var(--color-dim)] text-xs hover:text-red-400">✕</button>
                  </div>
                ))}

                <div className="flex gap-2 px-3.5 py-2.5 border-t border-white/[0.03] bg-[var(--color-s2)]">
                  <button onClick={() => {/* add set */}} className="text-xs text-[var(--color-sub)]">+ Añadir serie</button>
                </div>
              </div>
            ))}

            <button onClick={() => setShowExPicker(true)} className="w-full py-3.5 rounded-xl bg-[#e07a5f]/[0.08] text-[#e07a5f] border border-dashed border-[#e07a5f]/[0.25] text-sm font-semibold font-sans cursor-pointer mb-2">
              + Añadir ejercicio
            </button>

            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notas de la sesión (sensaciones, PR, lesiones...)"
              className="w-full bg-[var(--color-s1)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl p-3 text-[13px] font-sans resize-none h-[72px] outline-none mb-2"
            />

            <button onClick={cancelSession} className="w-full py-2.5 rounded-xl bg-red-500/[0.1] text-[var(--color-red)] border border-red-500/[0.15] text-sm font-semibold font-sans cursor-pointer">Cancelar sesión</button>
          </div>
        )}

        {/* Exercise picker modal (simplified) */}
        {showExPicker && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowExPicker(false) }}>
            <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-t-3xl w-full max-w-lg max-h-[70dvh] overflow-y-auto pb-8 animate-slideUp">
              <div className="flex justify-center pt-3 pb-1"><div className="w-9 h-1 bg-[var(--color-border2)] rounded-full" /></div>
              <div className="px-4 pt-2 pb-3 font-serif text-xl text-[var(--color-text)]">Añadir ejercicio</div>
              {EXERCISE_GROUPS.map(group => (
                <div key={group}>
                  <div className="px-4 py-2 text-[10px] font-bold text-[var(--color-dim)] uppercase tracking-[0.8px] bg-[var(--color-s1)] sticky top-0 z-10">{group}</div>
                  {allExercises.filter(e => e.group === group).map(ex => (
                    <div key={ex.name} onClick={() => { addExerciseToSession({ name: ex.name, group: ex.group, color: EXERCISE_COLORS[ex.group] || '#e07a5f', sets: 3 }); setShowExPicker(false) }}
                      className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] cursor-pointer active:bg-[var(--color-s2)]">
                      <div className="w-2 h-2 rounded-full" style={{ background: EXERCISE_COLORS[ex.group] || '#e07a5f' }} />
                      <span className="flex-1 text-sm font-medium text-[var(--color-text)]">{ex.name}</span>
                    </div>
                  ))}
                </div>
              ))}
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
        <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2.5">Sesiones recientes</div>
        {sessions.length === 0 ? (
          <div className="text-center py-12 text-[13px] text-[var(--color-dim)]">Sin sesiones registradas.</div>
        ) : (
          sessions.map((s, i) => (
            <div key={i} className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl mb-2 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="text-center bg-[#e07a5f]/10 border border-[#e07a5f]/20 rounded-xl px-3 py-2 flex-shrink-0">
                  <div className="font-serif text-[22px] text-[#e07a5f] leading-none">{s.date.slice(8)}</div>
                  <div className="text-[10px] font-bold text-[#e07a5f] uppercase tracking-[1px]">{['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][new Date(s.date + 'T12:00').getMonth()]}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-[var(--color-text)]">{s.name}</div>
                  <div className="text-xs text-[var(--color-sub)] mt-1">{s.duration} min · {s.exercises.length} ejercicios</div>
                </div>
                <div className="font-serif text-[22px] text-[#e07a5f] italic">{Math.round(s.totalKg)} kg</div>
                <button onClick={() => deleteSession(i)} className="w-7 h-7 rounded-lg bg-red-500/[0.08] text-[var(--color-red)] border border-red-500/[0.15] text-[11px] font-bold flex items-center justify-center cursor-pointer">✕</button>
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
        <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2.5">Mis rutinas</div>
        {routines.map(r => (
          <div key={r.id} className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl overflow-hidden mb-2">
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--color-border)]">
              <div className="w-10 h-10 rounded-xl bg-[#e07a5f]/10 border border-[#e07a5f]/20 flex items-center justify-center text-lg">🏋️</div>
              <div className="flex-1">
                <div className="text-[15px] font-semibold text-[var(--color-text)]">{r.name}</div>
                <div className="text-xs text-[var(--color-sub)] mt-0.5">{r.exercises.length} ejercicios</div>
              </div>
              <button onClick={() => startSession(r.name, r.exercises)} className="px-4 py-2 rounded-xl bg-[#e07a5f] text-white text-[13px] font-semibold font-sans cursor-pointer shadow-lg shadow-[#e07a5f]/25">▶</button>
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
                if (ex) setBuilderExs(prev => [...prev, { name: ex.name, group: ex.group, color: EXERCISE_COLORS[ex.group] || '#e07a5f', sets: 3 }])
              }}
              className="flex-1 bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3 py-2.5 text-sm font-sans outline-none cursor-pointer"
            >
              <option value="">+ Añadir ejercicio...</option>
              {allExercises.map(e => <option key={e.name} value={e.name}>{e.name}</option>)}
            </select>
          </div>
          <button
            onClick={() => { if (rtnName.trim() && builderExs.length) { saveRoutine(rtnName.trim(), builderExs); setRtnName(''); setBuilderExs([]) } }}
            className="w-full py-2.5 rounded-xl bg-[#e07a5f] text-white text-sm font-semibold font-sans cursor-pointer shadow-lg shadow-[#e07a5f]/25"
          >Guardar rutina</button>
        </div>
      </div>
    )
  }

  /* ── LIBRARY ── */
  if (sub === 'library') {
    return (
      <div className="animate-tab">
        <div className="flex gap-1.5 overflow-x-auto mb-3.5 pb-0.5">
          {EXERCISE_GROUPS.map(g => (
            <button key={g} className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--color-s1)] border border-[var(--color-border)] text-[var(--color-sub)] cursor-pointer whitespace-nowrap flex-shrink-0">{g}</button>
          ))}
        </div>
        <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
          {allExercises.map(ex => (
            <div key={ex.name} className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] last:border-b-0">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: EXERCISE_COLORS[ex.group] || '#e07a5f' }} />
              <div className="flex-1">
                <div className="text-sm font-medium text-[var(--color-text)]">{ex.name}</div>
                <div className="text-[11px] text-[var(--color-dim)] mt-0.5">{ex.group}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mt-3">
          <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2.5">Añadir ejercicio propio</div>
          <Input value={cexName} onChange={setCexName} placeholder="Nombre del ejercicio" className="mb-2" />
          <select value={cexGroup} onChange={e => setCexGroup(e.target.value)} className="w-full bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3.5 py-2.5 text-sm font-sans mb-2.5 outline-none cursor-pointer">
            {EXERCISE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <button onClick={() => { if (cexName.trim()) { addCustomExercise({ name: cexName.trim(), group: cexGroup }); setCexName('') } }}
            className="w-full py-2.5 rounded-xl bg-[#e07a5f] text-white text-sm font-semibold font-sans cursor-pointer shadow-lg shadow-[#e07a5f]/25">Guardar ejercicio</button>
        </div>
      </div>
    )
  }

  /* ── PROGRESS ── */
  if (sub === 'progress') {
    if (sessions.length === 0) {
      return (
        <div className="animate-tab">
          <div className="text-center py-16 text-[var(--color-dim)] text-sm">
            <div className="text-4xl mb-3">📊</div>
            <div className="font-semibold text-[var(--color-sub)] mb-2">Sin datos todavía</div>
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

    const ctx = document.createElement('canvas')
    // Instead of using react-chartjs-2 which has issues with ESM, we'll draw a simple SVG chart
    const maxKg = Math.max(...last12.map(s => s.totalKg), 1)
    const maxDur = Math.max(...last12.map(s => s.duration), 1)

    return (
      <div className="animate-tab">
        <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mb-3">
          <div className="text-[12px] font-semibold text-[var(--color-sub)] tracking-wide mb-3">Volumen semanal (kg totales)</div>
          <div className="flex items-end gap-1 h-[100px]">
            {last12.map((s, i) => {
              const h = Math.max(4, (s.totalKg / maxKg) * 100)
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-sm bg-[#e07a5f] transition-all duration-500"
                    style={{ height: `${h}px` }}
                    title={`${s.date}: ${Math.round(s.totalKg)} kg`}
                  />
                  <span className="text-[9px] text-[var(--color-dim)]">{labels[i]}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mb-3">
          <div className="text-[12px] font-semibold text-[var(--color-sub)] tracking-wide mb-3">Duración por sesión (min)</div>
          <div className="flex items-end gap-1 h-[80px]">
            {last12.map((s, i) => {
              const h = Math.max(4, (s.duration / maxDur) * 80)
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-sm bg-[#5b8af0] transition-all duration-500"
                    style={{ height: `${h}px` }}
                    title={`${s.date}: ${s.duration} min`}
                  />
                  <span className="text-[9px] text-[var(--color-dim)]">{labels[i]}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-3.5">
            <div className="text-[10px] font-semibold text-[var(--color-dim)] uppercase tracking-wider mb-1.5">Sesiones totales</div>
            <div className="font-serif text-[28px] text-[#e07a5f] leading-none">{sessions.length}</div>
          </div>
          <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-3.5">
            <div className="text-[10px] font-semibold text-[var(--color-dim)] uppercase tracking-wider mb-1.5">Kg totales</div>
            <div className="font-serif text-[28px] text-[#5b8af0] leading-none">{Math.round(sessions.reduce((s, x) => s + x.totalKg, 0))}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-1.5 mb-3.5 overflow-x-auto">
        {(['today','history','routines','library','progress'] as const).map(k => (
          <button key={k} onClick={() => setSub(k)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold font-sans cursor-pointer border transition-all whitespace-nowrap ${
              sub === k ? 'bg-[#e07a5f]/15 text-[#e07a5f] border-[#e07a5f]/30' : 'bg-transparent text-[var(--color-dim)] border-[var(--color-border)]'
            }`}
          >{{today:'Hoy',history:'Historial',routines:'Rutinas',library:'Ejercicios',progress:'Progreso'}[k]}</button>
        ))}
      </div>
    </div>
  )
}

/* ── RUNNING TAB ── */
function RunningTab() {
  const runs = useFisicoStore(s => s.runs)
  const addRun = useFisicoStore(s => s.addRun)
  const deleteRun = useFisicoStore(s => s.deleteRun)

  const [dist, setDist] = useState('')
  const [time, setTime] = useState('')
  const [runDate, setRunDate] = useState(new Date().toISOString().slice(0, 10))
  const [runHr, setRunHr] = useState('')
  const [runElev, setRunElev] = useState('')
  const [runType, setRunType] = useState('easy')
  const [runNotes, setRunNotes] = useState('')

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

  return (
    <div className="animate-tab">
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-3.5">
          <div className="text-[10px] font-semibold text-[var(--color-dim)] uppercase tracking-wider mb-1.5">Km totales</div>
          <div className="font-serif text-[28px] text-[#5b8af0] leading-none">{totalKm.toFixed(1)}</div>
          <div className="text-xs text-[var(--color-dim)] mt-1">{totalRuns} carreras</div>
        </div>
        <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-3.5">
          <div className="text-[10px] font-semibold text-[var(--color-dim)] uppercase tracking-wider mb-1.5">Tiempo total</div>
          <div className="font-serif text-[28px] text-[#52b788] leading-none">{formatTime(totalTime)}</div>
          <div className="text-xs text-[var(--color-dim)] mt-1">acumulado</div>
        </div>
      </div>

      <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mb-3">
        <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-3">Registrar carrera</div>
        <div className="grid grid-cols-2 gap-2 mb-1.5">
          <Input value={dist} onChange={setDist} type="number" step="0.01" placeholder="Distancia (km)" />
          <Input value={time} onChange={setTime} placeholder="Tiempo (mm:ss)" />
        </div>
        <Input value={runDate} onChange={setRunDate} type="date" className="mb-1.5" />
        <div className="grid grid-cols-2 gap-2 mb-1.5">
          <Input value={runHr} onChange={setRunHr} type="number" placeholder="FC media (bpm)" />
          <Input value={runElev} onChange={setRunElev} type="number" placeholder="Desnivel + (m)" />
        </div>
        <select value={runType} onChange={e => setRunType(e.target.value)} className="w-full bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3.5 py-2.5 text-sm font-sans mb-2 outline-none cursor-pointer">
          <option value="easy">🟢 Rodaje suave</option>
          <option value="tempo">🔵 Tempo / Umbral</option>
          <option value="interval">🟡 Series / Intervalos</option>
          <option value="long">🟠 Tirada larga</option>
          <option value="race">🔴 Competición</option>
          <option value="trail">🟤 Trail / montaña</option>
        </select>
        <Input value={runNotes} onChange={setRunNotes} placeholder="Notas (sensaciones, ruta...)" className="mb-2" />
        <button onClick={handleAdd} className="w-full py-2.5 rounded-xl bg-[#5b8af0] text-white text-sm font-semibold font-sans cursor-pointer shadow-lg shadow-[#5b8af0]/25">Guardar carrera</button>
      </div>

      <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2.5">Historial</div>
      {runs.length === 0 ? (
        <div className="text-center py-8 text-[13px] text-[var(--color-dim)]">Sin carreras registradas.</div>
      ) : (
        runs.map((r, i) => (
          <div key={i} className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl mb-2 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="text-center bg-[#5b8af0]/10 border border-[#5b8af0]/20 rounded-xl px-3 py-2 flex-shrink-0">
                <div className="font-serif text-[22px] text-[#5b8af0] leading-none">{r.date.slice(8)}</div>
                <div className="text-[10px] font-bold text-[#5b8af0] uppercase tracking-[1px]">{['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][new Date(r.date + 'T12:00').getMonth()]}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[var(--color-text)]">{r.distance} km · {formatTime(r.timeSeconds)}</div>
                <div className="text-xs text-[var(--color-sub)] mt-0.5">{r.type} {r.hr ? '· ' + r.hr + ' bpm' : ''}{r.elevation ? ' · +' + r.elevation + 'm' : ''}</div>
              </div>
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

  if (mobSub === 'session') {
    return (
      <div className="animate-tab">
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
              <button onClick={() => startMobSession('Sesión libre', [])} className="w-full py-2.5 rounded-xl bg-[#9b7fe0]/15 text-[#9b7fe0] border border-[#9b7fe0]/30 text-sm font-semibold font-sans cursor-pointer">▶ Sesión libre</button>
            </div>
          </>
        ) : (
          <div>
            <div className="bg-[var(--color-s1)] border border-[#9b7fe0]/30 rounded-2xl overflow-hidden mb-3">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--color-border)]">
                <div>
                  <div className="text-sm font-bold text-[var(--color-text)]">{activeSession.name}</div>
                  <div className="text-[11px] text-[var(--color-dim)] mt-0.5">
                    <span className="text-[#9b7fe0] font-bold">{activeSession.exercises.filter(e => e.done).length}</span>
                    {' / '}{activeSession.exercises.length} ejercicios
                  </div>
                </div>
                <button onClick={cancelMobSession} className="px-3.5 py-1.5 rounded-lg bg-red-500/[0.08] text-[var(--color-red)] border border-red-500/[0.2] text-xs font-semibold font-sans cursor-pointer">Cancelar</button>
              </div>
              <div className="h-1 bg-white/[0.05]">
                <div className="h-full bg-gradient-to-r from-[#9b7fe0] to-[#52b788] transition-all duration-400" style={{ width: `${activeSession.exercises.length ? Math.round(activeSession.exercises.filter(e => e.done).length / activeSession.exercises.length * 100) : 0}%` }} />
              </div>
              {activeSession.exercises.map((ex, i) => (
                <div
                  key={i}
                  onClick={() => toggleMobExercise(i)}
                  className={`flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.04] last:border-b-0 cursor-pointer transition-colors active:bg-white/[0.03] ${ex.done ? 'bg-[#52b788]/[0.04]' : ''}`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${ex.done ? 'bg-[#52b788]' : 'bg-[#9b7fe0]'}`} />
                  <span className="flex-1 text-[13px] font-medium text-[var(--color-text)]">{ex.name}</span>
                </div>
              ))}
              <div className="p-4 border-t border-[var(--color-border)]">
                <button onClick={finishMobSession} className="w-full py-2.5 rounded-xl bg-[#9b7fe0]/15 text-[#9b7fe0] border border-[#9b7fe0]/30 text-sm font-semibold font-sans cursor-pointer">✓ Guardar sesión</button>
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
        <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mb-3">
          <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2.5">Nueva rutina</div>
          <Input value={rtnName} onChange={setRtnName} placeholder="Nombre de la rutina..." className="mb-2" />
          <select value={rtnFocus} onChange={e => setRtnFocus(e.target.value)} className="w-full bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3.5 py-2.5 text-sm font-sans mb-2 outline-none cursor-pointer">
            {FOCUS_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
          <div className="flex gap-2 mb-2">
            <Input value={exName} onChange={setExName} placeholder="Nombre del ejercicio" className="flex-1 mb-0" />
            <button onClick={() => { if (exName.trim()) { setBuilderExs(prev => [...prev, { name: exName.trim(), duration: 60 }]); setExName('') } }}
              className="px-4 py-2.5 rounded-xl bg-[#9b7fe0]/15 text-[#9b7fe0] border border-[#9b7fe0]/30 text-xs font-semibold font-sans cursor-pointer">+</button>
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
          }} className="w-full py-2.5 rounded-xl bg-[#9b7fe0] text-white text-sm font-semibold font-sans cursor-pointer">Guardar rutina</button>
        </div>

        <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2.5">Mis rutinas</div>
        {mobRoutines.length === 0 ? (
          <div className="text-center py-8 text-[13px] text-[var(--color-dim)]">Sin rutinas de movilidad.</div>
        ) : (
          mobRoutines.map(r => (
            <div key={r.id} className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl overflow-hidden mb-2">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#9b7fe0]/10 border border-[#9b7fe0]/20 flex items-center justify-center text-lg">🧘</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-[var(--color-text)]">{r.name}</div>
                  <div className="text-xs text-[var(--color-sub)] mt-0.5">{r.exercises.length} ejercicios</div>
                </div>
                <button onClick={() => startMobSession(r.name, r.exercises)} className="px-4 py-2 rounded-xl bg-[#9b7fe0]/15 text-[#9b7fe0] border border-[#9b7fe0]/30 text-xs font-semibold font-sans cursor-pointer">▶</button>
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
        <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2.5">Historial de sesiones</div>
        {mobSessions.length === 0 ? (
          <div className="text-center py-12 text-[13px] text-[var(--color-dim)]">Sin sesiones registradas.</div>
        ) : (
          mobSessions.map((s, i) => (
            <div key={i} className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl mb-2 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#9b7fe0]/10 border border-[#9b7fe0]/20 flex items-center justify-center text-lg flex-shrink-0">🧘</div>
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

  return (
    <div>
      <div className="flex gap-1.5 mb-3">
        {(['session','routines','history'] as const).map(k => (
          <button key={k} onClick={() => setMobSub(k)}
            className={`flex-1 py-2 rounded-xl text-[11px] font-bold font-sans cursor-pointer border transition-all ${
              mobSub === k ? 'bg-[#9b7fe0]/15 text-[#9b7fe0] border-[#9b7fe0]/30' : 'bg-[var(--color-s2)] text-[var(--color-dim)] border-[var(--color-border)]'
            }`}
          >{{session:'🧘 Sesión',routines:'📋 Rutinas',history:'📊 Historial'}[k]}</button>
        ))}
      </div>
      {mobSub === 'session' && <></>}
      {mobSub === 'routines' && <></>}
      {mobSub === 'history' && <></>}
    </div>
  )
}

/* ── MAIN FÍSICO PAGE ── */
export default function Fisico() {
  const [section, setSection] = useState<'strength' | 'running' | 'mobility'>('strength')

  return (
    <div>
      <div className="pt-[52px] px-5 pb-0 border-b border-[var(--color-border)] bg-gradient-to-b from-[#0d0f13] to-[var(--color-bg)]">
        <div className="text-[11px] font-semibold text-[#e07a5f] tracking-wide mb-1">Físico</div>
        <div className="font-serif text-[26px] text-[var(--color-text)] leading-tight">Fuerza</div>
        <div className="flex gap-2 mb-0 pb-0 mt-1">
          {([
            { k: 'strength', l: '💪 Fuerza' },
            { k: 'running', l: '🏃 Running' },
            { k: 'mobility', l: '🧘 Movilidad' },
          ] as const).map(s => (
            <button key={s.k} onClick={() => setSection(s.k)}
              className={`flex-1 py-2 rounded-xl text-[13px] font-bold font-sans cursor-pointer border transition-all ${
                section === s.k ? s.k === 'strength' ? 'bg-[#e07a5f]/15 text-[#e07a5f] border-[#e07a5f]/30' : s.k === 'running' ? 'bg-[#5b8af0]/15 text-[#5b8af0] border-[#5b8af0]/30' : 'bg-[#9b7fe0]/15 text-[#9b7fe0] border-[#9b7fe0]/30'
                : 'bg-transparent text-[var(--color-dim)] border-[var(--color-border)]'
              }`}
            >{s.l}</button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {section === 'strength' && <StrengthTab />}
        {section === 'running' && <RunningTab />}
        {section === 'mobility' && <MobilityTab />}
      </div>
    </div>
  )
}
