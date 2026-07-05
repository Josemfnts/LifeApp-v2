import { saveToStorage, loadFromStorage } from '@/lib/storage'
import { create } from 'zustand'

export interface SessionSet { setNumber: number; weight: number; reps: number; done: boolean; type?: 'warmup' | 'normal' | 'dropset' | 'failure' }
export interface SessionExercise { name: string; group: string; color: string; sets: SessionSet[]; notes?: string; restSeconds?: number; supersetWith?: number }
export interface TrainingSession { id?: number; name: string; date: string; startedAt?: number; duration: number; totalKg: number; exercises: SessionExercise[]; notes: string }
export interface Routine { id: number; name: string; exercises: { name: string; group: string; color: string; sets: number; restSeconds?: number }[] }
export interface CustomExercise { name: string; group: string; equipment?: string }
export interface RunRecord { id?: number; date: string; distance: number; timeSeconds: number; hr?: number; elevation?: number; type: string; notes: string }
export interface RunPlan { id?: number; name: string; goal: string; weeks: number; daysPerWeek: number; targetTime: string; startDate: string; description: string }
export interface MobExercise { name: string; focus: string; duration: number }
export interface MobRoutine { id: number; name: string; focus: string; exercises: { name: string; duration: number }[] }
export interface PR { exercise: string; weight: number; reps: number; date: string }
export interface SetTemplate { name: string; sets: number; reps: number; restSeconds: number }
export interface Program { id: number; name: string; description: string; routines: number[]; color: string }
export interface WeeklyProgram { routineId: string; dayMapping: Record<number, number> } // dow -> sessionIndex

type WakeLockSentinel = { release: () => Promise<void> }
let wakeLockSentinel: WakeLockSentinel | null = null

export const STATIC_EXERCISES = [
  { name: 'Press banca', group: 'Pecho', equipment: 'bar' },
  { name: 'Press inclinado mancuernas', group: 'Pecho', equipment: 'dumbbell' },
  { name: 'Press inclinado barra', group: 'Pecho', equipment: 'bar' },
  { name: 'Aperturas mancuernas', group: 'Pecho', equipment: 'dumbbell' },
  { name: 'Fondos', group: 'Pecho', equipment: 'bodyweight' },
  { name: 'Press declinado', group: 'Pecho', equipment: 'bar' },
  { name: 'Cruces polea', group: 'Pecho', equipment: 'cable' },
  { name: 'Pull-over', group: 'Pecho', equipment: 'dumbbell' },
  { name: 'Dominadas', group: 'Espalda', equipment: 'bodyweight' },
  { name: 'Remo con barra', group: 'Espalda', equipment: 'bar' },
  { name: 'Jalón al pecho', group: 'Espalda', equipment: 'cable' },
  { name: 'Remo en máquina', group: 'Espalda', equipment: 'machine' },
  { name: 'Peso muerto', group: 'Espalda', equipment: 'bar' },
  { name: 'Remo mancuerna', group: 'Espalda', equipment: 'dumbbell' },
  { name: 'Pull-over polea', group: 'Espalda', equipment: 'cable' },
  { name: 'Press militar', group: 'Hombros', equipment: 'bar' },
  { name: 'Elevaciones laterales', group: 'Hombros', equipment: 'dumbbell' },
  { name: 'Pájaro posterior', group: 'Hombros', equipment: 'dumbbell' },
  { name: 'Press Arnold', group: 'Hombros', equipment: 'dumbbell' },
  { name: 'Face pull', group: 'Hombros', equipment: 'cable' },
  { name: 'Curl con barra', group: 'Bíceps', equipment: 'bar' },
  { name: 'Curl martillo', group: 'Bíceps', equipment: 'dumbbell' },
  { name: 'Curl concentrado', group: 'Bíceps', equipment: 'dumbbell' },
  { name: 'Curl polea', group: 'Bíceps', equipment: 'cable' },
  { name: 'Extensiones tríceps polea', group: 'Tríceps', equipment: 'cable' },
  { name: 'Press francés', group: 'Tríceps', equipment: 'bar' },
  { name: 'Fondos tríceps', group: 'Tríceps', equipment: 'bodyweight' },
  { name: 'Patada tríceps', group: 'Tríceps', equipment: 'dumbbell' },
  { name: 'Sentadilla', group: 'Piernas', equipment: 'bar' },
  { name: 'Prensa', group: 'Piernas', equipment: 'machine' },
  { name: 'Extensiones cuádriceps', group: 'Piernas', equipment: 'machine' },
  { name: 'Curl femoral', group: 'Piernas', equipment: 'machine' },
  { name: 'Gemelo de pie', group: 'Piernas', equipment: 'machine' },
  { name: 'Peso muerto rumano', group: 'Piernas', equipment: 'bar' },
  { name: 'Zancadas', group: 'Piernas', equipment: 'dumbbell' },
  { name: 'Sentadilla búlgara', group: 'Piernas', equipment: 'dumbbell' },
  { name: 'Hip thrust', group: 'Glúteos', equipment: 'bar' },
  { name: 'Patada glúteo', group: 'Glúteos', equipment: 'cable' },
  { name: 'Abducción cadera', group: 'Glúteos', equipment: 'machine' },
  { name: 'Plancha abdominal', group: 'Abdomen', equipment: 'bodyweight' },
  { name: 'Crunches', group: 'Abdomen', equipment: 'bodyweight' },
  { name: 'Elevación piernas', group: 'Abdomen', equipment: 'bodyweight' },
  { name: 'Rueda abdominal', group: 'Abdomen', equipment: 'bodyweight' },
  { name: 'Press de banca inclinado máquina', group: 'Pecho', equipment: 'machine' },
  { name: 'Remo al mentón', group: 'Hombros', equipment: 'bar' },
  { name: 'Buenos días', group: 'Piernas', equipment: 'bar' },
  { name: 'Curl predicador', group: 'Bíceps', equipment: 'machine' },
  { name: 'Press cerrado', group: 'Tríceps', equipment: 'bar' },
]

