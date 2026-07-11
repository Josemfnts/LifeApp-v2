import { useState, useRef } from 'react'
import { createPost, uploadImage, type NewPost } from '@/lib/social'
import type {
  PostType, PostData, RoutineExercise, DietDay, GoalMilestone, WorkoutExerciseSummary,
} from '@/types/social'
import { useToast } from '@/stores/toast'
import { typeMeta } from './helpers'

const TYPES: PostType[] = ['text', 'photo', 'progress', 'workout', 'routine', 'recipe', 'diet', 'goal']

function lines(s: string): string[] {
  return s.split('\n').map(l => l.trim()).filter(Boolean)
}

const inpStyle: React.CSSProperties = { marginBottom: 10 }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  )
}

export function Composer({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const [type, setType] = useState<PostType>('text')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  // Campos estructurados por tipo
  const [routineEx, setRoutineEx] = useState<RoutineExercise[]>([{ name: '', sets: 3, reps: '8-12' }])
  const [ingredients, setIngredients] = useState('')
  const [steps, setSteps] = useState('')
  const [macros, setMacros] = useState({ kcal: '', protein: '', carbs: '', fat: '' })
  const [servings, setServings] = useState('')
  const [dietDays, setDietDays] = useState<{ day: string; meals: string }[]>([{ day: 'Lunes', meals: '' }])
  const [goal, setGoal] = useState({ metric: '', current: '', target: '', unit: '', deadline: '' })
  const [milestones, setMilestones] = useState('')
  const [workout, setWorkout] = useState({ routineName: '', totalKg: '', exercises: '', maxWeight: '', durationMin: '', exerciseList: '' })
  const [progress, setProgress] = useState({ metric: '', value: '', unit: '', delta: '' })

  const [uploading, setUploading] = useState(false)
  async function pickImage(file: File) {
    setUploading(true)
    try {
      setImage(await uploadImage(file))
      if (type === 'text') setType('photo')
    } catch { toast.show('No se pudo procesar la imagen') }
    finally { setUploading(false) }
  }

  function num(v: string): number { return Number(v) || 0 }

  function buildMacros() {
    if (!macros.kcal && !macros.protein && !macros.carbs && !macros.fat) return undefined
    return { kcal: num(macros.kcal), protein: num(macros.protein), carbs: num(macros.carbs), fat: num(macros.fat) }
  }

  function buildData(): { data: PostData; ok: boolean; msg?: string } {
    switch (type) {
      case 'routine': {
        const exs = routineEx.filter(e => e.name.trim())
        if (!title.trim()) return { data: {}, ok: false, msg: 'Pon un nombre a la rutina' }
        if (!exs.length) return { data: {}, ok: false, msg: 'Añade al menos un ejercicio' }
        return { data: { name: title.trim(), exercises: exs }, ok: true }
      }
      case 'recipe': {
        if (!title.trim()) return { data: {}, ok: false, msg: 'Pon un nombre a la receta' }
        return { data: {
          name: title.trim(),
          servings: servings ? num(servings) : undefined,
          ingredients: lines(ingredients),
          steps: lines(steps),
          macros: buildMacros(),
        }, ok: true }
      }
      case 'diet': {
        const days: DietDay[] = dietDays
          .filter(d => d.meals.trim())
          .map(d => ({
            day: d.day,
            meals: lines(d.meals).map(l => {
              const [name, ...rest] = l.split(':')
              return rest.length
                ? { name: name.trim(), description: rest.join(':').trim() }
                : { name: 'Comida', description: l }
            }),
          }))
        if (!title.trim()) return { data: {}, ok: false, msg: 'Pon un nombre a la dieta' }
        if (!days.length) return { data: {}, ok: false, msg: 'Añade al menos un día con comidas' }
        return { data: { name: title.trim(), days }, ok: true }
      }
      case 'goal': {
        if (!title.trim()) return { data: {}, ok: false, msg: 'Pon un título al objetivo' }
        const ms: GoalMilestone[] = lines(milestones).map(l => ({ label: l, done: false }))
        return { data: {
          title: title.trim(),
          metric: goal.metric || undefined,
          current: goal.current ? num(goal.current) : undefined,
          target: goal.target ? num(goal.target) : undefined,
          unit: goal.unit || undefined,
          deadline: goal.deadline || undefined,
          milestones: ms,
        }, ok: true }
      }
      case 'workout': {
        if (!workout.totalKg) return { data: {}, ok: false, msg: 'Indica el volumen total' }
        const exerciseList: WorkoutExerciseSummary[] = lines(workout.exerciseList).map(l => {
          const [name, sets, top] = l.split('|').map(s => s.trim())
          return { name, sets: num(sets), topWeight: top ? num(top) : undefined }
        })
        return { data: {
          routineName: workout.routineName || undefined,
          totalKg: num(workout.totalKg),
          exercises: workout.exercises ? num(workout.exercises) : exerciseList.length,
          maxWeight: workout.maxWeight ? num(workout.maxWeight) : undefined,
          durationMin: workout.durationMin ? num(workout.durationMin) : undefined,
          exerciseList: exerciseList.length ? exerciseList : undefined,
        }, ok: true }
      }
      case 'progress': {
        return { data: {
          metric: progress.metric || undefined,
          value: progress.value ? num(progress.value) : undefined,
          unit: progress.unit || undefined,
          delta: progress.delta ? num(progress.delta) : undefined,
        }, ok: true }
      }
      default:
        return { data: {}, ok: true }
    }
  }

  async function submit() {
    const built = buildData()
    if (!built.ok) { toast.show(built.msg ?? 'Faltan datos'); return }
    if ((type === 'text' || type === 'photo' || type === 'progress') && !body.trim() && !image && !title.trim()) {
      toast.show('Escribe algo o añade una foto'); return
    }
    setBusy(true)
    try {
      const post: NewPost = { type, title: title.trim(), body: body.trim(), data: built.data, image_url: image }
      await createPost(post)
      toast.show('✓ Publicado en la comunidad')
      onPosted()
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'No se pudo publicar')
    } finally { setBusy(false) }
  }

  const titlePlaceholder: Record<string, string> = {
    routine: 'Nombre de la rutina', recipe: 'Nombre de la receta',
    diet: 'Nombre de la dieta', goal: 'Título del objetivo',
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 40px', maxHeight: '92dvh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, background: 'var(--color-border2)', borderRadius: 99, margin: '0 auto 16px' }} />
        <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 20, marginBottom: 14 }}>Nueva publicación</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 14 }}>
          {TYPES.map(t => {
            const m = typeMeta(t)
            const active = type === t
            return (
              <button key={t} onClick={() => setType(t)} style={{
                padding: '8px 2px', borderRadius: 10, fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid',
                background: active ? `color-mix(in srgb, ${m.color} 14%, transparent)` : 'var(--color-s2)',
                color: active ? m.color : 'var(--color-dim)',
                borderColor: active ? `color-mix(in srgb, ${m.color} 30%, transparent)` : 'var(--color-border)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
                <span style={{ fontSize: 16 }}>{m.icon}</span>{m.label}
              </button>
            )
          })}
        </div>

        <input className="inp" style={inpStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder={titlePlaceholder[type] ?? 'Título (opcional)'} />

        {(type === 'text' || type === 'photo' || type === 'progress' || type === 'goal') && (
          <textarea className="inp" style={{ ...inpStyle, height: 80, resize: 'none' }} value={body} onChange={e => setBody(e.target.value)} placeholder={type === 'goal' ? 'Describe tu objetivo…' : '¿Qué quieres compartir?'} />
        )}

        {type === 'routine' && (
          <div style={{ marginBottom: 10 }}>
            {routineEx.map((ex, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 46px 60px 30px', gap: 6, marginBottom: 6 }}>
                <input className="inp" style={{ margin: 0 }} value={ex.name} placeholder="Ejercicio" onChange={e => setRoutineEx(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                <input className="inp" style={{ margin: 0 }} type="number" value={ex.sets} onChange={e => setRoutineEx(p => p.map((x, j) => j === i ? { ...x, sets: num(e.target.value) } : x))} />
                <input className="inp" style={{ margin: 0 }} value={ex.reps} placeholder="reps" onChange={e => setRoutineEx(p => p.map((x, j) => j === i ? { ...x, reps: e.target.value } : x))} />
                <button onClick={() => setRoutineEx(p => p.filter((_, j) => j !== i))} className="btn-ghost" style={{ padding: 0 }}>✕</button>
              </div>
            ))}
            <button onClick={() => setRoutineEx(p => [...p, { name: '', sets: 3, reps: '8-12' }])} className="btn-ghost" style={{ width: '100%' }}>+ Añadir ejercicio</button>
          </div>
        )}

        {type === 'recipe' && (
          <>
            <Field label="Raciones"><input className="inp" style={inpStyle} type="number" value={servings} onChange={e => setServings(e.target.value)} placeholder="2" /></Field>
            <Field label="Ingredientes (uno por línea)"><textarea className="inp" style={{ ...inpStyle, height: 80, resize: 'none' }} value={ingredients} onChange={e => setIngredients(e.target.value)} /></Field>
            <Field label="Pasos (uno por línea)"><textarea className="inp" style={{ ...inpStyle, height: 80, resize: 'none' }} value={steps} onChange={e => setSteps(e.target.value)} /></Field>
            <Field label="Macros por ración (opcional)">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                <input className="inp" style={{ margin: 0 }} type="number" placeholder="kcal" value={macros.kcal} onChange={e => setMacros(m => ({ ...m, kcal: e.target.value }))} />
                <input className="inp" style={{ margin: 0 }} type="number" placeholder="P" value={macros.protein} onChange={e => setMacros(m => ({ ...m, protein: e.target.value }))} />
                <input className="inp" style={{ margin: 0 }} type="number" placeholder="C" value={macros.carbs} onChange={e => setMacros(m => ({ ...m, carbs: e.target.value }))} />
                <input className="inp" style={{ margin: 0 }} type="number" placeholder="G" value={macros.fat} onChange={e => setMacros(m => ({ ...m, fat: e.target.value }))} />
              </div>
            </Field>
          </>
        )}

        {type === 'diet' && (
          <div style={{ marginBottom: 10 }}>
            {dietDays.map((d, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                  <input className="inp" style={{ margin: 0, flex: 1 }} value={d.day} onChange={e => setDietDays(p => p.map((x, j) => j === i ? { ...x, day: e.target.value } : x))} />
                  <button onClick={() => setDietDays(p => p.filter((_, j) => j !== i))} className="btn-ghost" style={{ padding: '0 10px' }}>✕</button>
                </div>
                <textarea className="inp" style={{ margin: 0, height: 60, resize: 'none' }} value={d.meals} placeholder="Desayuno: avena con fruta&#10;Comida: pollo y arroz" onChange={e => setDietDays(p => p.map((x, j) => j === i ? { ...x, meals: e.target.value } : x))} />
              </div>
            ))}
            <button onClick={() => setDietDays(p => [...p, { day: '', meals: '' }])} className="btn-ghost" style={{ width: '100%' }}>+ Añadir día</button>
          </div>
        )}

        {type === 'goal' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <Field label="Métrica"><input className="inp" style={inpStyle} value={goal.metric} placeholder="peso muerto" onChange={e => setGoal(g => ({ ...g, metric: e.target.value }))} /></Field>
              <Field label="Unidad"><input className="inp" style={inpStyle} value={goal.unit} placeholder="kg" onChange={e => setGoal(g => ({ ...g, unit: e.target.value }))} /></Field>
              <Field label="Actual"><input className="inp" style={inpStyle} type="number" value={goal.current} onChange={e => setGoal(g => ({ ...g, current: e.target.value }))} /></Field>
              <Field label="Objetivo"><input className="inp" style={inpStyle} type="number" value={goal.target} onChange={e => setGoal(g => ({ ...g, target: e.target.value }))} /></Field>
            </div>
            <Field label="Fecha límite"><input className="inp" style={inpStyle} type="date" value={goal.deadline} onChange={e => setGoal(g => ({ ...g, deadline: e.target.value }))} /></Field>
            <Field label="Hitos (uno por línea)"><textarea className="inp" style={{ ...inpStyle, height: 60, resize: 'none' }} value={milestones} onChange={e => setMilestones(e.target.value)} /></Field>
          </>
        )}

        {type === 'workout' && (
          <>
            <Field label="Rutina"><input className="inp" style={inpStyle} value={workout.routineName} placeholder="Push A" onChange={e => setWorkout(w => ({ ...w, routineName: e.target.value }))} /></Field>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6 }}>
              <Field label="Volumen (kg)"><input className="inp" style={inpStyle} type="number" value={workout.totalKg} onChange={e => setWorkout(w => ({ ...w, totalKg: e.target.value }))} /></Field>
              <Field label="Nº ejercicios"><input className="inp" style={inpStyle} type="number" value={workout.exercises} onChange={e => setWorkout(w => ({ ...w, exercises: e.target.value }))} /></Field>
              <Field label="Peso máx (kg)"><input className="inp" style={inpStyle} type="number" value={workout.maxWeight} onChange={e => setWorkout(w => ({ ...w, maxWeight: e.target.value }))} /></Field>
              <Field label="Duración (min)"><input className="inp" style={inpStyle} type="number" value={workout.durationMin} onChange={e => setWorkout(w => ({ ...w, durationMin: e.target.value }))} /></Field>
            </div>
            <Field label="Ejercicios (nombre | series | peso máx)"><textarea className="inp" style={{ ...inpStyle, height: 60, resize: 'none' }} value={workout.exerciseList} placeholder="Press banca | 4 | 80" onChange={e => setWorkout(w => ({ ...w, exerciseList: e.target.value }))} /></Field>
          </>
        )}

        {type === 'progress' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6 }}>
            <Field label="Métrica"><input className="inp" style={inpStyle} value={progress.metric} placeholder="Peso" onChange={e => setProgress(p => ({ ...p, metric: e.target.value }))} /></Field>
            <Field label="Unidad"><input className="inp" style={inpStyle} value={progress.unit} placeholder="kg" onChange={e => setProgress(p => ({ ...p, unit: e.target.value }))} /></Field>
            <Field label="Valor"><input className="inp" style={inpStyle} type="number" value={progress.value} onChange={e => setProgress(p => ({ ...p, value: e.target.value }))} /></Field>
            <Field label="Variación"><input className="inp" style={inpStyle} type="number" value={progress.delta} onChange={e => setProgress(p => ({ ...p, delta: e.target.value }))} /></Field>
          </div>
        )}

        {(type === 'photo' || type === 'progress' || type === 'recipe' || type === 'text') && (
          image ? (
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <img src={image} alt="" style={{ width: '100%', borderRadius: 12, maxHeight: 260, objectFit: 'cover', display: 'block' }} />
              <button onClick={() => setImage(null)} style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', cursor: 'pointer', fontSize: 13 }}>✕</button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ width: '100%', padding: 14, borderRadius: 12, marginBottom: 12, border: '1px dashed var(--color-border2)', background: 'var(--color-s2)', color: 'var(--color-sub)', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', opacity: uploading ? 0.6 : 1 }}>{uploading ? 'Subiendo foto…' : 'Añadir foto'}</button>
          )
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) pickImage(f) }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button onClick={submit} disabled={busy || uploading} className="btn-primary" style={{ background: 'var(--color-acc-purple)', opacity: busy || uploading ? 0.6 : 1 }}>{busy ? 'Publicando…' : 'Publicar'}</button>
        </div>
      </div>
    </div>
  )
}
