import { useState, useRef, useEffect } from 'react'
import { searchUsers, listAllUsers, type Profile } from '@/lib/social'
import { Avatar } from './Avatar'

export function UserSearch({ onOpenProfile }: { onOpenProfile: (userId: string) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  // Al abrir el buscador cargamos todos los usuarios (más nuevos primero).
  useEffect(() => {
    let active = true
    setLoading(true)
    listAllUsers()
      .then(users => { if (active) setAllUsers(users) })
      .catch(() => { if (active) setAllUsers([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  // Debounce: no lanzamos una consulta por cada tecla, esperamos a que pare de escribir.
  function run(q: string) {
    setQuery(q)
    if (timer.current) clearTimeout(timer.current)
    if (!q.trim()) { setResults([]); setSearched(false); setLoading(false); return }
    setLoading(true)
    timer.current = setTimeout(async () => {
      try { setResults(await searchUsers(q)); setSearched(true) }
      catch { setResults([]) }
      finally { setLoading(false) }
    }, 300)
  }

  // Sin texto → todos los usuarios; con texto → resultados de la búsqueda.
  const list = query.trim() ? results : allUsers

  return (
    <div style={{ padding: 16 }}>
      <input className="inp" autoFocus value={query} onChange={e => run(e.target.value)} placeholder="Buscar usuarios…" style={{ marginBottom: 14 }} />
      {loading ? (
        <div className="empty-state">{query.trim() ? 'Buscando…' : 'Cargando usuarios…'}</div>
      ) : query.trim() && searched && results.length === 0 ? (
        <div className="empty-state">Sin resultados</div>
      ) : !query.trim() && allUsers.length === 0 ? (
        <div className="empty-state">Aún no hay usuarios</div>
      ) : list.map(p => (
        <div key={p.user_id} onClick={() => onOpenProfile(p.user_id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}>
          <Avatar name={p.display_name || p.username} url={p.avatar_url} size={40} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{p.display_name || p.username}</div>
            <div style={{ fontSize: 12, color: 'var(--color-dim)' }}>@{p.username} · {p.follower_count} seguidores</div>
          </div>
        </div>
      ))}
    </div>
  )
}
