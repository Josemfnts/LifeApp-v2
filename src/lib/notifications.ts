// Push notification helpers for Life OS

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

  const dbH = JSON.parse(localStorage.getItem('lifeos_habits_v1') || '[]')
  const dbL = JSON.parse(localStorage.getItem('lifeos_habits_log_v1') || '{}')
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
