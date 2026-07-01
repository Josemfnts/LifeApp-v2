import { create } from 'zustand'
import { saveToCloud } from '@/lib/sync'

export interface SessionSet { setNumber: number; weight: number; reps: number; done: boolean }
export interface SessionExercise { name: string; group: string; color: string; sets: SessionSet[] }
export interface TrainingSession { id?: number; name: string; date: string; duration: number; totalKg: number; exercises: SessionExercise[]; notes: string }
export interface Routine { id: number; name: string; exercises: { name: string; group: string; color: string; sets: number }[] }
export interface CustomExercise { name: string; group: string }
export interface RunRecord { id?: number; date: string; distance: number; timeSeconds: number; hr?: number; elevation?: number; type: string; notes: string; intervals?: { rep: number; dist: number; pace: string; rec: string }[] }
export interface RunPlan { id?: number; name: string; goal: string; weeks: number; daysPerWeek: number; targetTime: string; startDate: string; description: string }
export interface MobExercise { name: string; focus: string; duration: number }
export interface MobRoutine { id: number; name: string; focus: string; exercises: { name: string; duration: number }[] }
export interface PR { exercise: string; weight: number; reps: number; date: string }
export interface SetTemplate { name: string; sets: number; reps: number; restSeconds: number }

function load<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback } catch { return fallback }
}
function save(key: string, val: unknown) { localStorage.setItem(key, JSON.stringify(val)); saveToCloud(key, val) }

interface FisicoStore {
  sessions: TrainingSession[]
  routines: Routine[]
  customExercises: CustomExercise[]
  activeSession: TrainingSession | null
  activeTimer: { running: boolean; remaining: number; preset: number } | null
  runs: RunRecord[]
  runPlans: RunPlan[]
  mobRoutines: MobRoutine[]
  mobExercises: MobExercise[]
  mobSessions: { id?: number; date: string; routineName: string; exercises: { name: string; done: boolean }[] }[]
  activeMobSession: { name: string; exercises: { name: string; done: boolean }[] } | null
  prs: PR[]
  setTemplates: SetTemplate[]

  // Sessions
  loadSessions: () => void
  startSession: (name: string, exercises?: { name: string; group: string; color: string; sets: number }[]) => void
  addExerciseToSession: (ex: { name: string; group: string; color: string; sets: number }) => void
  updateSet: (exIdx: number, setIdx: number, data: Partial<SessionSet>) => void
  finishSession: () => void
  cancelSession: () => void
  deleteSession: (idx: number) => void

  // PRs
  checkPRs: () => PR[]
  getPR: (exerciseName: string) => PR | undefined

  // Templates
  addTemplate: (t: SetTemplate) => void
  removeTemplate: (name: string) => void

  // Routines
  saveRoutine: (name: string, exercises: { name: string; group: string; color: string; sets: number }[]) => void
  deleteRoutine: (id: number) => void

  // Custom exercises
  addCustomExercise: (ex: CustomExercise) => void

  // Timer
  startTimer: (seconds: number) => void
  tickTimer: () => void
  stopTimer: () => void

  // Running
  addRun: (run: RunRecord) => void
  saveRunPlan: (plan: RunPlan) => void
  deleteRun: (idx: number) => void

  // Mobility
  addMobRoutine: (r: MobRoutine) => void
  startMobSession: (name: string, exercises: { name: string; duration: number }[]) => void
  toggleMobExercise: (idx: number) => void
  finishMobSession: () => void
  cancelMobSession: () => void
}

