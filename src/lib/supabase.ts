import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
})

export type SupabaseUser = Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
}

// Sync helper: upsert data to Supabase
export async function syncToSupabase(table: string, data: Record<string, unknown>[]) {
  const { data: user } = await supabase.auth.getUser()
  if (!user?.user) return
  const withUser = data.map(d => ({ ...d, user_id: user.user!.id }))
  const { error } = await supabase.from(table).upsert(withUser, { onConflict: 'id' })
  if (error) console.error('Sync error:', table, error)
}

// Fetch data from Supabase
export async function fetchFromSupabase(table: string) {
  const { data: user } = await supabase.auth.getUser()
  if (!user?.user) return []
  const { data, error } = await supabase.from(table).select('*').eq('user_id', user.user.id)
  if (error) { console.error('Fetch error:', table, error); return [] }
  return data || []
}
