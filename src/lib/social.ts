import { supabase } from './supabase'

export type PostType = 'workout' | 'pr' | 'meal' | 'recipe' | 'photo' | 'text'

export interface SocialPost {
  id: number
  user_id: string
  author: string
  type: PostType
  title: string
  body: string
  data: Record<string, unknown>
  image_url: string | null
  likes: number
  created_at: string
  liked?: boolean
  mine?: boolean
}

export interface NewPost {
  type: PostType
  title?: string
  body?: string
  data?: Record<string, unknown>
  image_url?: string | null
}

async function currentUser() {
  const { data } = await supabase.auth.getUser()
  return data.user
}

export async function isSignedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  return !!data.session
}

export async function createPost(post: NewPost): Promise<void> {
  const user = await currentUser()
  if (!user) throw new Error('Inicia sesión para publicar en la comunidad')
  const author = localStorage.getItem('lifeos_username_v1') || user.email?.split('@')[0] || 'Anónimo'
  const { error } = await supabase.from('social_posts').insert({
    user_id: user.id,
    author,
    type: post.type,
    title: post.title ?? '',
    body: post.body ?? '',
    data: post.data ?? {},
    image_url: post.image_url ?? null,
  })
  if (error) throw error
}

export async function fetchFeed(): Promise<SocialPost[]> {
  const user = await currentUser()
  const { data, error } = await supabase
    .from('social_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  const posts = (data ?? []) as SocialPost[]
  let liked = new Set<number>()
  if (user && posts.length) {
    const { data: likes } = await supabase.from('social_likes').select('post_id').eq('user_id', user.id)
    liked = new Set((likes ?? []).map((l: { post_id: number }) => l.post_id))
  }
  return posts.map(p => ({ ...p, liked: liked.has(p.id), mine: !!user && p.user_id === user.id }))
}

export async function toggleLike(postId: number, currentlyLiked: boolean): Promise<void> {
  const user = await currentUser()
  if (!user) throw new Error('Inicia sesión para dar me gusta')
  if (currentlyLiked) {
    const { error } = await supabase.from('social_likes').delete().eq('post_id', postId).eq('user_id', user.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('social_likes').insert({ post_id: postId, user_id: user.id })
    if (error) throw error
  }
}

export async function deletePost(id: number): Promise<void> {
  const { error } = await supabase.from('social_posts').delete().eq('id', id)
  if (error) throw error
}

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
