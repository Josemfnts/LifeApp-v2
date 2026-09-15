// Push notification helpers for Life OS
import { computeFinanceAlerts } from '@/lib/finance/alerts'
import { localISO } from '@/lib/finance/dates'
import { LOCAL_ONLY_KEYS, STORE_KEYS } from '@/lib/storageKeys'

export async function requestPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8('BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkS4AlY6Gk1aV5kRnBqG8qF0jZqEGq2Dh2pJqFhqZI')
    })
    return sub
  } catch { return null }
}

function urlB64ToUint8(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  return rawData
}

export function scheduleReminder(title: string, options: NotificationOptions, delayMs: number) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  setTimeout(() => {
    const sub = localStorage.getItem('push_subscription')
    if (sub) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, {
          ...options,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'lifeos-reminder',
        })
      })
    }
  }, delayMs)
}

// Check for pending reminders on app load
export function checkHabitReminders() {
  const enabled = localStorage.getItem('lifeos_notif_habits') === 'true'
  if (!enabled) return
  const lastCheck = localStorage.getItem('lifeos_last_notif_check') || ''
  const today = new Date().toISOString().slice(0, 10)
  if (lastCheck === today) return

  const dbH = JSON.parse(localStorage.getItem('lifeos_habits') || '[]')
  const dbL = JSON.parse(localStorage.getItem('lifeos_habits_log') || '{}')
  const dow = new Date().getDay()
  const active = dbH.filter((h: { freq: string; days: number[] }) => {
    if (h.freq === 'daily') return true
    if (h.freq === 'weekdays') return dow >= 1 && dow <= 5
    if (h.freq === 'weekend') return dow === 0 || dow === 6
    if (h.freq === 'custom') return (h.days || []).includes(dow)
    return true
  })
  const undone = active.filter((h: { id: number; type: string; goal: number }) => {
    const val = (dbL[today] || {})[h.id] || 0
    if (h.type === 'avoid') return val !== 0
    return h.type === 'bool' ? !val : val < h.goal
  })

  if (undone.length > 0) {
    scheduleReminder('💪 Hábitos pendientes', {
      body: `Tienes ${undone.length} hábito${undone.length > 1 ? 's' : ''} por completar hoy`,
      requireInteraction: false,
    }, 5000)
  }
  localStorage.setItem('lifeos_last_notif_check', today)
}

// Avisos de Finanzas (cargo previsto, presupuesto al 80 %/superado, resumen del mes). Cada aviso tiene un
// id estable y se apunta en finances_alerts_sent (solo local) para no repetirlo en cada apertura.
export function checkFinanceReminders() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const read = <T>(key: string, fallback: T): T => {
    try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback } catch { return fallback }
  }
  const sent = read<string[]>(LOCAL_ONLY_KEYS.finances_alerts_sent, [])
  const alerts = computeFinanceAlerts({
    txs: read(STORE_KEYS.finances_tx, []),
    presupuestos: read(STORE_KEYS.finances_budgets, []),
    recurrentes: read(STORE_KEYS.finances_recurring, []),
  }, localISO())
  const fresh = alerts.filter(a => !sent.includes(a.id))
  fresh.forEach((a, i) => scheduleReminder(`💶 ${a.title}`, { body: a.body, requireInteraction: false }, 5000 + i * 1500))
  if (fresh.length > 0) {
    localStorage.setItem(LOCAL_ONLY_KEYS.finances_alerts_sent, JSON.stringify([...sent, ...fresh.map(a => a.id)].slice(-300)))
  }
}

export function checkAgendaReminders() {
  const enabled = localStorage.getItem('lifeos_notif_agenda') === 'true'
  if (!enabled) return
  const dbT = JSON.parse(localStorage.getItem('agenda_tasks') || '{}')
  const today = new Date().toISOString().slice(0, 10)
  const tasks = dbT[today] || []
  const undone = tasks.filter((t: { done: boolean }) => !t.done)
  if (undone.length > 0) {
    scheduleReminder('📋 Tareas pendientes', {
      body: `${undone.length} tarea${undone.length > 1 ? 's' : ''} por hacer hoy`,
      requireInteraction: false,
    }, 5000)
  }
}
