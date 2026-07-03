import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { XPProvider } from '@/contexts/XPContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Shell } from '@/components/layout/Shell'
import { SplashScreen } from '@/components/layout/SplashScreen'
import { lazy, Suspense, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { checkHabitReminders, checkAgendaReminders } from '@/lib/notifications'

// Navegación por teclado con leader key "g" (patrón GitHub/Gmail): pulsa g y
// luego 1-8. Va dentro del Router para navegar por SPA (useNavigate) en vez de
// window.location.href, que recargaba la página entera y destruía el estado en
// memoria — p.ej. una sesión de entrenamiento activa. Y no roba Ctrl+1..8, que
// el navegador usa para cambiar de pestaña.
function KeyboardShortcuts() {
  const navigate = useNavigate()
  useEffect(() => {
    const routes = ['/', '/agenda', '/habitos', '/fisico', '/nutricion', '/finanzas', '/diario', '/pomodoro', '/comunidad']
    let leader = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null
      const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return
      if (!leader) {
        if (e.key === 'g') { leader = true; if (timer) clearTimeout(timer); timer = setTimeout(() => { leader = false }, 1500) }
        return
      }
      leader = false
      if (timer) clearTimeout(timer)
      const num = parseInt(e.key)
      if (num >= 1 && num <= routes.length) { e.preventDefault(); navigate(routes[num - 1]) }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); if (timer) clearTimeout(timer) }
  }, [navigate])
  return null
}

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Agenda = lazy(() => import('@/pages/Agenda'))
const Habitos = lazy(() => import('@/pages/Habitos'))
const Fisico = lazy(() => import('@/pages/Fisico'))
const Nutricion = lazy(() => import('@/pages/Nutricion'))
const Finanzas = lazy(() => import('@/pages/Finanzas'))
const Pomodoro = lazy(() => import('@/pages/Pomodoro'))
const Diario = lazy(() => import('@/pages/Diario'))
const Comunidad = lazy(() => import('@/pages/Comunidad'))
const Login = lazy(() => import('@/pages/Login'))

const queryClient = new QueryClient()

function Loading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ color: 'var(--color-dim)', fontSize: 14 }}>Cargando...</div>
    </div>
  )
}

export default function App() {
  const [showLogin, setShowLogin] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setShowLogin(true)
      else { checkHabitReminders(); checkAgendaReminders() }
      setChecking(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setShowLogin(true)
    })
    const handler = () => setShowLogin(true)
    window.addEventListener('show-login', handler)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('show-login', handler)
    }
  }, [])

  if (checking) return <Loading />

  if (showLogin) {
    return (
      <ThemeProvider>
        <Suspense fallback={<Loading />}>
          <Login onDone={() => setShowLogin(false)} />
        </Suspense>
      </ThemeProvider>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <XPProvider>
        <ThemeProvider>
          <BrowserRouter>
            <KeyboardShortcuts />
            <SplashScreen />
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route element={<Shell />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/agenda" element={<Agenda />} />
                  <Route path="/habitos" element={<Habitos />} />
                  <Route path="/fisico" element={<Fisico />} />
                  <Route path="/nutricion" element={<Nutricion />} />
                  <Route path="/finanzas" element={<Finanzas />} />
                  <Route path="/pomodoro" element={<Pomodoro />} />
                  <Route path="/diario" element={<Diario />} />
                  <Route path="/comunidad" element={<Comunidad />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ThemeProvider>
      </XPProvider>
    </QueryClientProvider>
  )
}