export const EXERCISE_GROUPS = [...new Set(STATIC_EXERCISES.map(e => e.group))]
export const EQUIPMENT_TYPES = ['bar', 'dumbbell', 'cable', 'machine', 'bodyweight']
export const EQUIPMENT_LABELS: Record<string, string> = { bar: 'Barra', dumbbell: 'Mancuernas', cable: 'Polea', machine: 'Máquina', bodyweight: 'Peso corporal' }
export const EXERCISE_COLORS: Record<string, string> = { Pecho: 'var(--color-acc-orange)', Espalda: 'var(--color-acc-blue)', Hombros: 'var(--color-acc-gold)', Bíceps: 'var(--color-acc-green)', Tríceps: 'var(--color-acc-purple)', Piernas: 'var(--color-red)', Glúteos: '#f472b6', Abdomen: '#a78bfa' }

const PLATE_SETS: Record<string, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
}

interface FisicoStore {
  sessions: TrainingSession[]
  routines: Routine[]
  customExercises: CustomExercise[]
  activeSession: TrainingSession | null
  activeTimer: { running: boolean; remaining: number; preset: number; exerciseIdx?: number } | null
  runs: RunRecord[]
  runPlans: RunPlan[]
  mobRoutines: MobRoutine[]
  mobExercises: MobExercise[]
  mobSessions: { id?: number; date: string; routineName: string; exercises: { name: string; done: boolean }[] }[]
  activeMobSession: { name: string; exercises: { name: string; done: boolean }[] } | null
  prs: PR[]
  setTemplates: SetTemplate[]
  programs: Program[]
  weeklyProgram: WeeklyProgram | null
  unit: 'kg' | 'lb'
  wakeLock: boolean

  loadSessions: () => void
  startSession: (name: string, exercises?: { name: string; group: string; color: string; sets: number; restSeconds?: number }[]) => void
  addExerciseToSession: (ex: { name: string; group: string; color: string; sets: number; restSeconds?: number }) => void
  updateSet: (exIdx: number, setIdx: number, data: Partial<SessionSet>) => void
  addSetToExercise: (exIdx: number, lastWeight: number, lastReps: number) => void
  removeSet: (exIdx: number, setIdx: number) => void
  updateExercise: (exIdx: number, data: Partial<SessionExercise>) => void
  generateWarmupSets: (exIdx: number, workingWeight: number) => void
  finishSession: () => PR[]
  cancelSession: () => void
  deleteSession: (idx: number) => void
  getLastExerciseData: (name: string) => { weight: number; reps: number } | null

  checkPRs: () => PR[]
  getPR: (exerciseName: string) => PR | undefined

  saveRoutine: (name: string, exercises: { name: string; group: string; color: string; sets: number; restSeconds?: number }[]) => void
  deleteRoutine: (id: number) => void
  addCustomExercise: (ex: CustomExercise) => void

  startTimer: (seconds: number, exerciseIdx?: number) => void
  tickTimer: () => void
  stopTimer: () => void

  addRun: (run: RunRecord) => void
  saveRunPlan: (plan: RunPlan) => void
  deleteRun: (idx: number) => void

