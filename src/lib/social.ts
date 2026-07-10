import { supabase } from './supabase'
import type {
  SocialPost, PostType, PostData, Profile, ProfileStats,
  Comment, Notification, FeedMode, RepostSnapshot,
} from '@/types/social'

export type {
  SocialPost, PostType, PostData, Profile, ProfileStats,
  Comment, Notification, FeedMode,
} from '@/types/social'

export interface NewPost {
  type: PostType
  title?: string
  body?: string
  data?: PostData
  image_url?: string | null
  repost_of?: number | null
}

const USERNAME_KEY = 'lifeos_username_v1'

async function currentUser() {
  const { data } = await supabase.auth.getUser()
  return data.user
}

function localName(fallback = 'Anónimo'): string {
  return localStorage.getItem(USERNAME_KEY) || fallback
}

export async function isSignedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  return !!data.session
}

export async function supabaseUserId(): Promise<string | null> {
  const user = await currentUser()
  return user?.id ?? null
}

// --- Perfiles ----------------------------------------------------------------

// Asegura que existe un perfil para el usuario actual (creación perezosa,
// local-first friendly: no dependemos de un trigger sobre auth.users).
export async function ensureMyProfile(): Promise<Profile | null> {
  const user = await currentUser()
  if (!user) return null
  const { data: existing } = await supabase
    .from('social_profiles').select('*').eq('user_id', user.id).maybeSingle()
  if (existing) return { ...(existing as Profile), is_me: true }

  const base = localName(user.email?.split('@')[0] || 'usuario')
  const username = await uniqueUsername(base)
  const { data, error } = await supabase.from('social_profiles').insert({
    user_id: user.id,
    username,
    display_name: base,
    bio: '',
  }).select('*').single()
  if (error) throw error
  return { ...(data as Profile), is_me: true }
}

async function uniqueUsername(base: string): Promise<string> {
  const slug = base.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'usuario'
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? slug : `${slug}${i}`
    const { data } = await supabase
      .from('social_profiles').select('user_id').ilike('username', candidate).maybeSingle()
    if (!data) return candidate
  }
  return `${slug}${Date.now().toString().slice(-4)}`
}

export async function updateMyProfile(patch: {
  display_name?: string; bio?: string; avatar_url?: string | null; username?: string; stats?: ProfileStats
}): Promise<void> {
  const user = await currentUser()
  if (!user) throw new Error('Inicia sesión')
  if (patch.username) {
    const { data } = await supabase
      .from('social_profiles').select('user_id').ilike('username', patch.username).maybeSingle()
    if (data && (data as { user_id: string }).user_id !== user.id) {
      throw new Error('Ese nombre de usuario ya está en uso')
    }
  }
  const { error } = await supabase
    .from('social_profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
  if (error) throw error
}

// Publica los stats calculados en local (nivel, entrenos, racha, insignias).
export async function publishStats(stats: ProfileStats): Promise<void> {
  const user = await currentUser()
  if (!user) return
  await supabase.from('social_profiles').update({ stats }).eq('user_id', user.id)
}

export async function getProfile(opts: { userId?: string; username?: string }): Promise<Profile | null> {
  const user = await currentUser()
  let q = supabase.from('social_profiles').select('*')
  q = opts.userId ? q.eq('user_id', opts.userId) : q.ilike('username', opts.username ?? '')
  const { data, error } = await q.maybeSingle()
  if (error) throw error
  if (!data) return null
  const profile = data as Profile
  let is_following = false
  if (user && user.id !== profile.user_id) {
    const { data: f } = await supabase.from('social_follows')
      .select('following_id').eq('follower_id', user.id).eq('following_id', profile.user_id).maybeSingle()
    is_following = !!f
  }
  return { ...profile, is_me: !!user && user.id === profile.user_id, is_following }
}

export async function searchUsers(query: string): Promise<Profile[]> {
  // Neutraliza los metacaracteres del filtro PostgREST `.or()` (coma, paréntesis,
  // comodines y backslash); sin esto una coma en la búsqueda rompe el filtro (400).
  const q = query.trim().replace(/[,()\\%*]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!q) return []
  const { data, error } = await supabase
    .from('social_profiles')
    .select('*')
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .limit(20)
  if (error) throw error
  return (data ?? []) as Profile[]
}

// --- Seguir ------------------------------------------------------------------

export async function follow(targetId: string): Promise<void> {
  const user = await currentUser()
  if (!user) throw new Error('Inicia sesión para seguir usuarios')
  const { error } = await supabase.from('social_follows')
    .insert({ follower_id: user.id, following_id: targetId })
  if (error) throw error
}

export async function unfollow(targetId: string): Promise<void> {
  const user = await currentUser()
  if (!user) return
  const { error } = await supabase.from('social_follows')
    .delete().eq('follower_id', user.id).eq('following_id', targetId)
  if (error) throw error
}

async function followingIds(): Promise<string[]> {
  const user = await currentUser()
  if (!user) return []
  const { data } = await supabase.from('social_follows')
    .select('following_id').eq('follower_id', user.id)
  return (data ?? []).map((r: { following_id: string }) => r.following_id)
}

// --- Feed --------------------------------------------------------------------

async function decorate(posts: SocialPost[], userId?: string): Promise<SocialPost[]> {
  let liked = new Set<number>()
  const avatars = new Map<string, string | null>()
  if (posts.length) {
    if (userId) {
      const { data: likes } = await supabase.from('social_likes')
        .select('post_id').eq('user_id', userId)
      liked = new Set((likes ?? []).map((l: { post_id: number }) => l.post_id))
    }
    const authorIds = [...new Set(posts.map(p => p.user_id))]
    const { data: profs } = await supabase.from('social_profiles')
      .select('user_id, avatar_url').in('user_id', authorIds)
    for (const p of (profs ?? []) as { user_id: string; avatar_url: string | null }[]) {
      avatars.set(p.user_id, p.avatar_url)
    }
  }
  return posts.map(p => ({
    ...p,
    liked: liked.has(p.id),
    mine: !!userId && p.user_id === userId,
    avatar_url: avatars.get(p.user_id) ?? null,
  }))
}

export async function fetchFeed(mode: FeedMode = 'explore', filter?: PostType): Promise<SocialPost[]> {
  const user = await currentUser()
  let query = supabase.from('social_posts').select('*').order('created_at', { ascending: false }).limit(100)
  if (filter) query = query.eq('type', filter)

  if (mode === 'following' && user) {
    const ids = await followingIds()
    ids.push(user.id) // incluye lo mío en el feed de seguidos
    query = query.in('user_id', ids)
  }
  const { data, error } = await query
  if (error) throw error
  return decorate((data ?? []) as SocialPost[], user?.id)
}

export async function fetchUserPosts(userId: string): Promise<SocialPost[]> {
  const user = await currentUser()
  const { data, error } = await supabase.from('social_posts')
    .select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100)
  if (error) throw error
  return decorate((data ?? []) as SocialPost[], user?.id)
}

