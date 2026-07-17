// Espejo vivo — fase 1: la app VE al instante lo que CompAI (u otro
// dispositivo) escribe en store_data.
//
// Con sesión activa se abre UN canal postgres_changes (INSERT+UPDATE de
// public.store_data filtrado por user_id; Realtime respeta RLS, así que solo
// llegan filas propias). Cada fila entrante pasa por applyCloudRow (mirror.ts):
// actualiza localStorage + lifeos_sync_meta y emite 'lifeos:remote-change'
// para que el store dueño de la clave se recargue. En modo invitado no hay
// canal y todo funciona como siempre.
//
// Requiere la migración 013 (store_data en la publicación supabase_realtime).

import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { applyCloudRow } from './mirror'
import { useToast } from '@/stores/toast'

let channel: RealtimeChannel | null = null
let subscribedUid: string | null = null
let started = false

// Un solo aviso por ráfaga: CompAI suele tocar varias claves seguidas.
let toastTimer: ReturnType<typeof setTimeout> | null = null
function notifyRemoteUpdate(): void {
  if (toastTimer) return
  toastTimer = setTimeout(() => {
    toastTimer = null
    useToast.getState().show('⟳ Actualizado desde CompAI')
  }, 800)
}

function onRow(row: unknown): void {
  if (applyCloudRow((row ?? {}) as { key?: string; value?: unknown; updated_at?: string })) {
    notifyRemoteUpdate()
  }
}

function unsubscribe(): void {
  if (channel) {
    supabase.removeChannel(channel)
    channel = null
  }
  subscribedUid = null
}

function subscribe(uid: string): void {
  unsubscribe()
  subscribedUid = uid
  channel = supabase
    .channel(`store_data_mirror_${uid}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'store_data', filter: `user_id=eq.${uid}` },
      payload => onRow(payload.new))
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'store_data', filter: `user_id=eq.${uid}` },
      payload => onRow(payload.new))
    .subscribe()
}

/** Arranca el espejo vivo y lo mantiene pegado a la sesión. Idempotente. */
export function initRealtimeMirror(): void {
  if (started) return
  started = true
  supabase.auth.getSession().then(({ data: { session } }) => {
    const uid = session?.user?.id
    if (uid && uid !== subscribedUid) subscribe(uid)
  })
  supabase.auth.onAuthStateChange((_event, session) => {
    const uid = session?.user?.id ?? null
    if (!uid) unsubscribe()
    else if (uid !== subscribedUid) subscribe(uid)
  })
}
