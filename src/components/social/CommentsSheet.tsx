import { useState, useEffect, useCallback } from 'react'
import { fetchComments, addComment, deleteComment, type SocialPost, type Comment } from '@/lib/social'
import { useToast } from '@/stores/toast'
import { Avatar } from './Avatar'
import { timeAgo } from './helpers'

export function CommentsSheet({ post, onClose, onChanged }: {
  post: SocialPost; onClose: () => void; onChanged: () => void
}) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try { setComments(await fetchComments(post.id)) }
    catch { toast.show('No se pudieron cargar los comentarios') }
    finally { setLoading(false) }
  }, [post.id, toast])

  useEffect(() => { load() }, [load])

  async function submit() {
    if (!text.trim()) return
    setBusy(true)
    try {
      await addComment(post.id, text)
      setText('')
      await load()
      onChanged()
    } catch (e) { toast.show(e instanceof Error ? e.message : 'No se pudo comentar') }
    finally { setBusy(false) }
  }

  async function remove(id: number) {
    setComments(prev => prev.filter(c => c.id !== id))
    try { await deleteComment(id); onChanged() }
    catch { toast.show('No se pudo eliminar'); load() }
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '20px 16px 24px', maxHeight: '85dvh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ width: 36, height: 4, background: 'var(--color-border2)', borderRadius: 99, margin: '0 auto 16px' }} />
        <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 18, marginBottom: 12 }}>Comentarios</div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 80 }}>
          {loading ? (
            <div className="empty-state">Cargando…</div>
          ) : comments.length === 0 ? (
            <div className="empty-state">Sé el primero en comentar</div>
          ) : comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
              <Avatar name={c.author} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{c.author}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-dim)' }}>{timeAgo(c.created_at)}</span>
                  {c.mine && <button onClick={() => remove(c.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--color-dim)', fontSize: 12, cursor: 'pointer' }}>✕</button>}
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--color-sub)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.body}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input className="inp" style={{ margin: 0, flex: 1 }} value={text} onChange={e => setText(e.target.value)} placeholder="Escribe un comentario…" onKeyDown={e => { if (e.key === 'Enter') submit() }} />
          <button onClick={submit} disabled={busy || !text.trim()} className="btn-primary" style={{ background: 'var(--color-acc-purple)', opacity: busy || !text.trim() ? 0.5 : 1 }}>Enviar</button>
        </div>
      </div>
    </div>
  )
}
