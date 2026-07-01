import { NavLink } from 'react-router-dom'

export function NavBar() {
  return (
    <nav className="nav-bar">
      <NavLink to="/agenda" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Agenda
      </NavLink>
      <NavLink to="/fisico" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Físico
      </NavLink>
      <NavLink to="/" className="nav-center">
        <div className="nav-home">👤</div>
        <div className="nav-center-label">Inicio</div>
      </NavLink>
      <NavLink to="/nutricion" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Nutrición
      </NavLink>
      <NavLink to="/finanzas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Finanzas
      </NavLink>
      <NavLink to="/diario" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Diario
      </NavLink>
    </nav>
  )
}
