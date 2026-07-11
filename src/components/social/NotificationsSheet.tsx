import { useState, useEffect } from 'react'
import { fetchNotifications, markNotificationsRead, type Notification } from '@/lib/social'
import { Avatar } from './Avatar'
import { timeAgo } from './helpers'

const VERB: Record<Notification['type'], string> = {
  like: 'le dio me gusta a tu publicación',
  comment: 'comentó tu publicación',
  follow: 'empezó a seguirte',
  repost: 'compartió tu publicación',
  use: 'guardó tu contenido para usarlo',
}

export function NotificationsSheet({ onClose, onRead }: { onClose: () => void; onRead: () => void }) {
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const n = await fetchNotifications()
        if (alive) setItems(n)
        await markNotificationsRead()
        onRead()
      } finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [onRead])

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '20px 16px 32px', maxHeight: '85dvh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, background: 'var(--color-border2)', borderRadius: 99, margin: '0 auto 16px' }} />
        <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 18, marginBottom: 12 }}>Notificaciones</div>
        {loading ? (
          <div className="empty-state">Cargando…</div>
        ) : items.length === 0 ? (
          <div className="empty-state">No tienes notificaciones</div>
        ) : items.map(n => (
          <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--color-border)', opacity: n.read ? 0.65 : 1 }}>
            <Avatar name={n.actor_name} size={34} />
            <div style={{ flex: 1, fontSize: 13.5, color: 'var(--color-sub)', lineHeight: 1.4 }}>
              <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{n.actor_name}</span> {VERB[n.type]}
              <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 2 }}>{timeAgo(n.created_at)}</div>
            </div>
            {!n.read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-acc-purple)', flexShrink: 0 }} />}
          </div>
        ))}
      </div>
    </div>
  )
}
