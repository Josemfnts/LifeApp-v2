import type { PostType } from '@/types/social'

export const TYPE_META: Record<PostType, { label: string; color: string; icon: string }> = {
  workout:  { label: 'Entreno',  color: 'var(--color-acc-orange)', icon: '🏋️' },
  routine:  { label: 'Rutina',   color: 'var(--color-acc-orange)', icon: '📋' },
  pr:       { label: 'Récord',   color: 'var(--color-acc-gold)',   icon: '🏅' },
  meal:     { label: 'Comida',   color: 'var(--color-acc-green)',  icon: '🍽️' },
  recipe:   { label: 'Receta',   color: 'var(--color-acc-green)',  icon: '👩‍🍳' },
  diet:     { label: 'Dieta',    color: 'var(--color-acc-green)',  icon: '🥗' },
  goal:     { label: 'Objetivo', color: 'var(--color-acc-blue)',   icon: '🎯' },
  progress: { label: 'Progreso', color: 'var(--color-acc-purple)', icon: '📈' },
  photo:    { label: 'Foto',     color: 'var(--color-acc-purple)', icon: '📷' },
  text:     { label: 'Nota',     color: 'var(--color-acc-blue)',   icon: '📝' },
}

export function typeMeta(type: PostType) {
  return TYPE_META[type] ?? TYPE_META.text
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'ahora'
  const m = Math.floor(s / 60); if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60); if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24); if (d < 7) return `hace ${d} d`
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || '??'
}
