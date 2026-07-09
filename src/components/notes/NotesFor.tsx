import { lazy, Suspense, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { detectEditorTheme } from '@/lib/appTheme'

// EntityNotes arrastra BlockNote (pesado): se carga en el chunk 'notes' solo
// cuando el usuario despliega las notas de esta entidad.
const EntityNotes = lazy(() => import('@/modules/notes').then(m => ({ default: m.EntityNotes })))

export interface NotesForProps {
  /** 'day' | 'workout' | 'project' | 'account' | ... (texto libre) */
  entityType: string
  /** uuid, id numérico o clave de fecha ('2026-07-09') */
  entityId: string | number
  defaultTitle?: string
}

/**
 * "El cable" listo para soltar en cualquier pantalla de la app: engancha
 * notas tipo Notion a una entidad. Gated (invitado no lo ve), lazy y
 * colapsable (no carga el editor hasta desplegarlo).
 */
export function NotesFor({ entityType, entityId, defaultTitle }: NotesForProps) {
  const [open, setOpen] = useState(false)
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    let alive = true
    supabase.auth.getUser()
      .then(({ data }) => { if (alive) setAuthed(!!data.user) })
      .catch(() => { if (alive) setAuthed(false) })
    return () => { alive = false }
  }, [])

  // Invitado o comprobando: no mostramos el cable (las notas requieren sesión)
  if (!authed) return null

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          marginTop: 12, width: '100%', padding: '10px 12px', borderRadius: 12,
          background: 'var(--color-s1)', border: '1px solid var(--color-border)',
          color: 'var(--color-sub)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'DM Sans,sans-serif', textAlign: 'left',
        }}
      >
        📝 Notas
      </button>
    )

  return (
    <div style={{ marginTop: 12 }}>
      <Suspense fallback={<div style={{ fontSize: 13, color: 'var(--color-dim)', padding: 8 }}>Cargando notas…</div>}>
        <EntityNotes
          supabase={supabase}
          entityType={entityType}
          entityId={String(entityId)}
          defaultTitle={defaultTitle}
          theme={detectEditorTheme()}
        />
      </Suspense>
    </div>
  )
}
