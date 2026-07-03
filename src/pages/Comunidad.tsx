import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchFeed, createPost, toggleLike, deletePost, compressImage, isSignedIn, type SocialPost, type PostType, type NewPost } from '@/lib/social'
import { useToast } from '@/stores/toast'

const TYPE_META: Record<PostType, { label: string; color: string }> = {
  workout: { label: 'Entreno', color: 'var(--color-acc-orange)' },
  pr: { label: 'Récord', color: 'var(--color-acc-gold)' },
  meal: { label: 'Comida', color: 'var(--color-acc-green)' },
  recipe: { label: 'Receta', color: 'var(--color-acc-green)' },
  photo: { label: 'Foto', color: 'var(--color-acc-purple)' },
  text: { label: 'Nota', color: 'var(--color-acc-blue)' },
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'ahora'
  const m = Math.floor(s / 60); if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60); if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24); if (d < 7) return `hace ${d} d`
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || '??'
}

export default function Comunidad() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [signed, setSigned] = useState(false)
  const [error, setError] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const ok = await isSignedIn()
      setSigned(ok)
      if (ok) setPosts(await fetchFeed())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el feed')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleLike(p: SocialPost) {
    // optimista
    setPosts(prev => prev.map(x => x.id === p.id ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) } : x))
    try { await toggleLike(p.id, !!p.liked) }
    catch { setPosts(prev => prev.map(x => x.id === p.id ? { ...x, liked: p.liked, likes: p.likes } : x)); toast.show('No se pudo actualizar') }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar esta publicación?')) return
    setPosts(prev => prev.filter(x => x.id !== id))
    try { await deletePost(id); toast.show('Publicación eliminada') }
    catch { toast.show('No se pudo eliminar'); load() }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-module" style={{ color: 'var(--color-acc-purple)' }}>Comunidad</div>
        <div className="page-title">Feed</div>
        <div style={{ height: 14 }} />
      </div>

      <div style={{ padding: 16 }}>
        {loading ? (
          <div className="empty-state">Cargando feed…</div>
        ) : !signed ? (
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 28, textAlign: 'center' }}>
            <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 20, color: 'var(--color-text)', marginBottom: 8 }}>Únete a la comunidad</div>
            <div style={{ fontSize: 13, color: 'var(--color-sub)', marginBottom: 18, lineHeight: 1.5 }}>Inicia sesión para ver lo que comparten otros y publicar tus entrenos, récords, platos y fotos.</div>
            <button onClick={() => window.dispatchEvent(new CustomEvent('show-login'))} className="btn-primary" style={{ background: 'var(--color-acc-purple)' }}>Iniciar sesión</button>
          </div>
        ) : error ? (
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--color-red)', marginBottom: 12 }}>{error}</div>
            <button onClick={load} className="btn-ghost">Reintentar</button>
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-sub)', marginBottom: 6 }}>El feed está vacío</div>
            <div>Sé el primero en compartir algo con la comunidad.</div>
          </div>
        ) : (
          posts.map(p => {
            const meta = TYPE_META[p.type] || TYPE_META.text
            return (
              <div key={p.id} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: `color-mix(in srgb, ${meta.color} 22%, var(--color-s2))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: meta.color }}>{initials(p.author)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{p.author}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-dim)' }}>{timeAgo(p.created_at)}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: meta.color, background: `color-mix(in srgb, ${meta.color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${meta.color} 22%, transparent)`, borderRadius: 6, padding: '3px 8px' }}>{meta.label}</span>
                  {p.mine && <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', color: 'var(--color-dim)', fontSize: 13, cursor: 'pointer', padding: 2 }}>✕</button>}
                </div>

                {p.title && <div style={{ padding: '0 14px 4px', fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{p.title}</div>}
                {p.body && <div style={{ padding: '0 14px 10px', fontSize: 13.5, color: 'var(--color-sub)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{p.body}</div>}
                {p.image_url && <img src={p.image_url} alt="" style={{ width: '100%', display: 'block', maxHeight: 420, objectFit: 'cover' }} />}
                {p.type === 'workout' && typeof p.data?.totalKg === 'number' && (
                  <div style={{ display: 'flex', gap: 16, padding: '10px 14px', borderTop: '1px solid var(--color-border)' }}>
                    <Stat label="Volumen" value={`${p.data.totalKg} kg`} />
                    {typeof p.data.exercises === 'number' && <Stat label="Ejercicios" value={String(p.data.exercises)} />}
                    {typeof p.data.duration === 'number' && <Stat label="Duración" value={`${p.data.duration} min`} />}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderTop: '1px solid var(--color-border)' }}>
                  <button onClick={() => handleLike(p)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: p.liked ? 'var(--color-red)' : 'var(--color-dim)', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', padding: '4px 6px' }}>
                    <span style={{ fontSize: 15 }}>{p.liked ? '♥' : '♡'}</span>
                    {p.likes > 0 ? p.likes : 'Me gusta'}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {signed && !composerOpen && (
        <button onClick={() => setComposerOpen(true)}
          style={{ position: 'fixed', right: 18, bottom: 96, zIndex: 500, width: 54, height: 54, borderRadius: 18, border: 'none', cursor: 'pointer', background: 'linear-gradient(145deg,var(--color-acc-purple),var(--color-acc-blue))', color: '#fff', fontSize: 26, fontWeight: 300, boxShadow: '0 6px 22px color-mix(in srgb, var(--color-acc-purple) 40%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
      )}

      {composerOpen && <Composer onClose={() => setComposerOpen(false)} onPosted={() => { setComposerOpen(false); load() }} />}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 18, color: 'var(--color-text)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function Composer({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const [type, setType] = useState<PostType>('text')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  async function pickImage(file: File) {
    try { setImage(await compressImage(file)); if (type === 'text') setType('photo') }
    catch { toast.show('No se pudo procesar la imagen') }
  }

  async function submit() {
    if (!body.trim() && !image && !title.trim()) { toast.show('Escribe algo o añade una foto'); return }
    setBusy(true)
    try {
      const post: NewPost = { type, title: title.trim(), body: body.trim(), image_url: image }
      await createPost(post)
      toast.show('✓ Publicado en la comunidad')
      onPosted()
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'No se pudo publicar')
    } finally { setBusy(false) }
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 40px', maxHeight: '90dvh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, background: 'var(--color-border2)', borderRadius: 99, margin: '0 auto 16px' }} />
        <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 20, marginBottom: 14 }}>Nueva publicación</div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {(['text', 'photo'] as const).map(t => (
            <button key={t} onClick={() => setType(t)} style={{ flex: 1, padding: '9px 4px', borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid', background: type === t ? 'color-mix(in srgb, var(--color-acc-purple) 14%, transparent)' : 'var(--color-s2)', color: type === t ? 'var(--color-acc-purple)' : 'var(--color-dim)', borderColor: type === t ? 'color-mix(in srgb, var(--color-acc-purple) 30%, transparent)' : 'var(--color-border)' }}>
              {t === 'text' ? 'Nota' : 'Foto'}
            </button>
          ))}
        </div>

        <input className="inp" value={title} onChange={e => setTitle(e.target.value)} placeholder="Título (opcional)" />
        <textarea className="inp" value={body} onChange={e => setBody(e.target.value)} placeholder="¿Qué quieres compartir?" style={{ height: 100, resize: 'none' }} />

        {image ? (
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <img src={image} alt="" style={{ width: '100%', borderRadius: 12, maxHeight: 260, objectFit: 'cover', display: 'block' }} />
            <button onClick={() => setImage(null)} style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', cursor: 'pointer', fontSize: 13 }}>✕</button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} style={{ width: '100%', padding: 14, borderRadius: 12, marginBottom: 12, border: '1px dashed var(--color-border2)', background: 'var(--color-s2)', color: 'var(--color-sub)', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>Añadir foto</button>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) pickImage(f) }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button onClick={submit} disabled={busy} className="btn-primary" style={{ background: 'var(--color-acc-purple)', opacity: busy ? 0.6 : 1 }}>{busy ? 'Publicando…' : 'Publicar'}</button>
        </div>
      </div>
    </div>
  )
}
