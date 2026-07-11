import { NavLink, useNavigate } from 'react-router-dom'

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
    <nav className="nav-bar">
      <NavLink to="/agenda" onClick={go('/agenda')} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Agenda
      </NavLink>
      <NavLink to="/fisico" onClick={go('/fisico')} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Físico
      </NavLink>
      <NavLink to="/" onClick={go('/')} className="nav-center">
        <div className="nav-home">👤</div>
        <div className="nav-center-label">Inicio</div>
      </NavLink>
      <NavLink to="/nutricion" onClick={go('/nutricion')} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Nutrición
      </NavLink>
      <NavLink to="/finanzas" onClick={go('/finanzas')} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Finanzas
      </NavLink>
    </nav>
  )
}
