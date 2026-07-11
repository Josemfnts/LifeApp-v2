import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createPost, isSignedIn, type NewPost } from '@/lib/social'
import type { SocialPost } from '@/types/social'
import { useToast } from '@/stores/toast'
import { PostContent } from './PostContent'
import { typeMeta } from './helpers'

/**
 * Hoja de "Compartir en la comunidad" reutilizable desde cualquier módulo.
 * Recibe un NewPost ya construido (ver src/lib/socialShare.ts), enseña la
 * vista previa REAL (el mismo renderer del feed) y deja añadir un comentario.
 */
export function ShareSheet({ post, onClose, onShared }: {
  post: NewPost
  onClose: () => void
  onShared?: () => void
}) {
  const [comment, setComment] = useState(post.body ?? '')
  const [busy, setBusy] = useState(false)
  const [signed, setSigned] = useState<boolean | null>(null)
  const toast = useToast()
  const meta = typeMeta(post.type)

  useEffect(() => { isSignedIn().then(setSigned).catch(() => setSigned(false)) }, [])

  // Post "fantasma" solo para la vista previa (mismo shape que el feed)
  const preview = {
    id: 0, user_id: '', author: 'Tú', type: post.type,
    title: post.title ?? '', body: '', data: post.data ?? {},
    image_url: post.image_url ?? null, likes: 0, comment_count: 0,
    repost_count: 0, repost_of: null, created_at: new Date().toISOString(),
  } as SocialPost

  async function publish() {
    setBusy(true)
    try {
      await createPost({ ...post, body: comment.trim() })
      toast.show('✓ Compartido en la comunidad')
      onShared?.()
      onClose()
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'No se pudo compartir')
    } finally { setBusy(false) }
  }

  return createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px calc(28px + env(safe-area-inset-bottom,0px))', maxHeight: '90dvh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, background: 'var(--color-border2)', borderRadius: 99, margin: '0 auto 16px' }} />
        <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 20, marginBottom: 4 }}>Compartir en la comunidad</div>
        <div style={{ fontSize: 12.5, color: 'var(--color-dim)', marginBottom: 14 }}>Así lo verán los demás:</div>

        {/* Vista previa con el renderer real del feed */}
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden', marginBottom: 14, background: 'var(--color-s2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 4px' }}>
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
              color: meta.color, background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${meta.color} 22%, transparent)`,
              borderRadius: 6, padding: '3px 8px',
            }}>{meta.icon} {meta.label}</span>
          </div>
          {preview.title && <div style={{ padding: '6px 14px 4px', fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{preview.title}</div>}
          {post.image_url && <img src={post.image_url} alt="" style={{ width: '100%', display: 'block', maxHeight: 260, objectFit: 'cover' }} />}
          <PostContent post={preview} />
          {comment.trim() && (
            <div style={{ padding: '4px 14px 12px', fontSize: 13.5, color: 'var(--color-sub)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{comment}</div>
          )}
        </div>

        {signed === false ? (
          <div style={{ textAlign: 'center', padding: '4px 0 8px' }}>
            <div style={{ fontSize: 13, color: 'var(--color-sub)', marginBottom: 12 }}>Inicia sesión para compartir en la comunidad.</div>
            <button onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('show-login')) }} className="btn-primary" style={{ background: 'var(--color-acc-purple)' }}>Iniciar sesión</button>
          </div>
        ) : (
          <>
            <textarea className="inp" value={comment} onChange={e => setComment(e.target.value)} placeholder="Añade un comentario (opcional)" style={{ height: 70, resize: 'none', marginBottom: 12 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={onClose} className="btn-ghost">Cancelar</button>
              <button onClick={publish} disabled={busy || signed === null} className="btn-primary" style={{ background: 'var(--color-acc-purple)', opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Compartiendo…' : 'Compartir'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
