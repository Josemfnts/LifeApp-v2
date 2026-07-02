import { supabase } from './supabase'
import { ALL_STORAGE_KEYS } from './storageKeys'

// Check if user is logged in
async function isLoggedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  return !!data.session
}

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

// Load data from Supabase or localStorage
export async function loadFromCloud<T>(key: string, fallback: T): Promise<T> {
  try {
    const loggedIn = await isLoggedIn()
    if (!loggedIn) {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : fallback
    }
    // Try Supabase first
    const userId = await getUserId()
    if (!userId) {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : fallback
    }
    const { data, error } = await supabase.from('store_data').select('value').eq('user_id', userId).eq('key', key).single()
    if (!error && data?.value) return JSON.parse(data.value) as T
    // Fallback to localStorage
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  }
}

// Save data to both Supabase and localStorage
export async function saveToCloud(key: string, value: unknown): Promise<void> {
  localStorage.setItem(key, JSON.stringify(value))
  try {
    const loggedIn = await isLoggedIn()
    if (loggedIn) {
      const userId = await getUserId()
      if (!userId) return
      const { error } = await supabase.from('store_data').upsert(
        { user_id: userId, key, value: JSON.stringify(value), updated_at: new Date().toISOString() },
        { onConflict: 'user_id,key' }
      )
      if (error) throw error
    }
  } catch (e) {
    console.warn('saveToCloud failed', key, e)
  }
}

// Sync all local data to cloud (called after login)
export async function syncAllToCloud(): Promise<void> {
  const loggedIn = await isLoggedIn()
  if (!loggedIn) return
  const userId = await getUserId()
  if (!userId) return
  for (const key of ALL_STORAGE_KEYS) {
    const raw = localStorage.getItem(key)
    if (raw) {
      const { error } = await supabase.from('store_data').upsert(
        { user_id: userId, key, value: raw, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,key' }
      )
      if (error) throw error
    }
  }
}

// Download cloud data to localStorage (called after login on new device)
export async function downloadFromCloud(): Promise<void> {
  const loggedIn = await isLoggedIn()
  if (!loggedIn) return
  const userId = await getUserId()
  if (!userId) return
  const { data, error } = await supabase.from('store_data').select('key, value').eq('user_id', userId)
  if (error) throw error
  if (data) {
    data.forEach((row: { key: string; value: string }) => {
      if (row.value) localStorage.setItem(row.key, row.value)
    })
  }
}
