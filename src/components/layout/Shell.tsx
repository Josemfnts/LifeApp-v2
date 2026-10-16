import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { NavBar } from './NavBar'
import { useToast } from '@/stores/toast'
import { INITIAL_CHROME, nextChrome, type ChromeState } from '@/lib/ui/scrollChrome'

// Sub-rutas de Físico que también piden el mundo noche (Salud, running, etc.).
const FITNESS_PREFIXES = ['/fisico']

function surfaceForPath(pathname: string): string {
  return FITNESS_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))
    ? 'fitness'
    : ''
}

export function Shell() {
  const { message, visible } = useToast()
  const location = useLocation()

  // Ámbitos por ruta EN LA RAÍZ (data-surface="fitness" en <html>): las portales a body
  // (modales, toasts, la .nav-wrap fija) heredan así el mundo noche en Físico
  // sin tocar la preferencia guardada del usuario. Se re-aplica en cada navegación
  // y se limpia al desmontar (notas full-screen, login).
  useEffect(() => {
    const root = document.documentElement
    const surface = surfaceForPath(location.pathname)
    if (surface) root.setAttribute('data-surface', surface)
    else root.removeAttribute('data-surface')
    return () => { root.removeAttribute('data-surface') }
  }, [location.pathname])

  // Chrome que reacciona al scroll de #sw: data-header-collapsed compacta la cabecera y
  // data-nav-hidden esconde la barra inferior (CSS en globals.css, sin re-render de React).
  // Cada navegación remonta #sw, así que el estado vuelve a cero con location.key.
  useEffect(() => {
    const root = document.documentElement
    let state: ChromeState = INITIAL_CHROME
    let frame = 0
    const apply = () => {
      frame = 0
      const sw = document.getElementById('sw')
      if (!sw) return
      const next = nextChrome(state, sw.scrollTop, sw.scrollHeight - sw.clientHeight)
      if (next.collapsed !== state.collapsed) root.toggleAttribute('data-header-collapsed', next.collapsed)
      if (next.navHidden !== state.navHidden) root.toggleAttribute('data-nav-hidden', next.navHidden)
      state = next
    }
    // scroll no burbujea: se escucha en captura y solo cuenta el de #sw (no el de listas internas).
    const onScroll = (e: Event) => {
      if ((e.target as HTMLElement | null)?.id !== 'sw' || frame) return
      frame = requestAnimationFrame(apply)
    }
    document.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('scroll', onScroll, true)
      if (frame) cancelAnimationFrame(frame)
      root.removeAttribute('data-header-collapsed')
      root.removeAttribute('data-nav-hidden')
    }
  }, [location.key])

  return (
    <div id="shell">
      {/* key por location.key: cada navegación (incluido re-tocar el módulo
          actual, que la NavBar fuerza con un state nuevo) remonta la página y
          la devuelve a su pantalla inicial. */}
      <div id="sw" key={location.key}>
        <Outlet />
      </div>
      <NavBar />
      <div
        id="toast"
        className={visible ? 'show' : ''}
        style={{ display: visible ? 'flex' : 'none' }}
      >
        {message}
      </div>
    </div>
  )
}