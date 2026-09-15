function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function getStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function localISO(d: Date = new Date()): string {
  return getStr(d)
}

export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7)
}

export function addMonthsISO(iso: string, n: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  const y = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (month < 1 || month > 12) return iso
  const targetMonth = month - 1 + n
  const targetYear = y + Math.floor(targetMonth / 12)
  const normalizedMonth = ((targetMonth % 12) + 12) % 12
  const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate()
  const finalDay = Math.min(day, lastDay)
  return `${targetYear}-${pad(normalizedMonth + 1)}-${pad(finalDay)}`
}

export function daysBetween(aISO: string, bISO: string): number {
  const a = Date.UTC(Number(aISO.slice(0, 4)), Number(aISO.slice(5, 7)) - 1, Number(aISO.slice(8, 10)))
  const b = Date.UTC(Number(bISO.slice(0, 4)), Number(bISO.slice(5, 7)) - 1, Number(bISO.slice(8, 10)))
  return Math.round((b - a) / 86400000)
}
