import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getProfile, fetchUserPosts, follow, unfollow, updateMyProfile, compressImage,
  toggleLike, deletePost, type Profile, type SocialPost,
} from '@/lib/social'
import { useToast } from '@/stores/toast'
import { ConfirmDialog } from '@/components/ui'
import { Avatar } from './Avatar'
import { PostCard } from './PostCard'

interface Props {
  userId: string
  onBack: () => void
  onComment: (p: SocialPost) => void
  onRepost: (p: SocialPost) => void
  onOpenProfile: (userId: string) => void
}

function StatCol({ label, value, onClick }: { label: string; value: number | string; onClick?: () => void }) {
  return (
    <div style={{ textAlign: 'center', cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 20, color: 'var(--color-text)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginTop: 3 }}>{label}</div>
    </div>
  )
}

export function ProfileView(props: Props) {
  const { userId, onBack } = props
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, ps] = await Promise.all([getProfile({ userId }), fetchUserPosts(userId)])
      setProfile(p)
      setPosts(ps)
    } catch { toast.show('No se pudo cargar el perfil') }
    finally { setLoading(false) }
  }, [userId, toast])

  useEffect(() => { load() }, [load])

  async function toggleFollow() {
    if (!profile) return
    const next = !profile.is_following
    setProfile({ ...profile, is_following: next, follower_count: profile.follower_count + (next ? 1 : -1) })
    try {
      if (next) await follow(profile.user_id)
      else await unfollow(profile.user_id)
    }
    catch (e) { toast.show(e instanceof Error ? e.message : 'Error'); load() }
  }

  async function handleLike(p: SocialPost) {
    setPosts(prev => prev.map(x => x.id === p.id ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) } : x))
    try { await toggleLike(p.id, !!p.liked) }
    catch { setPosts(prev => prev.map(x => x.id === p.id ? { ...x, liked: p.liked, likes: p.likes } : x)); toast.show('No se pudo actualizar') }
  }

  async function handleDelete(id: number) {
    setPosts(prev => prev.filter(x => x.id !== id))
    try { await deletePost(id); toast.show('Publicación eliminada') }
    catch { toast.show('No se pudo eliminar'); load() }
  }

  if (loading) return <div className="empty-state" style={{ padding: 32 }}>Cargando perfil…</div>
  if (!profile) return (
    <div style={{ padding: 24 }}>
      <button onClick={onBack} className="btn-ghost">← Volver</button>
      <div className="empty-state">Perfil no encontrado</div>
    </div>
  )

  const badges = (profile.stats?.badges ?? []) as string[]

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} className="btn-ghost" style={{ marginBottom: 12 }}>← Volver</button>

      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <Avatar name={profile.display_name || profile.username} url={profile.avatar_url} size={64} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 22, color: 'var(--color-text)' }}>{profile.display_name || profile.username}</div>
            <div style={{ fontSize: 13, color: 'var(--color-dim)' }}>@{profile.username}</div>
          </div>
        </div>

        {profile.bio && <div style={{ fontSize: 13.5, color: 'var(--color-sub)', lineHeight: 1.5, marginBottom: 14, whiteSpace: 'pre-wrap' }}>{profile.bio}</div>}

        <div style={{ display: 'flex', gap: 24, marginBottom: 14 }}>
          <StatCol label="Publicaciones" value={posts.length} />
          <StatCol label="Seguidores" value={profile.follower_count} />
          <StatCol label="Siguiendo" value={profile.following_count} />
          {typeof profile.stats?.level === 'number' && <StatCol label="Nivel" value={profile.stats.level} />}
        </div>

        {!!badges.length && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {badges.map((b, i) => (
              <span key={i} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 99, background: 'color-mix(in srgb, var(--color-acc-gold) 14%, transparent)', color: 'var(--color-acc-gold)', border: '1px solid color-mix(in srgb, var(--color-acc-gold) 28%, transparent)' }}>🏅 {b}</span>
            ))}
          </div>
        )}

        {profile.is_me ? (
          <button onClick={() => setEditing(true)} className="btn-ghost" style={{ width: '100%' }}>Editar perfil</button>
        ) : (
          <button onClick={toggleFollow} className={profile.is_following ? 'btn-ghost' : 'btn-primary'} style={{ width: '100%', background: profile.is_following ? undefined : 'var(--color-acc-purple)' }}>
            {profile.is_following ? 'Siguiendo ✓' : 'Seguir'}
          </button>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="empty-state">Sin publicaciones todavía</div>
      ) : posts.map(p => (
        <PostCard key={p.id} post={p} onLike={handleLike} onComment={props.onComment} onRepost={props.onRepost} onDelete={setDeleteId} onOpenProfile={props.onOpenProfile} />
      ))}

      {editing && <EditProfile profile={profile} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load() }} />}
      <ConfirmDialog
        open={deleteId != null}
        title="¿Eliminar esta publicación?"
        confirmLabel="Eliminar"
        danger
        onConfirm={() => { if (deleteId != null) handleDelete(deleteId) }}
        onClose={() => setDeleteId(null)}
      />
    </div>
  )
}

function EditProfile({ profile, onClose, onSaved }: { profile: Profile; onClose: () => void; onSaved: () => void }) {
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [username, setUsername] = useState(profile.username)
  const [bio, setBio] = useState(profile.bio)
  const [avatar, setAvatar] = useState<string | null>(profile.avatar_url)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  async function pickAvatar(file: File) {
    try { setAvatar(await compressImage(file, 400, 0.8)) }
    catch { toast.show('No se pudo procesar la imagen') }
  }

  async function save() {
    setBusy(true)
    try {
      await updateMyProfile({ display_name: displayName.trim(), username: username.trim(), bio: bio.trim(), avatar_url: avatar })
      toast.show('✓ Perfil actualizado')
      onSaved()
    } catch (e) { toast.show(e instanceof Error ? e.message : 'No se pudo guardar') }
    finally { setBusy(false) }
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 40px', maxHeight: '90dvh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, background: 'var(--color-border2)', borderRadius: 99, margin: '0 auto 16px' }} />
        <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 20, marginBottom: 16 }}>Editar perfil</div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer', textAlign: 'center' }}>
            <Avatar name={displayName || username} url={avatar} size={80} />
            <div style={{ fontSize: 12, color: 'var(--color-acc-purple)', marginTop: 6 }}>Cambiar foto</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) pickAvatar(f) }} />
        </div>

        <input className="inp" style={{ marginBottom: 10 }} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Nombre" />
        <input className="inp" style={{ marginBottom: 10 }} value={username} onChange={e => setUsername(e.target.value)} placeholder="Nombre de usuario" />
        <textarea className="inp" style={{ marginBottom: 12, height: 80, resize: 'none' }} value={bio} onChange={e => setBio(e.target.value)} placeholder="Biografía" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button onClick={save} disabled={busy} className="btn-primary" style={{ background: 'var(--color-acc-purple)', opacity: busy ? 0.6 : 1 }}>{busy ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}
