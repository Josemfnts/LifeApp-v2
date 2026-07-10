import type { SocialPost } from '@/types/social'
import { Avatar } from './Avatar'
import { PostContent } from './PostContent'
import { typeMeta, timeAgo } from './helpers'
import { importLabel, importPost } from '@/lib/socialImport'
import { useToast } from '@/stores/toast'

interface Props {
  post: SocialPost
  onLike: (p: SocialPost) => void
  onComment: (p: SocialPost) => void
  onRepost: (p: SocialPost) => void
  onDelete: (id: number) => void
  onOpenProfile: (userId: string) => void
}

function TypeBadge({ type }: { type: SocialPost['type'] }) {
  const meta = typeMeta(type)
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
      color: meta.color, background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
      border: `1px solid color-mix(in srgb, ${meta.color} 22%, transparent)`,
      borderRadius: 6, padding: '3px 8px',
    }}>{meta.icon} {meta.label}</span>
  )
}

// Renderiza el contenido "de un post" (cabecera de tipo/título/cuerpo/imagen/detalle)
// sin la barra de acciones. Reutilizado para el original embebido en un repost.
function InnerPost({ post, embedded }: { post: SocialPost; embedded?: boolean }) {
  return (
    <>
      {post.title && <div style={{ padding: embedded ? '10px 12px 2px' : '0 14px 4px', fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{post.title}</div>}
      {post.body && <div style={{ padding: embedded ? '2px 12px 8px' : '0 14px 10px', fontSize: 13.5, color: 'var(--color-sub)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{post.body}</div>}
      {post.image_url && <img src={post.image_url} alt="" style={{ width: '100%', display: 'block', maxHeight: 420, objectFit: 'cover' }} />}
      <PostContent post={post} />
    </>
  )
}

export function PostCard({ post, onLike, onComment, onRepost, onDelete, onOpenProfile }: Props) {
  const meta = typeMeta(post.type)
  const toast = useToast()
  const isRepost = post.repost_of != null && !!post.data?.original
  const original = post.data?.original

  // "Usar esta rutina/receta/menú": importa el contenido a mis datos. En un
  // repost se importa el original embebido. No se ofrece sobre posts propios.
  const impType = isRepost && original ? original.type : post.type
  const impData = isRepost && original ? original.data : post.data
  const impTitle = isRepost && original ? original.title : post.title
  const impLabel = !post.mine ? importLabel(impType, impData) : null

  function handleImport() {
    try { toast.show(importPost(impType, impTitle, impData ?? {})) }
    catch (e) { toast.show(e instanceof Error ? e.message : 'No se pudo importar') }
  }

  return (
    <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
      {isRepost && (
        <div style={{ fontSize: 11.5, color: 'var(--color-dim)', padding: '8px 14px 0', display: 'flex', alignItems: 'center', gap: 5 }}>
          🔁 {post.author} compartió
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
        <Avatar name={post.author} url={post.avatar_url} color={meta.color} onClick={() => onOpenProfile(post.user_id)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer' }} onClick={() => onOpenProfile(post.user_id)}>{post.author}</div>
          <div style={{ fontSize: 11, color: 'var(--color-dim)' }}>{timeAgo(post.created_at)}</div>
        </div>
        {!isRepost && <TypeBadge type={post.type} />}
        {post.mine && <button onClick={() => onDelete(post.id)} style={{ background: 'none', border: 'none', color: 'var(--color-dim)', fontSize: 13, cursor: 'pointer', padding: 2 }}>✕</button>}
      </div>

      {isRepost && original ? (
        <>
          {post.body && <div style={{ padding: '0 14px 10px', fontSize: 13.5, color: 'var(--color-sub)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{post.body}</div>}
          <div style={{ margin: '0 14px 12px', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 4px' }}>
              <Avatar name={original.author} size={26} color={typeMeta(original.type).color} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{original.author}</span>
              <TypeBadge type={original.type} />
            </div>
            <InnerPost post={{ ...post, ...original, data: original.data } as SocialPost} embedded />
          </div>
        </>
      ) : (
        <InnerPost post={post} />
      )}

      {impLabel && (
        <div style={{ padding: '0 14px 12px' }}>
          <button onClick={handleImport} style={{
            width: '100%', padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
            fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif',
            background: 'color-mix(in srgb, var(--color-acc-green) 10%, transparent)',
            color: 'var(--color-acc-green)',
            border: '1px solid color-mix(in srgb, var(--color-acc-green) 25%, transparent)',
          }}>⤓ {impLabel}</button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderTop: '1px solid var(--color-border)' }}>
        <ActionBtn active={post.liked} activeColor="var(--color-red)" onClick={() => onLike(post)}
          icon={post.liked ? '♥' : '♡'} label={post.likes > 0 ? String(post.likes) : 'Me gusta'} />
        <ActionBtn onClick={() => onComment(post)} icon="💬" label={post.comment_count > 0 ? String(post.comment_count) : 'Comentar'} />
        <ActionBtn onClick={() => onRepost(post)} icon="🔁" label={post.repost_count > 0 ? String(post.repost_count) : 'Compartir'} />
      </div>
    </div>
  )
}

function ActionBtn({ icon, label, onClick, active, activeColor }: {
  icon: string; label: string; onClick: () => void; active?: boolean; activeColor?: string
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer',
      color: active ? (activeColor ?? 'var(--color-acc-blue)') : 'var(--color-dim)',
      fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', padding: '5px 10px',
    }}>
      <span style={{ fontSize: 15 }}>{icon}</span>{label}
    </button>
  )
}