export const useFisicoStore = create<FisicoStore>((set, get) => ({
  sessions: load('fisico_sessions', []),
  routines: load('fisico_routines', []),
  customExercises: load('fisico_exercises', []),
  activeSession: null,
  activeTimer: null,
  runs: load('fisico_runs', []),
  runPlans: load('fisico_run_plans', []),
  mobRoutines: load('fisico_mob_routines', []),
  mobExercises: load('fisico_mob_exercises', []),
  mobSessions: load('fisico_mob_sessions', []),
  activeMobSession: null,
  prs: load('fisico_prs', []),
  setTemplates: load('fisico_templates', []),

  loadSessions: () => set({ sessions: load('fisico_sessions', []) }),

  startSession: (name, exercises) => {
    const exs: SessionExercise[] = (exercises || []).map(e => ({
      name: e.name, group: e.group, color: e.color,
      sets: Array.from({ length: e.sets }, (_, i) => ({ setNumber: i + 1, weight: 0, reps: 0, done: false })),
    }))
    set({ activeSession: { name, date: new Date().toISOString().slice(0, 10), duration: 0, totalKg: 0, exercises: exs, notes: '' } })
  },

  addExerciseToSession: (ex) => {
    const ses = get().activeSession
    if (!ses) return
    const newEx: SessionExercise = {
      name: ex.name, group: ex.group, color: ex.color,
      sets: Array.from({ length: ex.sets }, (_, i) => ({ setNumber: i + 1, weight: 0, reps: 0, done: false })),
    }
    set({ activeSession: { ...ses, exercises: [...ses.exercises, newEx] } })
  },

  updateSet: (exIdx, setIdx, data) => {
    const ses = get().activeSession
    if (!ses) return
    const exs = [...ses.exercises]
    exs[exIdx] = { ...exs[exIdx], sets: [...exs[exIdx].sets] }
    exs[exIdx].sets[setIdx] = { ...exs[exIdx].sets[setIdx], ...data }
    set({ activeSession: { ...ses, exercises: exs } })
  },

  finishSession: () => {
    const ses = get().activeSession
    if (!ses) return
    const totalKg = ses.exercises.reduce((sum, ex) => sum + ex.sets.reduce((s, st) => s + (st.done ? st.weight * st.reps : 0), 0), 0)
    const finished: TrainingSession = { ...ses, totalKg, duration: Math.floor((Date.now() - new Date(ses.date + 'T00:00:00').getTime()) / 60000) || 30 }
    const sessions = [finished, ...get().sessions]
    save('fisico_sessions', sessions)
    set({ sessions, activeSession: null })
  },

  cancelSession: () => set({ activeSession: null }),

  deleteSession: (idx) => {
    const sessions = get().sessions.filter((_, i) => i !== idx)
    save('fisico_sessions', sessions)
    set({ sessions })
  },

  saveRoutine: (name, exercises) => {
    const routine: Routine = { id: Date.now(), name, exercises }
    const routines = [...get().routines, routine]
    save('fisico_routines', routines)
    set({ routines })
  },

  deleteRoutine: (id) => {
    const routines = get().routines.filter(r => r.id !== id)
    save('fisico_routines', routines)
    set({ routines })
  },

  addCustomExercise: (ex) => {
    const customExercises = [...get().customExercises, ex]
    save('fisico_exercises', customExercises)
    set({ customExercises })
  },

  startTimer: (seconds) => {
    set({ activeTimer: { running: true, remaining: seconds, preset: seconds } })
  },

  tickTimer: () => {
    const timer = get().activeTimer
    if (!timer || !timer.running) return
    if (timer.remaining <= 1) {
      set({ activeTimer: { ...timer, remaining: 0, running: false } })
      return
    }
    set({ activeTimer: { ...timer, remaining: timer.remaining - 1 } })
  },

  stopTimer: () => set({ activeTimer: null }),

  addRun: (run) => {
    const runs = [{ ...run, id: Date.now() }, ...get().runs]
    save('fisico_runs', runs)
    set({ runs })
  },

  saveRunPlan: (plan) => {
    const runPlans = [{ ...plan, id: Date.now() }, ...get().runPlans]
    save('fisico_run_plans', runPlans)
    set({ runPlans })
  },

  deleteRun: (idx) => {
    const runs = get().runs.filter((_, i) => i !== idx)
    save('fisico_runs', runs)
    set({ runs })
  },

  addMobRoutine: (r) => {
    const mobRoutines = [...get().mobRoutines, r]
    save('fisico_mob_routines', mobRoutines)
    set({ mobRoutines })
  },

  startMobSession: (name, exercises) => {
    set({ activeMobSession: { name, exercises: exercises.map(e => ({ name: e.name, done: false })) } })
  },

  toggleMobExercise: (idx) => {
    const ses = get().activeMobSession
    if (!ses) return
    const exercises = [...ses.exercises]
    exercises[idx] = { ...exercises[idx], done: !exercises[idx].done }
    set({ activeMobSession: { ...ses, exercises } })
  },

  finishMobSession: () => {
    const ses = get().activeMobSession
    if (!ses) return
    const mobSessions = [{ id: Date.now(), date: new Date().toISOString().slice(0, 10), routineName: ses.name, exercises: ses.exercises }, ...get().mobSessions]
    save('fisico_mob_sessions', mobSessions)
    set({ mobSessions, activeMobSession: null })
  },

  cancelMobSession: () => set({ activeMobSession: null }),

  checkPRs: () => {
    const ses = get().activeSession
    if (!ses) return []
    const prs = [...get().prs]
    const newPRs: PR[] = []
    const today = new Date().toISOString().slice(0, 10)
    ses.exercises.forEach(ex => {
      ex.sets.forEach(st => {
        if (!st.done || !st.weight || !st.reps) return
        const existing = prs.find(p => p.exercise === ex.name)
        if (!existing || st.weight > existing.weight || (st.weight === existing.weight && st.reps > existing.reps)) {
          const pr: PR = { exercise: ex.name, weight: st.weight, reps: st.reps, date: today }
          if (existing) Object.assign(existing, pr)
          else prs.push(pr)
          newPRs.push(pr)
        }
      })
    })
    if (newPRs.length > 0) { save('fisico_prs', prs); set({ prs }) }
    return newPRs
  },
  getPR: (exerciseName) => get().prs.find(p => p.exercise === exerciseName),

  addTemplate: (t) => {
    const templates = [...get().setTemplates.filter(x => x.name !== t.name), t]
    save('fisico_templates', templates)
    set({ setTemplates: templates })
  },
  removeTemplate: (name) => {
    const templates = get().setTemplates.filter(x => x.name !== name)
    save('fisico_templates', templates)
    set({ setTemplates: templates })
  },
}))
