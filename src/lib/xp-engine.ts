import type { LevelInfo } from '@/types'

export function xpForLevel(l: number): number {
  return l * 100
}

export function calcLevel(total: number): LevelInfo {
  // Si el dato de storage llega corrupto (NaN/Infinity/negativo), el while de
  // abajo no terminaría nunca y colgaría la pestaña entera. Saneamos y acotamos.
  if (!Number.isFinite(total) || total < 0) total = 0
  total = Math.min(total, 1e9)
  let level = 1
  let current = 0
  while (total >= current + xpForLevel(level)) {
    current += xpForLevel(level)
    level++
  }
  const needed = xpForLevel(level)
  const pct = ((total - current) / needed) * 100
  return { level, current: total - current, needed, pct }
}

export function getGlobalLevel(xpAreas: Record<string, { total: number }>): LevelInfo {
  const areas = ['disc', 'fuerza', 'intel', 'riqueza']
  const grand = areas.reduce((sum, a) => sum + (xpAreas[a]?.total || 0), 0)
  const avg = Math.floor(grand / 4)
  return calcLevel(avg)
}

export function calcCombinedStreak(xpAreas: Record<string, { total: number; log: { date: string }[] }>): number {
  const allDates = new Set<string>()
  const areas = ['disc', 'fuerza', 'intel', 'riqueza']
  areas.forEach(a => {
    (xpAreas[a]?.log || []).forEach(e => {
      if (e.date) allDates.add(e.date)
    })
  })
  let streak = 0
  const d = new Date()
  for (let i = 0; i < 365; i++) {
    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (allDates.has(dStr)) streak++
    else if (i > 0) break
    d.setDate(d.getDate() - 1)
  }
  return streak
}
