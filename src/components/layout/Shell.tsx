import { Outlet } from 'react-router-dom'
import { NavBar } from './NavBar'
import { useToast } from '@/stores/toast'

export function Shell() {
  const { message, visible } = useToast()
  return (
    <div id="shell">
      <div id="sw">
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
