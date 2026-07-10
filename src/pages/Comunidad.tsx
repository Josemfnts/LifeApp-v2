import { useState, useEffect, useCallback } from 'react'
import {
  fetchFeed, toggleLike, deletePost, repost, isSignedIn, ensureMyProfile,
  publishStats, unreadNotificationCount, supabaseUserId,
  type SocialPost, type PostType, type FeedMode, type ProfileStats,
} from '@/lib/social'
import { useToast } from '@/stores/toast'
import { STORE_KEYS } from '@/lib/storageKeys'
import { typeMeta } from '@/components/social/helpers'
import { PostCard } from '@/components/social/PostCard'
import { Composer } from '@/components/social/Composer'
import { CommentsSheet } from '@/components/social/CommentsSheet'
import { NotificationsSheet } from '@/components/social/NotificationsSheet'
import { ProfileView } from '@/components/social/ProfileView'
import { UserSearch } from '@/components/social/UserSearch'
import { Avatar } from '@/components/social/Avatar'

const FILTERS: PostType[] = ['workout', 'routine', 'recipe', 'diet', 'goal', 'progress', 'photo', 'text']

type View = 'feed' | 'search' | 'profile'

// Deriva stats públicos desde localStorage (local-first) para publicarlos en el perfil.
function computeStats(): ProfileStats {
  const stats: ProfileStats = {}
  try {
    const sessions = JSON.parse(localStorage.getItem(STORE_KEYS.fisico_sessions) || '[]')
    if (Array.isArray(sessions)) stats.workouts = sessions.length
  } catch { /* noop */ }
  try {
    const xp = JSON.parse(localStorage.getItem(STORE_KEYS.lifeos_xp) || '{}')
    if (xp && typeof xp === 'object') {
      if (typeof xp.level === 'number') stats.level = xp.level
      if (typeof xp.xp === 'number') stats.xp = xp.xp
    }
  } catch { /* noop */ }
  return stats
}

export default function Comunidad() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [signed, setSigned] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<FeedMode>('explore')
  const [filter, setFilter] = useState<PostType | null>(null)

  const [view, setView] = useState<View>('feed')
  const [profileId, setProfileId] = useState<string | null>(null)
  const [myId, setMyId] = useState<string | null>(null)

  const [composerOpen, setComposerOpen] = useState(false)
  const [commentsPost, setCommentsPost] = useState<SocialPost | null>(null)
  const [repostPost, setRepostPost] = useState<SocialPost | null>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const toast = useToast()

  const loadFeed = useCallback(async () => {
    setLoading(true); setError('')
    try {
      setPosts(await fetchFeed(mode, filter ?? undefined))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el feed')
    } finally { setLoading(false) }
  }, [mode, filter])

  const init = useCallback(async () => {
    const ok = await isSignedIn()
    setSigned(ok)
    if (!ok) { setLoading(false); return }
    try {
      await ensureMyProfile()
      setMyId(await supabaseUserId())
      publishStats(computeStats()).catch(() => {})
      unreadNotificationCount().then(setUnread).catch(() => {})
    } catch { /* noop */ }
    loadFeed()
  }, [loadFeed])

  useEffect(() => { init() }, [init])
  useEffect(() => { if (signed && view === 'feed') loadFeed() }, [signed, view, loadFeed])

  async function handleLike(p: SocialPost) {
    setPosts(prev => prev.map(x => x.id === p.id ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) } : x))
    try { await toggleLike(p.id, !!p.liked) }
    catch { setPosts(prev => prev.map(x => x.id === p.id ? { ...x, liked: p.liked, likes: p.likes } : x)); toast.show('No se pudo actualizar') }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar esta publicación?')) return
    setPosts(prev => prev.filter(x => x.id !== id))
    try { await deletePost(id); toast.show('Publicación eliminada') }
    catch { toast.show('No se pudo eliminar'); loadFeed() }
  }

  function openProfile(userId: string) { setProfileId(userId); setView('profile') }

  if (loading && view === 'feed' && !posts.length) {
    return <Header><div className="empty-state">Cargando feed…</div></Header>
  }

  if (!signed) {
    return (
      <Header>
        <div style={{ padding: 16 }}>
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 28, textAlign: 'center' }}>
            <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 20, color: 'var(--color-text)', marginBottom: 8 }}>Únete a la comunidad</div>
            <div style={{ fontSize: 13, color: 'var(--color-sub)', marginBottom: 18, lineHeight: 1.5 }}>Inicia sesión para seguir a otros, compartir tus rutinas, recetas, dietas, objetivos y entrenos, y descubrir contenido nuevo.</div>
            <button onClick={() => window.dispatchEvent(new CustomEvent('show-login'))} className="btn-primary" style={{ background: 'var(--color-acc-purple)' }}>Iniciar sesión</button>
          </div>
        </div>
      </Header>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="page-title">Comunidad</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconBtn active={view === 'search'} onClick={() => setView(view === 'search' ? 'feed' : 'search')}>🔍</IconBtn>
            <IconBtn onClick={() => setNotifOpen(true)} badge={unread}>🔔</IconBtn>
            {myId && <IconBtn active={view === 'profile' && profileId === myId} onClick={() => openProfile(myId)}>👤</IconBtn>}
          </div>
        </div>
        <div style={{ height: 12 }} />
      </div>

      {view === 'profile' && profileId ? (
        <ProfileView
          userId={profileId}
          onBack={() => { setView('feed') }}
          onComment={setCommentsPost}
          onRepost={setRepostPost}
          onOpenProfile={openProfile}
        />
      ) : view === 'search' ? (
        <UserSearch onOpenProfile={openProfile} />
      ) : (
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {(['following', 'explore'] as FeedMode[]).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '9px 4px', borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid',
                background: mode === m ? 'color-mix(in srgb, var(--color-acc-purple) 14%, transparent)' : 'var(--color-s2)',
                color: mode === m ? 'var(--color-acc-purple)' : 'var(--color-dim)',
                borderColor: mode === m ? 'color-mix(in srgb, var(--color-acc-purple) 30%, transparent)' : 'var(--color-border)',
              }}>{m === 'following' ? 'Siguiendo' : 'Explorar'}</button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 8 }}>
            <FilterChip active={filter === null} label="Todo" color="var(--color-acc-purple)" onClick={() => setFilter(null)} />
            {FILTERS.map(f => {
              const m = typeMeta(f)
              return <FilterChip key={f} active={filter === f} label={`${m.icon} ${m.label}`} color={m.color} onClick={() => setFilter(f)} />
            })}
          </div>

          {error ? (
            <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--color-red)', marginBottom: 12 }}>{error}</div>
              <button onClick={loadFeed} className="btn-ghost">Reintentar</button>
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-sub)', marginBottom: 6 }}>
                {mode === 'following' ? 'Tu feed está vacío' : 'No hay publicaciones'}
              </div>
              <div>{mode === 'following' ? 'Sigue a otros usuarios o explora para descubrir contenido.' : 'Sé el primero en compartir algo.'}</div>
            </div>
          ) : (
            posts.map(p => (
              <PostCard key={p.id} post={p} onLike={handleLike} onComment={setCommentsPost} onRepost={setRepostPost} onDelete={handleDelete} onOpenProfile={openProfile} />
            ))
          )}
        </div>
      )}

      {view === 'feed' && !composerOpen && (
        <button onClick={() => setComposerOpen(true)}
          style={{ position: 'fixed', right: 18, bottom: 96, zIndex: 500, width: 54, height: 54, borderRadius: 18, border: 'none', cursor: 'pointer', background: 'linear-gradient(145deg,var(--color-acc-purple),var(--color-acc-blue))', color: '#fff', fontSize: 26, fontWeight: 300, boxShadow: '0 6px 22px color-mix(in srgb, var(--color-acc-purple) 40%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
      )}

      {composerOpen && <Composer onClose={() => setComposerOpen(false)} onPosted={() => { setComposerOpen(false); loadFeed() }} />}
      {commentsPost && <CommentsSheet post={commentsPost} onClose={() => setCommentsPost(null)} onChanged={() => { if (view === 'feed') loadFeed() }} />}
      {repostPost && <RepostSheet post={repostPost} onClose={() => setRepostPost(null)} onDone={() => { setRepostPost(null); if (view === 'feed') loadFeed() }} />}
      {notifOpen && <NotificationsSheet onClose={() => setNotifOpen(false)} onRead={() => setUnread(0)} />}
    </div>
  )
}