  addMobRoutine: (r: MobRoutine) => void
  startMobSession: (name: string, exercises: { name: string; duration: number }[]) => void
  toggleMobExercise: (idx: number) => void
  finishMobSession: () => void
  cancelMobSession: () => void

  addTemplate: (t: SetTemplate) => void
  removeTemplate: (name: string) => void
  addProgram: (p: Program) => void
  removeProgram: (id: number) => void
  setWeeklyProgram: (wp: WeeklyProgram | null) => void
  getMuscleAnalysis: () => { group: string; sets: number; color: string }[]
  shareSummary: () => string
  toggleUnit: () => void
  setWakeLock: (on: boolean) => void
}

export const useFisicoStore = create<FisicoStore>((set, get) => ({
  sessions: loadFromStorage('fisico_sessions', []),
  routines: loadFromStorage('fisico_routines', []),
  customExercises: loadFromStorage('fisico_exercises', []),
  activeSession: null,
  activeTimer: null,
  runs: loadFromStorage('fisico_runs', []),
  runPlans: loadFromStorage('fisico_run_plans', []),
  mobRoutines: loadFromStorage('fisico_mob_routines', []),
  mobExercises: loadFromStorage('fisico_mob_exercises', []),
  mobSessions: loadFromStorage('fisico_mob_sessions', []),
  activeMobSession: null,
  prs: loadFromStorage('fisico_prs', []),
  setTemplates: loadFromStorage('fisico_templates', []),
  programs: loadFromStorage('fisico_programs', []),
  weeklyProgram: loadFromStorage('fisico_weekly', null),
  unit: (localStorage.getItem('fisico_unit') as 'kg' | 'lb') || 'kg',
  wakeLock: false,

  loadSessions: () => set({ sessions: loadFromStorage('fisico_sessions', []) }),

  startSession: (name, exercises) => {
    const exs: SessionExercise[] = (exercises || []).map(e => ({
      name: e.name, group: e.group, color: e.color,
      restSeconds: e.restSeconds || 90,
      sets: Array.from({ length: e.sets }, (_, i) => ({
        setNumber: i + 1, weight: 0, reps: 0, done: false, type: 'normal' as const,
      })),
    }))
    set({
      activeSession: {
        name, date: new Date().toISOString().slice(0, 10), startedAt: Date.now(),
        duration: 0, totalKg: 0, exercises: exs, notes: '',
      }
    })
  },

  addExerciseToSession: (ex) => {
    const ses = get().activeSession; if (!ses) return
    const last = get().getLastExerciseData(ex.name)
    const newEx: SessionExercise = {
      name: ex.name, group: ex.group, color: ex.color,
      restSeconds: ex.restSeconds || 90,
      sets: Array.from({ length: ex.sets }, (_, i) => ({
        setNumber: i + 1,
        weight: last && i === 0 ? last.weight : 0,
        reps: last && i === 0 ? last.reps : 0,
        done: false, type: 'normal' as const,
      })),
    }
    set({ activeSession: { ...ses, exercises: [...ses.exercises, newEx] } })
  },

  updateSet: (exIdx, setIdx, data) => {
    const ses = get().activeSession; if (!ses) return
    const exs = [...ses.exercises]
    exs[exIdx] = { ...exs[exIdx], sets: [...exs[exIdx].sets] }
    exs[exIdx].sets[setIdx] = { ...exs[exIdx].sets[setIdx], ...data }
    set({ activeSession: { ...ses, exercises: exs } })
  },

  addSetToExercise: (exIdx, weight, reps) => {
    const ses = get().activeSession; if (!ses) return
    const exs = [...ses.exercises]
    exs[exIdx] = { ...exs[exIdx], sets: [...exs[exIdx].sets, { setNumber: exs[exIdx].sets.length + 1, weight, reps, done: false, type: 'normal' }] }
    set({ activeSession: { ...ses, exercises: exs } })
  },

  removeSet: (exIdx, setIdx) => {
    const ses = get().activeSession; if (!ses) return
    const exs = [...ses.exercises]
    exs[exIdx] = { ...exs[exIdx], sets: exs[exIdx].sets.filter((_, i) => i !== setIdx).map((s, i) => ({ ...s, setNumber: i + 1 })) }
    set({ activeSession: { ...ses, exercises: exs } })
  },

  updateExercise: (exIdx, data) => {
    const ses = get().activeSession; if (!ses) return
    const exs = [...ses.exercises]
    exs[exIdx] = { ...exs[exIdx], ...data }
    set({ activeSession: { ...ses, exercises: exs } })
  },

  generateWarmupSets: (exIdx, workingWeight) => {
    const ses = get().activeSession; if (!ses) return
    const exs = [...ses.exercises]
    const currentSets = exs[exIdx].sets.filter(s => s.type !== 'warmup')
    const warmupPcts = [0.4, 0.6, 0.8]
    const plates = PLATE_SETS[get().unit]
    const step = plates[plates.length - 1] // disco más pequeño (1.25kg / 2.5lb)
    const warmups = warmupPcts.map((pct, i) => {
      const raw = workingWeight * pct
      const rounded = Math.round(raw / step) * step
      return { setNumber: i + 1, weight: rounded, reps: Math.max(1, Math.round(i < 2 ? 8 : 3)), done: false, type: 'warmup' as const }
    })
    exs[exIdx] = { ...exs[exIdx], sets: [...warmups, ...currentSets.map((s, i) => ({ ...s, setNumber: warmups.length + i + 1 }))] }
    set({ activeSession: { ...ses, exercises: exs } })
  },

  finishSession: () => {
    const ses = get().activeSession; if (!ses) return []
    const totalKg = ses.exercises.reduce((sum, ex) =>
      sum + ex.sets.reduce((s, st) => s + (st.done && st.type !== 'warmup' ? st.weight * st.reps : 0), 0), 0)
    const duration = ses.startedAt ? Math.floor((Date.now() - ses.startedAt) / 60000) || 30 : 30
    const finished: TrainingSession = { ...ses, totalKg, duration, startedAt: undefined }
    const sessions = [finished, ...get().sessions]
    saveToStorage('fisico_sessions', sessions)
    const newPRs = get().checkPRs()
    set({ sessions, activeSession: null })
    get().setWakeLock(false)
    return newPRs
  },

  cancelSession: () => { set({ activeSession: null }); get().setWakeLock(false) },

  deleteSession: (idx) => {
    const sessions = get().sessions.filter((_, i) => i !== idx)
    saveToStorage('fisico_sessions', sessions)
    set({ sessions })
  },

  getLastExerciseData: (name) => {
    const sessions = get().sessions
    for (const s of sessions) {
      for (const ex of s.exercises) {
        if (ex.name === name) {
          const lastSet = [...ex.sets].reverse().find(st => st.done)
          if (lastSet) return { weight: lastSet.weight, reps: lastSet.reps }
        }
      }
    }
    return null
  },

  checkPRs: () => {
    const ses = get().activeSession; if (!ses) return []
    const prs = [...get().prs]
    const newPRs: PR[] = []
    const today = new Date().toISOString().slice(0, 10)
    ses.exercises.forEach(ex => {
      ex.sets.forEach(st => {
        if (!st.done || !st.weight || !st.reps || st.type === 'warmup') return
        const existing = prs.find(p => p.exercise === ex.name)
        if (!existing || st.weight > existing.weight || (st.weight === existing.weight && st.reps > existing.reps)) {
          const pr: PR = { exercise: ex.name, weight: st.weight, reps: st.reps, date: today }
          if (existing) Object.assign(existing, pr); else prs.push(pr)
          newPRs.push(pr)
        }
      })
    })
    if (newPRs.length > 0) { saveToStorage('fisico_prs', prs); set({ prs }) }
    return newPRs
  },

  getPR: (exerciseName) => get().prs.find(p => p.exercise === exerciseName),

  saveRoutine: (name, exercises) => {
    const routine: Routine = { id: Date.now(), name, exercises }
    const routines = [...get().routines, routine]
    saveToStorage('fisico_routines', routines)
    set({ routines })
  },
  deleteRoutine: (id) => {
    const routines = get().routines.filter(r => r.id !== id)
    saveToStorage('fisico_routines', routines)
    set({ routines })
  },
  addCustomExercise: (ex) => {
    const customExercises = [...get().customExercises, ex]
    saveToStorage('fisico_exercises', customExercises)
    set({ customExercises })
  },

  startTimer: (seconds, exerciseIdx) => set({ activeTimer: { running: true, remaining: seconds, preset: seconds, exerciseIdx } }),
  tickTimer: () => {
    const timer = get().activeTimer; if (!timer?.running) return
    if (timer.remaining <= 1) set({ activeTimer: { ...timer, remaining: 0, running: false } })
    else set({ activeTimer: { ...timer, remaining: timer.remaining - 1 } })
  },
  stopTimer: () => set({ activeTimer: null }),

  addRun: (run) => {
    const runs = [{ ...run, id: Date.now() }, ...get().runs]
    saveToStorage('fisico_runs', runs)
    set({ runs })
  },
  saveRunPlan: (plan) => {
    const runPlans = [{ ...plan, id: Date.now() }, ...get().runPlans]
    saveToStorage('fisico_run_plans', runPlans)
    set({ runPlans })
  },
  deleteRun: (idx) => {
    const runs = get().runs.filter((_, i) => i !== idx)
    saveToStorage('fisico_runs', runs)
    set({ runs })
  },

  addMobRoutine: (r) => {
    const mobRoutines = [...get().mobRoutines, r]
    saveToStorage('fisico_mob_routines', mobRoutines)
    set({ mobRoutines })
  },
  startMobSession: (name, exercises) => set({ activeMobSession: { name, exercises: exercises.map(e => ({ name: e.name, done: false })) } }),
  toggleMobExercise: (idx) => {
    const ses = get().activeMobSession; if (!ses) return
    const exercises = [...ses.exercises]
    exercises[idx] = { ...exercises[idx], done: !exercises[idx].done }
    set({ activeMobSession: { ...ses, exercises } })
  },
  finishMobSession: () => {
    const ses = get().activeMobSession; if (!ses) return
    const mobSessions = [{ id: Date.now(), date: new Date().toISOString().slice(0, 10), routineName: ses.name, exercises: ses.exercises }, ...get().mobSessions]
    saveToStorage('fisico_mob_sessions', mobSessions)
    set({ mobSessions, activeMobSession: null })
  },
  cancelMobSession: () => set({ activeMobSession: null }),

  addTemplate: (t) => {
    const templates = [...get().setTemplates.filter(x => x.name !== t.name), t]
    saveToStorage('fisico_templates', templates)
    set({ setTemplates: templates })
  },
  removeTemplate: (name) => {
    const templates = get().setTemplates.filter(x => x.name !== name)
    saveToStorage('fisico_templates', templates)
    set({ setTemplates: templates })
  },
  toggleUnit: () => {
    const next = get().unit === 'kg' ? 'lb' : 'kg'
    localStorage.setItem('fisico_unit', next)
    set({ unit: next })
  },
  setWeeklyProgram: (wp: WeeklyProgram | null) => {
    saveToStorage('fisico_weekly', wp)
    set({ weeklyProgram: wp })
  },
  setWakeLock: (on) => {
    if (on && 'wakeLock' in navigator) {
      (navigator as Navigator & { wakeLock: { request: (t: string) => Promise<WakeLockSentinel> } }).wakeLock.request('screen')
        .then(sentinel => { wakeLockSentinel = sentinel })
        .catch(() => {})
    } else if (!on && wakeLockSentinel) {
      wakeLockSentinel.release().catch(() => {})
      wakeLockSentinel = null
    }
    set({ wakeLock: on })
  },

  addProgram: (p) => {
    const programs = [...get().programs, p]
    saveToStorage('fisico_programs', programs)
    set({ programs })
  },
  removeProgram: (id) => {
    const programs = get().programs.filter(p => p.id !== id)
    saveToStorage('fisico_programs', programs)
    set({ programs })
  },

  getMuscleAnalysis: () => {
    const sessions = get().sessions
    const groups: Record<string, { sets: number; color: string }> = {}
    EXERCISE_GROUPS.forEach(g => { groups[g] = { sets: 0, color: EXERCISE_COLORS[g] || 'var(--color-acc-orange)' } })
    sessions.forEach(s => {
      s.exercises.forEach(ex => {
        if (groups[ex.group]) groups[ex.group].sets += ex.sets.filter(st => st.done).length
      })
    })
    return Object.entries(groups).map(([group, data]) => ({ group, sets: data.sets, color: data.color }))
  },

  shareSummary: () => {
    const sessions = get().sessions
    const prs = get().prs
    const u = get().unit
    const totalSessions = sessions.length
    const totalKg = Math.round(sessions.reduce((s, x) => s + x.totalKg, 0))
    const thisMonth = sessions.filter(s => s.date.startsWith(new Date().toISOString().slice(0, 7)))
    const thisMonthSessions = thisMonth.length
    const thisMonthKg = Math.round(thisMonth.reduce((s, x) => s + x.totalKg, 0))
    const topPRs = prs.slice(0, 5).map(p => `🏆 ${p.exercise}: ${p.weight}${u} x ${p.reps}`).join('\n')
    return `💪 Life OS — Resumen de Fuerza

📊 Total: ${totalSessions} sesiones · ${totalKg}${u}
📅 Este mes: ${thisMonthSessions} sesiones · ${thisMonthKg}${u}

🏆 Records personales:
${topPRs || 'Sin PRs aún'}

⚡ Entrena con Life OS`
  },
}))
