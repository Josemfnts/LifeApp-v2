import { Component, type ReactNode } from 'react'

// Marca de "ya recargué por esta URL" para no entrar en bucle de recargas si
// el error persiste tras refrescar.
const RELOAD_FLAG = 'lifeos_chunk_reload'

function isChunkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(msg)
}

interface Props { children: ReactNode }
interface State { error: Error | null }

// Red de seguridad global. Sin esto, cualquier excepción durante el render
// (típicamente un chunk lazy que ya no existe tras un deploy: la PWA autoUpdate
// activa el SW nuevo, Vercel purga los assets viejos y el import dinámico da
// 404) desmonta TODA la app y deja la pantalla en negro hasta recargar a mano.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    if (isChunkError(error)) {
      const key = `${RELOAD_FLAG}:${window.location.pathname}`
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1')
        window.location.reload()
      }
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    const chunk = isChunkError(this.state.error)
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--color-bg, #0b0c10)' }}>
        <div style={{ maxWidth: 380, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{chunk ? '🔄' : '⚠️'}</div>
          <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 22, color: 'var(--color-text, #fff)', marginBottom: 8 }}>
            {chunk ? 'Hay una versión nueva' : 'Algo ha fallado'}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--color-sub, #9aa0ab)', lineHeight: 1.5, marginBottom: 20 }}>
            {chunk
              ? 'La app se ha actualizado mientras la usabas. Recarga para cargar la versión nueva.'
              : 'Se ha producido un error inesperado. Tus datos están a salvo en el dispositivo.'}
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem(`${RELOAD_FLAG}:${window.location.pathname}`)
              window.location.reload()
            }}
            style={{ padding: '12px 28px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'var(--color-acc-purple, #7c6cf0)', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans,sans-serif' }}>
            Recargar
          </button>
        </div>
      </div>
    )
  }
}
