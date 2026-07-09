import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { detectEditorTheme } from '@/lib/appTheme'
import { NotesPanel } from '@/modules/notes'

/** Pantalla Notas a pantalla completa (ruta /notas, fuera del Shell/nav). */
export default function Notas() {
  const navigate = useNavigate()
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    let alive = true
    supabase.auth.getUser()
      .then(({ data }) => { if (alive) setAuthed(!!data.user) })
      .catch(() => { if (alive) setAuthed(false) })
    return () => { alive = false }
  }, [])

  const back = () => navigate('/agenda')

  if (authed === null)
    return <div className="notes-gate"><span style={{ color: 'var(--color-dim)', fontSize: 14 }}>Cargando…</span></div>

  if (!authed)
    return (
      <div className="notes-gate">
        <button onClick={back} className="notes-topbar__btn" style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top,0px) + 12px)', left: 12 }} aria-label="Volver">‹</button>
        <div style={{ textAlign: 'center', padding: '0 28px', maxWidth: 320 }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>📓</div>
          <div style={{ fontWeight: 600, color: 'var(--color-sub)', marginBottom: 6, fontSize: 16 }}>
            Inicia sesión para usar Notas
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-dim)', lineHeight: 1.5 }}>
            Las notas se guardan en la nube y son privadas de tu cuenta. En modo invitado no están disponibles.
          </div>
        </div>
      </div>
    )

  return <NotesPanel supabase={supabase} theme={detectEditorTheme()} onBack={back} />
}
