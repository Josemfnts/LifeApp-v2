import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { XPProvider } from '@/contexts/XPContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Shell } from '@/components/layout/Shell'
import { SplashScreen } from '@/components/layout/SplashScreen'
import { lazy, Suspense, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { checkHabitReminders, checkAgendaReminders } from '@/lib/notifications'
import { initRealtimeMirror } from '@/lib/realtime'

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
const Notas = lazy(() => import('@/pages/Notas'))
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
    // Espejo vivo: con sesión, escucha los cambios de store_data en la nube
    // (escrituras de CompAI u otros dispositivos) y refresca la UI al momento.
    initRealtimeMirror()
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

    // iOS Shortcut: auto-add Kanban card via URL param
    const params = new URLSearchParams(window.location.search)
    const kanbanText = params.get('kanban')
    if (kanbanText) {
      const priority = params.get('priority') || 'medium'
      const project = params.get('project') || ''
      const cards = JSON.parse(localStorage.getItem('kanban_cards_v1') || '[]')
      const projects = JSON.parse(localStorage.getItem('kanban_projects_v1') || '[]')

      let projectId = projects[0]?.id
      if (project && projects.length > 0) {
        const found = projects.find((p: { name: string }) => p.name.toLowerCase().includes(project.toLowerCase()))
        if (found) projectId = found.id
      }
      if (!projectId) {
        projectId = Date.now()
        projects.push({ id: projectId, name: project || 'Rápido', color: '#5b8af0' })
        localStorage.setItem('kanban_projects_v1', JSON.stringify(projects))
      }

      cards.push({
        id: Date.now(), text: decodeURIComponent(kanbanText), column: 'todo',
        priority, dueDate: '', labels: [], description: '',
        projectId,
      })
      localStorage.setItem('kanban_cards_v1', JSON.stringify(cards))

      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }

    // Default routines + weekly program setup
    if (!localStorage.getItem('fisico_routines')) {
      localStorage.setItem('fisico_routines', JSON.stringify([
        { id: Date.now(), name: 'Día A — Pierna, Cadera y Postura', exercises: [
          { name:'Bird-Dog',group:'Abdomen',color:'#a78bfa',sets:3 },
          { name:'Puente glúteo a una pierna',group:'Glúteos',color:'#f472b6',sets:3 },
          { name:'Peso muerto rumano mancuernas',group:'Piernas',color:'#e05f5f',sets:3 },
          { name:'Zancadas atrás',group:'Piernas',color:'#e05f5f',sets:3 },
          { name:'Press Pallof polea',group:'Abdomen',color:'#a78bfa',sets:3 },
        ]},
        { id: Date.now()+1, name: 'Día B — Torso Estético y Upper Body', exercises: [
          { name:'Bird-Dog',group:'Abdomen',color:'#a78bfa',sets:2 },
          { name:'Puente glúteo normal',group:'Glúteos',color:'#f472b6',sets:2 },
          { name:'Dominadas asistidas / Jalón pecho',group:'Espalda',color:'#5b8af0',sets:3 },
          { name:'Press inclinado mancuernas',group:'Pecho',color:'#e07a5f',sets:3 },
          { name:'Remo polea baja agarre neutro',group:'Espalda',color:'#5b8af0',sets:3 },
          { name:'Elevaciones laterales mancuernas',group:'Hombros',color:'#c9a84c',sets:3 },
        ]},
      ]))
    }
    if (!localStorage.getItem('fisico_mob_routines')) {
      localStorage.setItem('fisico_mob_routines', JSON.stringify([
        { id: Date.now(), name: 'Movilidad y reset (15 min)', focus:'full', exercises: [
          { name:'Gato-Camello — 10 reps',duration:60 },
          { name:'Péndulo 90/90 — 10 por lado',duration:60 },
          { name:'Lunge retroversión — 30s/lado',duration:60 },
          { name:'Isométrico cuádriceps — 3x45s',duration:180 },
        ]}
      ]))
    }
    if (!localStorage.getItem('fisico_weekly')) {
      localStorage.setItem('fisico_weekly', JSON.stringify({ routineId:'custom-weekly', dayMapping:{1:0,3:1,5:0} }))
    }

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
                {/* Notas: pantalla completa, fuera del Shell (sin barra inferior) */}
                <Route path="/notas" element={<Notas />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ThemeProvider>
      </XPProvider>
    </QueryClientProvider>
  )
}