// --- Crear / borrar posts ----------------------------------------------------

export async function createPost(post: NewPost): Promise<void> {
  const user = await currentUser()
  if (!user) throw new Error('Inicia sesión para publicar en la comunidad')
  await ensureMyProfile()
  const author = localName(user.email?.split('@')[0] || 'Anónimo')
  const { error } = await supabase.from('social_posts').insert({
    user_id: user.id,
    author,
    type: post.type,
    title: post.title ?? '',
    body: post.body ?? '',
    data: post.data ?? {},
    image_url: post.image_url ?? null,
    repost_of: post.repost_of ?? null,
  })
  if (error) throw error
}

export async function repost(original: SocialPost, comment = ''): Promise<void> {
  const snapshot: RepostSnapshot = {
    author: original.author,
    type: original.type,
    title: original.title,
    body: original.body,
    image_url: original.image_url,
    data: original.data ?? {},
  }
  await createPost({
    type: original.type,
    title: original.title,
    body: comment,
    data: { ...original.data, original: snapshot },
    image_url: original.image_url,
    repost_of: original.id,
  })
}

export async function deletePost(id: number): Promise<void> {
  const { error } = await supabase.from('social_posts').delete().eq('id', id)
  if (error) throw error
}

// --- Likes -------------------------------------------------------------------

export async function toggleLike(postId: number, currentlyLiked: boolean): Promise<void> {
  const user = await currentUser()
  if (!user) throw new Error('Inicia sesión para dar me gusta')
  if (currentlyLiked) {
    const { error } = await supabase.from('social_likes')
      .delete().eq('post_id', postId).eq('user_id', user.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('social_likes')
      .insert({ post_id: postId, user_id: user.id })
    if (error) throw error
  }
}

// --- Comentarios -------------------------------------------------------------

export async function fetchComments(postId: number): Promise<Comment[]> {
  const user = await currentUser()
  const { data, error } = await supabase.from('social_comments')
    .select('*').eq('post_id', postId).order('created_at', { ascending: true })
  if (error) throw error
  return ((data ?? []) as Comment[]).map(c => ({ ...c, mine: !!user && c.user_id === user.id }))
}

export async function addComment(postId: number, body: string): Promise<void> {
  const user = await currentUser()
  if (!user) throw new Error('Inicia sesión para comentar')
  const author = localName(user.email?.split('@')[0] || 'Anónimo')
  const { error } = await supabase.from('social_comments')
    .insert({ post_id: postId, user_id: user.id, author, body: body.trim() })
  if (error) throw error
}

export async function deleteComment(id: number): Promise<void> {
  const { error } = await supabase.from('social_comments').delete().eq('id', id)
  if (error) throw error
}

// --- Notificaciones ----------------------------------------------------------

export async function fetchNotifications(): Promise<Notification[]> {
  const user = await currentUser()
  if (!user) return []
  const { data, error } = await supabase.from('social_notifications')
    .select('*').order('created_at', { ascending: false }).limit(50)
  if (error) throw error
  return (data ?? []) as Notification[]
}

export async function unreadNotificationCount(): Promise<number> {
  const user = await currentUser()
  if (!user) return 0
  const { count } = await supabase.from('social_notifications')
    .select('id', { count: 'exact', head: true }).eq('read', false)
  return count ?? 0
}

export async function markNotificationsRead(): Promise<void> {
  const user = await currentUser()
  if (!user) return
  await supabase.from('social_notifications').update({ read: true }).eq('read', false)
}

// --- Imágenes ----------------------------------------------------------------

// Comprime una imagen a data URL (JPEG, lado máx ~1000px) para no meter blobs
// enormes en la columna. v1 sin Supabase Storage.
export function compressImage(file: File, maxSize = 1000, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Imagen no válida'))
      img.onload = () => {
        let { width, height } = img
        if (width > height && width > maxSize) { height = Math.round(height * maxSize / width); width = maxSize }
        else if (height > maxSize) { width = Math.round(width * maxSize / height); height = maxSize }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas no disponible')); return }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
