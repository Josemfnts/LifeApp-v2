import { saveToCloud } from './sync'

const STORAGE_PREFIX = 'lifeos_'

export function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function setItem<T>(key: string, value: T): void {
  const fullKey = STORAGE_PREFIX + key
  localStorage.setItem(fullKey, JSON.stringify(value))
  saveToCloud(fullKey, value)
}

export function removeItem(key: string): void {
  localStorage.removeItem(STORAGE_PREFIX + key)
}

export function getDisplayName(): string {
  return localStorage.getItem('lifeos_username_v1') || 'Josema'
}

export function setDisplayName(name: string): void {
  localStorage.setItem('lifeos_username_v1', name)
}

export function loadFromStorage<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback } catch { return fallback }
}

export function saveToStorage(key: string, val: unknown): void {
  localStorage.setItem(key, JSON.stringify(val))
  import('./sync').then(m => m.saveToCloud(key, val))
}

export function getBackupData(): Record<string, unknown> {
  const backup: Record<string, unknown> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('josema_rpg_') || key?.startsWith('lifeos_') || key?.startsWith('lifeos_')) {
      try {
        backup[key] = JSON.parse(localStorage.getItem(key)!)
      } catch {
        backup[key] = localStorage.getItem(key)
      }
    }
  }
  return backup
}

export function restoreBackup(data: Record<string, unknown>): void {
  Object.entries(data).forEach(([key, value]) => {
    localStorage.setItem(key, JSON.stringify(value))
  })
}
