import { NavLink, useNavigate } from 'react-router-dom'
import { CalendarDays, Zap, House, UtensilsCrossed, Euro } from 'lucide-react'

const ITEMS = [
  { to: '/agenda',     label: 'Agenda',   Icon: CalendarDays    },
  { to: '/fisico',     label: 'Físico',   Icon: Zap             },
  { to: '/',           label: 'Inicio',   Icon: House           },
  { to: '/nutricion',  label: 'Nutrición',Icon: UtensilsCrossed },
  { to: '/finanzas',   label: 'Finanzas', Icon: Euro            },
] as const

export function NavBar() {
  const navigate = useNavigate()

  // Cada toque navega con un state nuevo (timestamp) → nueva location.key. El
  // Shell keyea el contenido por location.key, así re-tocar el módulo en el que
  // ya estás lo remonta y vuelve a su pantalla inicial (resetea sub-pestañas).
  const go = (to: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    navigate(to, { state: { nav: Date.now() } })
  }

  return (
    <div className="nav-wrap" data-nav-hidden-target>
      <nav className="nav-bar" aria-label="Navegación principal">
        {ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={go(to)}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            aria-label={label}
            aria-current={undefined}
          >
            {({ isActive }) => (
              <>
                <Icon aria-hidden="true" />
                <span aria-current={isActive ? 'page' : undefined}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}