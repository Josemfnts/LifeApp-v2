import type { DebtKind } from '@/lib/finance/debts'
import type { Property } from '@/lib/finance/properties'

export const DEBT_KIND: Record<DebtKind, { label: string; icon: string }> = {
  mortgage: { label: 'Hipoteca', icon: '🏠' },
  loan: { label: 'Préstamo', icon: '💸' },
  card: { label: 'Tarjeta', icon: '💳' },
  personal: { label: 'Personal', icon: '🤝' },
}

export const PROPERTY_KIND: Record<Property['kind'], { label: string; icon: string }> = {
  home: { label: 'Vivienda', icon: '🏠' },
  rental: { label: 'Alquiler', icon: '🏘️' },
  garage: { label: 'Garaje', icon: '🚗' },
  land: { label: 'Terreno', icon: '🌾' },
  other: { label: 'Otro', icon: '🏗️' },
}

// 0.0325 → "3,25" para rellenar inputs de porcentaje.
export function pctInput(x?: number): string {
  return x === undefined ? '' : String(Math.round(x * 100000) / 1000).replace('.', ',')
}

export function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
