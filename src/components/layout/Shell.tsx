import { Outlet, useLocation } from 'react-router-dom'
import { NavBar } from './NavBar'
import { useToast } from '@/stores/toast'

export function Shell() {
  const { message, visible } = useToast()
  const location = useLocation()
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
