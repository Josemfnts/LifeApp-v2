import { lazy, Suspense, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { detectEditorTheme } from '@/lib/appTheme'

// BlockNote es pesado: se carga en su propio chunk solo al abrir la pestaña Notas.
const NotesPanel = lazy(() => import('@/modules/notes').then(m => ({ default: m.NotesPanel })))

const centered: React.CSSProperties = { padding: 40, textAlign: 'center', color: 'var(--color-dim)', fontSize: 14 }

/** Pestaña "Notas" dentro de Agenda: gate de sesión + editor tipo Notion. */
export function NotasView() {
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    let alive = true
    supabase.auth.getUser()
      .then(({ data }) => { if (alive) setAuthed(!!data.user) })
      .catch(() => { if (alive) setAuthed(false) })
    return () => { alive = false }
  }, [])

  if (authed === null) return <div style={centered}>Cargando…</div>

  if (!authed)
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📓</div>
        <div style={{ fontWeight: 600, color: 'var(--color-sub)', marginBottom: 6, fontSize: 15 }}>
          Inicia sesión para usar Notas
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-dim)', maxWidth: 300, margin: '0 auto', lineHeight: 1.5 }}>
          Las notas se guardan en la nube y son privadas de tu cuenta. En modo invitado no están disponibles.
        </div>
      </div>
    )

  return (
    <Suspense fallback={<div style={centered}>Cargando editor…</div>}>
      <NotesPanel supabase={supabase} theme={detectEditorTheme()} />
    </Suspense>
  )
}
