import { CAT_META } from '@/stores/financeStore'
import type { Recurrente } from '@/lib/finance/types'

export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function catsOf(type: 'income' | 'expense'): string[] {
  return Object.entries(CAT_META).filter(([, m]) => m.type === type).map(([c]) => c)
}

export function shortDate(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${SHORT[Number(iso.slice(5, 7)) - 1]}`
}

export function freqLabel(r: Recurrente): string {
  const n = Math.max(1, r.interval ?? 1)
  const freq = r.freq ?? 'monthly'
  if (freq === 'weekly') return n > 1 ? `Cada ${n} semanas` : 'Cada semana'
  if (freq === 'yearly') {
    const month = r.startDate ? MONTHS[Number(r.startDate.slice(5, 7)) - 1] : ''
    return `${n > 1 ? `Cada ${n} años` : 'Cada año'}, ${r.day}${month ? ` de ${month}` : ''}`
  }
  return `${n > 1 ? `Cada ${n} meses` : 'Cada mes'}, día ${r.day}`
}
