import { useState } from 'react'
import { searchUsers, type Profile } from '@/lib/social'
import { Avatar } from './Avatar'

export function UserSearch({ onOpenProfile }: { onOpenProfile: (userId: string) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function run(q: string) {
    setQuery(q)
    if (!q.trim()) { setResults([]); setSearched(false); return }
    setLoading(true)
    try { setResults(await searchUsers(q)); setSearched(true) }
    catch { setResults([]) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ padding: 16 }}>
      <input className="inp" autoFocus value={query} onChange={e => run(e.target.value)} placeholder="Buscar usuarios…" style={{ marginBottom: 14 }} />
      {loading ? (
        <div className="empty-state">Buscando…</div>
      ) : searched && results.length === 0 ? (
        <div className="empty-state">Sin resultados</div>
      ) : results.map(p => (
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