function Header({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="page-header">
        <div className="page-title">Comunidad</div>
        <div style={{ height: 14 }} />
      </div>
      {children}
    </div>
  )
}

function IconBtn({ children, onClick, active, badge }: { children: React.ReactNode; onClick: () => void; active?: boolean; badge?: number }) {
  return (
    <button onClick={onClick} style={{
      position: 'relative', width: 38, height: 38, borderRadius: 12, cursor: 'pointer', fontSize: 17,
      border: '1px solid', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: active ? 'color-mix(in srgb, var(--color-acc-purple) 14%, transparent)' : 'var(--color-s2)',
      borderColor: active ? 'color-mix(in srgb, var(--color-acc-purple) 30%, transparent)' : 'var(--color-border)',
    }}>
      {children}
      {!!badge && badge > 0 && (
        <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 99, background: 'var(--color-red)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge > 9 ? '9+' : badge}</span>
      )}
    </button>
  )
}

function FilterChip({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      flexShrink: 0, padding: '6px 12px', borderRadius: 99, fontSize: 12.5, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid', whiteSpace: 'nowrap',
      background: active ? `color-mix(in srgb, ${color} 16%, transparent)` : 'var(--color-s2)',
      color: active ? color : 'var(--color-dim)',
      borderColor: active ? `color-mix(in srgb, ${color} 32%, transparent)` : 'var(--color-border)',
    }}>{label}</button>
  )
}

function RepostSheet({ post, onClose, onDone }: { post: SocialPost; onClose: () => void; onDone: () => void }) {
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  async function submit() {
    setBusy(true)
    try {
      await repost(post, comment.trim())
      toast.show('✓ Compartido')
      onDone()
    } catch (e) { toast.show(e instanceof Error ? e.message : 'No se pudo compartir') }
    finally { setBusy(false) }
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 40px' }}>
        <div style={{ width: 36, height: 4, background: 'var(--color-border2)', borderRadius: 99, margin: '0 auto 16px' }} />
        <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 20, marginBottom: 12 }}>Compartir publicación</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 10px', background: 'var(--color-s2)', borderRadius: 10 }}>
          <Avatar name={post.author} size={28} />
          <span style={{ fontSize: 13, color: 'var(--color-sub)' }}>Publicación de <b style={{ color: 'var(--color-text)' }}>{post.author}</b></span>
        </div>
        <textarea className="inp" value={comment} onChange={e => setComment(e.target.value)} placeholder="Añade un comentario (opcional)" style={{ height: 80, resize: 'none', marginBottom: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button onClick={submit} disabled={busy} className="btn-primary" style={{ background: 'var(--color-acc-purple)', opacity: busy ? 0.6 : 1 }}>{busy ? 'Compartiendo…' : 'Compartir'}</button>
        </div>
      </div>
    </div>
  )
}
