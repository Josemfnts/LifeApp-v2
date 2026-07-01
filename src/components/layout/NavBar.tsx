import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'

export function NavBar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'flex flex-col items-center gap-1 px-0 py-0.5 cursor-pointer transition-colors duration-200',
      'text-[8px] font-semibold uppercase tracking-[0.8px]',
      isActive ? 'text-[var(--color-acc-blue)]' : 'text-[var(--color-dim)]'
    )

  return (
    <nav className="fixed bottom-0 w-full bg-[#0d0f13]/96 border-t border-white/[0.06] py-2.5 pb-7 flex items-center backdrop-blur-2xl z-[1000]">
      <NavLink to="/agenda" className={linkClass}>
        <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Agenda
      </NavLink>

      <NavLink to="/fisico" className={linkClass}>
        <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Físico
      </NavLink>

      <NavLink to="/" className={({ isActive }) => clsx('flex flex-col items-center cursor-pointer -mt-[18px]', isActive ? '' : '')} style={{ flex: '0 0 64px' }}>
        <div className="w-[52px] h-[52px] rounded-2xl bg-gradient-to-br from-[#6b9af5] to-[#4a79df] flex items-center justify-center text-2xl shadow-[0_6px_24px_rgba(91,138,240,0.45),0_1px_0_rgba(255,255,255,0.15)_inset]">
          👤
        </div>
        <div className="text-[8px] font-semibold text-[var(--color-blue)] mt-1.5 uppercase tracking-[0.8px]">Inicio</div>
      </NavLink>

      <NavLink to="/nutricion" className={linkClass}>
        <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Nutrición
      </NavLink>

      <NavLink to="/finanzas" className={linkClass}>
        <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Finanzas
      </NavLink>
    </nav>
  )
}
