// Sincronización con la nube (store_data) — escrituras SEGURAS.
//
// Regla de oro: nunca pisar a ciegas una versión de la nube que este
// dispositivo no haya visto (CompAI escribe en store_data por su cuenta).
// La "versión" de cada clave es su updated_at, que fija SIEMPRE el servidor
// (trigger de la migración 013); lifeos_sync_meta (mirror.ts) recuerda la
// última versión vista. Guardar = UPDATE condicionado a esa versión; si no
// coincide, se adopta la versión de la nube (evento a la UI incluido) y se
// re-aplica el cambio del usuario encima con UN único reintento.

import { supabase } from './supabase'
import { ALL_STORAGE_KEYS } from './storageKeys'
import { applyCloudRow, emitRemoteChange, getSyncMeta, resetSyncMeta, setSyncMeta } from './mirror'

// getSession lee la sesión persistida (no va a red): suficiente para user_id.
async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

/**
 * Intenta dejar `raw` en la nube sin pisar versiones no vistas.
 * true = escrito (y meta actualizada); false = conflicto (hay versión ajena).
 */
async function tryWrite(userId: string, key: string, raw: string): Promise<boolean> {
  const seen = getSyncMeta(key)

  if (seen) {
    // UPDATE condicionado a la última versión vista de esta clave.
    const { data, error } = await supabase
      .from('store_data')
      .update({ value: raw })
      .eq('user_id', userId)
      .eq('key', key)
      .eq('updated_at', seen)
      .select('updated_at')
    if (error) throw error
    if (data.length > 0) {
      setSyncMeta(key, data[0].updated_at)
      return true
    }
    // 0 filas: o la fila cambió bajo nuestros pies, o ya no existe.
    const { data: row, error: err2 } = await supabase
      .from('store_data')
      .select('updated_at')
      .eq('user_id', userId)
      .eq('key', key)
      .maybeSingle()
    if (err2) throw err2
    if (row) return false // versión ajena: conflicto real
    // La fila desapareció: cae al INSERT de abajo.
  }

  // Sin versión vista (o fila desaparecida): la clave no debería existir aún.
  // INSERT estricto (no upsert): si resulta que existe, es una versión ajena
  // que no hemos visto → conflicto, nunca se pisa a ciegas.
  const { data: ins, error: insError } = await supabase
    .from('store_data')
    .insert({ user_id: userId, key, value: raw })
    .select('updated_at')
  if (!insError) {
    if (ins.length > 0) setSyncMeta(key, ins[0].updated_at)
    return true
  }
  if (insError.code === '23505') return false // ya existe: conflicto
  throw insError
}

// Trae UNA clave de la nube y la aplica localmente (meta + localStorage +
// evento a la UI si el valor cambió).
async function pullKey(userId: string, key: string): Promise<void> {
  const { data, error } = await supabase
    .from('store_data')
    .select('key, value, updated_at')
    .eq('user_id', userId)
    .eq('key', key)
    .maybeSingle()
  if (error) throw error
  if (data) applyCloudRow(data)
}

async function pushToCloud(key: string, raw: string): Promise<void> {
  const userId = await getUserId()
  if (!userId) return

  if (await tryWrite(userId, key, raw)) return

  // Conflicto: la nube tiene una versión que no habíamos visto (CompAI u otro
  // dispositivo). La adoptamos localmente (los stores se recargan vía
  // 'lifeos:remote-change')…
  await pullKey(userId, key)
  // …y re-aplicamos el cambio del usuario encima, con UN único reintento.
  localStorage.setItem(key, raw)
  emitRemoteChange(key)
  if (await tryWrite(userId, key, raw)) return

  // Dos conflictos seguidos (carrera activa): gana la nube y este cambio se
  // queda solo en la UI hasta el próximo guardado — mejor que pisar a ciegas.
  await pullKey(userId, key)
  console.warn('saveToCloud: conflicto persistente en', key, '— se conserva la versión de la nube')
}

// Cola por clave: dos guardados rápidos de la misma clave se suben en orden
// (el segundo parte de la versión que dejó el primero, sin autoconflictos).
const writeQueue = new Map<string, Promise<void>>()

/**
 * Guarda en localStorage (siempre, primero) y en la nube (si hay sesión).
 * Los errores de nube se registran sin romper la UI: local-first.
 */
export function saveToCloud(key: string, value: unknown): Promise<void> {
  const raw = JSON.stringify(value)
  localStorage.setItem(key, raw)
  const prev = writeQueue.get(key) ?? Promise.resolve()
  const next = prev
    .then(() => pushToCloud(key, raw))
    .catch(e => console.warn('saveToCloud failed', key, e))
  writeQueue.set(key, next)
  return next
}

/**
 * Sincronización inicial tras iniciar sesión (o registrarse con sesión).
 * Orden anti-clobber: primero BAJA todo lo que exista en la nube (la nube gana
 * en esas claves; la UI se recarga vía eventos), después sube SOLO las claves
 * locales que la nube aún no tiene. Nunca se sube el localStorage entero a
 * ciegas encima de la nube.
 */
export async function syncOnLogin(): Promise<void> {
  const userId = await getUserId()
  if (!userId) return

  // El meta es "versiones de nube vistas" por dispositivo; al (re)entrar en
  // sesión se reconstruye desde cero para no arrastrar las de otra cuenta.
  resetSyncMeta()

  const { data, error } = await supabase
    .from('store_data')
    .select('key, value, updated_at')
    .eq('user_id', userId)
  if (error) throw error

  const rows = data ?? []
  const cloudKeys = new Set(rows.map(r => r.key))
  for (const row of rows) applyCloudRow(row)

  const missing = ALL_STORAGE_KEYS.filter(k => !cloudKeys.has(k) && localStorage.getItem(k) !== null)
  await Promise.all(missing.map(async key => {
    try {
      const raw = localStorage.getItem(key)
      if (raw !== null) await tryWrite(userId, key, raw)
    } catch (e) {
      console.warn('syncOnLogin: no se pudo subir', key, e)
    }
  }))
}

// Gancho SOLO-DEV para pruebas E2E (Vite lo elimina del build de producción).
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__lifeosSync = {
    saveToCloud, syncOnLogin, getSyncMeta, setSyncMeta,
  }
}
