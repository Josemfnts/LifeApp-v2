import type {
  SocialPost, PostData, RoutinePayload, RecipePayload,
  DietPayload, GoalPayload, WorkoutPayload, ProgressPayload,
} from '@/types/social'

function Chip({ children, color = 'var(--color-acc-blue)' }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color, padding: '2px 8px', borderRadius: 6,
      background: `color-mix(in srgb, ${color} 12%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} 22%, transparent)`,
    }}>{children}</span>
  )
}

function MacroRow({ macros }: { macros: NonNullable<RecipePayload['macros']> }) {
  const items: [string, string][] = [
    ['kcal', `${macros.kcal}`],
    ['P', `${macros.protein}g`],
    ['C', `${macros.carbs}g`],
    ['G', `${macros.fat}g`],
  ]
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '4px 14px 10px' }}>
      {items.map(([k, v]) => (
        <Chip key={k} color="var(--color-acc-green)">{k} {v}</Chip>
      ))}
    </div>
  )
}

export function StatGrid({ stats }: { stats: [string, string][] }) {
  return (
    <div style={{ display: 'flex', gap: 18, padding: '10px 14px', borderTop: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
      {stats.map(([label, value]) => (
        <div key={label}>
          <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 18, color: 'var(--color-text)', lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 3 }}>{label}</div>
        </div>
      ))}
    </div>
  )
}

function RoutineBody({ d }: { d: PostData }) {
  const p = d as unknown as RoutinePayload
  if (!p.exercises?.length) return null
  return (
    <div style={{ padding: '0 14px 10px' }}>
      {p.exercises.map((e, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < p.exercises.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
          <span style={{ fontSize: 13.5, color: 'var(--color-text)' }}>{e.name}</span>
          <span style={{ fontSize: 12.5, color: 'var(--color-dim)', fontVariantNumeric: 'tabular-nums' }}>
            {e.sets}×{e.reps}{e.restSeconds ? ` · ${e.restSeconds}s` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

function RecipeBody({ d }: { d: PostData }) {
  const p = d as unknown as RecipePayload
  return (
    <div>
      {p.macros && <MacroRow macros={p.macros} />}
      {!!p.ingredients?.length && (
        <div style={{ padding: '0 14px 8px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Ingredientes</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--color-sub)', lineHeight: 1.6 }}>
            {p.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
          </ul>
        </div>
      )}
      {!!p.steps?.length && (
        <div style={{ padding: '0 14px 10px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Pasos</div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--color-sub)', lineHeight: 1.6 }}>
            {p.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
      )}
    </div>
  )
}

function DietBody({ d }: { d: PostData }) {
  const p = d as unknown as DietPayload
  if (!p.days?.length) return null
  return (
    <div style={{ padding: '0 14px 10px' }}>
      {p.days.map((day, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-acc-green)', marginBottom: 2 }}>{day.day}</div>
          {day.meals.map((m, j) => (
            <div key={j} style={{ fontSize: 12.5, color: 'var(--color-sub)', lineHeight: 1.5 }}>
              <span style={{ color: 'var(--color-dim)' }}>{m.name}:</span> {m.description}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function GoalBody({ d }: { d: PostData }) {
  const p = d as unknown as GoalPayload
  const pct = p.target && p.current != null ? Math.min(100, Math.round((p.current / p.target) * 100)) : null
  return (
    <div style={{ padding: '0 14px 10px' }}>
      {pct != null && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
            <span style={{ color: 'var(--color-dim)' }}>{p.metric ?? 'Progreso'}</span>
            <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{p.current}/{p.target} {p.unit ?? ''}</span>
          </div>
          <div style={{ height: 8, borderRadius: 99, background: 'var(--color-s2)', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-acc-blue)' }} />
          </div>
        </div>
      )}
      {p.deadline && <div style={{ fontSize: 12, color: 'var(--color-dim)', marginBottom: 6 }}>Fecha límite: {new Date(p.deadline).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
      {!!p.milestones?.length && p.milestones.map((m, i) => (
        <div key={i} style={{ fontSize: 13, color: m.done ? 'var(--color-dim)' : 'var(--color-sub)', textDecoration: m.done ? 'line-through' : 'none' }}>
          {m.done ? '✓' : '○'} {m.label}
        </div>
      ))}
    </div>
  )
}

function WorkoutStats({ d }: { d: PostData }) {
  const p = d as unknown as WorkoutPayload
  if (typeof p.totalKg !== 'number') return null
  const stats: [string, string][] = [['Volumen', `${p.totalKg} kg`]]
  if (typeof p.exercises === 'number') stats.push(['Ejercicios', String(p.exercises)])
  if (typeof p.maxWeight === 'number') stats.push(['Peso máx', `${p.maxWeight} kg`])
  const dur = p.durationMin ?? p.duration
  if (typeof dur === 'number') stats.push(['Duración', `${dur} min`])
  return (
    <>
      <StatGrid stats={stats} />
      {!!p.exerciseList?.length && (
        <div style={{ padding: '0 14px 10px' }}>
          {p.exerciseList.map((e, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '3px 0', color: 'var(--color-sub)' }}>
              <span>{e.name}</span>
              <span style={{ color: 'var(--color-dim)' }}>{e.sets} series{e.topWeight ? ` · ${e.topWeight} kg` : ''}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function ProgressStats({ d }: { d: PostData }) {
  const p = d as unknown as ProgressPayload
  if (p.value == null) return null
  const stats: [string, string][] = [[p.metric ?? 'Valor', `${p.value} ${p.unit ?? ''}`.trim()]]
  if (typeof p.delta === 'number') stats.push(['Variación', `${p.delta > 0 ? '+' : ''}${p.delta} ${p.unit ?? ''}`.trim()])
  return <StatGrid stats={stats} />
}

// Renderiza el cuerpo específico del tipo (sin cabecera ni imagen; eso va en PostCard).
export function PostContent({ post }: { post: SocialPost }) {
  const d = post.data ?? {}
  switch (post.type) {
    case 'routine':  return <RoutineBody d={d} />
    case 'recipe':   return <RecipeBody d={d} />
    case 'diet':     return <DietBody d={d} />
    case 'goal':     return <GoalBody d={d} />
    case 'workout':  return <WorkoutStats d={d} />
    case 'progress': return <ProgressStats d={d} />
    default:         return null
  }
}
