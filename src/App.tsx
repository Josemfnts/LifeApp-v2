import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { XPProvider } from '@/contexts/XPContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Shell } from '@/components/layout/Shell'
import { SplashScreen } from '@/components/layout/SplashScreen'
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Agenda = lazy(() => import('@/pages/Agenda'))
const Habitos = lazy(() => import('@/pages/Habitos'))
const Fisico = lazy(() => import('@/pages/Fisico'))
const Nutricion = lazy(() => import('@/pages/Nutricion'))
const Finanzas = lazy(() => import('@/pages/Finanzas'))

const queryClient = new QueryClient()

function Loading() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-[var(--color-dim)] text-sm">Cargando...</div>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <XPProvider>
          <ThemeProvider>
            <BrowserRouter>
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
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ThemeProvider>
        </XPProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
