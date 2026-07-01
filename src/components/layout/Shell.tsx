import { Outlet } from 'react-router-dom'
import { NavBar } from './NavBar'
import { useToast } from '@/stores/toast'

export function Shell() {
  const { message, visible } = useToast()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-[88px]">
        <Outlet />
      </div>
      <NavBar />
      <div
        className="fixed top-16 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full text-sm font-medium
          bg-[var(--color-s1)]/95 border border-white/[0.1] text-[var(--color-text)]
          shadow-xl backdrop-blur-xl pointer-events-none whitespace-nowrap z-[9998]
          transition-all duration-300"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translate(-50%, 0)' : 'translate(-50%, -8px)',
        }}
      >
        {message}
      </div>
    </div>
  )
}
