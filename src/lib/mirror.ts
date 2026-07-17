// Espejo vivo — piezas compartidas entre la suscripción Realtime
// (lib/realtime.ts) y las escrituras seguras (lib/sync.ts).
//
// La app es local-first: localStorage manda y store_data es su espejo. Cuando
// el espejo cambia por fuera (CompAI desde el mini PC, otro dispositivo), la
// fila llega por Realtime o por una lectura de nube, se aplica a localStorage
// y se avisa a la UI con el evento 'lifeos:remote-change' para que el dueño de
// esa clave recargue su estado. lifeos_sync_meta guarda la última versión
// (updated_at) vista de cada clave: es lo que permite a saveToCloud detectar
// conflictos en vez de pisar escrituras ajenas.

import { useEffect, useRef } from 'react'

/** Evento emitido cuando una clave de localStorage cambió desde la nube. */
export const REMOTE_CHANGE_EVENT = 'lifeos:remote-change'

export interface RemoteChangeDetail { key: string }

// ---- lifeos_sync_meta: clave → updated_at (última versión de nube vista) ---
// Cache local por dispositivo; NUNCA se sube a la nube (no está en
// ALL_STORAGE_KEYS). Resetearlo es siempre seguro: como mucho cuesta una
// lectura extra en el siguiente guardado.

const META_KEY = 'lifeos_sync_meta'

function readMeta(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(META_KEY) || '{}') } catch { return {} }
}

export function getSyncMeta(key: string): string | null {
  return readMeta()[key] ?? null
}

export function setSyncMeta(key: string, updatedAt: string): void {
  const meta = readMeta()
  meta[key] = updatedAt
  localStorage.setItem(META_KEY, JSON.stringify(meta))
}

export function resetSyncMeta(): void {
  localStorage.removeItem(META_KEY)
}

// ---- aplicar una fila de la nube al almacenamiento local -------------------

export function emitRemoteChange(key: string): void {
  window.dispatchEvent(new CustomEvent<RemoteChangeDetail>(REMOTE_CHANGE_EVENT, { detail: { key } }))
}

/**
 * Aplica una fila de store_data (venga de Realtime o de una lectura) a
 * localStorage y avisa a la UI. Si el valor ya es idéntico no emite nada: eso
 * corta el eco de nuestras propias escrituras (saveToCloud escribe localStorage
 * ANTES de subir). Devuelve true si hubo cambio real.
 */
export function applyCloudRow(row: { key?: string; value?: unknown; updated_at?: string }): boolean {
  const { key, value } = row
  if (!key || typeof value !== 'string') return false
  if (row.updated_at) setSyncMeta(key, row.updated_at)
  if (localStorage.getItem(key) === value) return false
  localStorage.setItem(key, value)
  emitRemoteChange(key)
  return true
}

// ---- re-hidratación de estado ----------------------------------------------

/**
 * Para stores Zustand: registra un recargador por clave de storage. Se llama a
 * nivel de módulo en cada store; no hay unsubscribe porque los stores viven
 * todo el ciclo de vida de la app.
 */
export function onRemoteChange(handlers: Record<string, () => void>): void {
  window.addEventListener(REMOTE_CHANGE_EVENT, e => {
    const key = (e as CustomEvent<RemoteChangeDetail>).detail?.key
    if (key && handlers[key]) handlers[key]()
  })
}

/**
 * Para componentes/hooks con useState: ejecuta onChange cuando alguna de las
 * claves indicadas cambia desde la nube. keys y onChange pueden ser inline
 * (se leen por ref; no re-suscribe en cada render).
 */
export function useRemoteChange(keys: readonly string[], onChange: (key: string) => void): void {
  const cb = useRef(onChange)
  cb.current = onChange
  const ks = useRef(keys)
  ks.current = keys
  useEffect(() => {
    const h = (e: Event) => {
      const key = (e as CustomEvent<RemoteChangeDetail>).detail?.key
      if (key && ks.current.includes(key)) cb.current(key)
    }
    window.addEventListener(REMOTE_CHANGE_EVENT, h)
    return () => window.removeEventListener(REMOTE_CHANGE_EVENT, h)
  }, [])
}
