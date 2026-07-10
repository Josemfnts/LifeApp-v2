import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles/globals.css'

// Vite emite este evento cuando falla la carga de un import dinámico (chunk
// purgado tras un deploy). Recargamos una vez para coger la versión nueva;
// la guarda de sessionStorage evita bucles si el fallo persiste (en ese caso
// deja que el error suba al ErrorBoundary, que muestra UI con botón).
window.addEventListener('vite:preloadError', (event) => {
  const key = `lifeos_chunk_reload:${window.location.pathname}`
  if (!sessionStorage.getItem(key)) {
    event.preventDefault()
    sessionStorage.setItem(key, '1')
    window.location.reload()
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
