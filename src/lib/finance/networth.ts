import type { Cuenta } from './types.ts'

export const CUENTA_GROUP: Record<string, 'liquid' | 'investments' | 'property' | 'debt'> = {
  bank: 'liquid',
  savings: 'liquid',
  cash: 'liquid',
  invest: 'investments',
  pension: 'investments',
  property: 'property',
  vehicle: 'property',
  loan: 'debt',
  mortgage: 'debt',
  credit: 'debt',
}

export interface NetWorthBreakdown {
  liquid: number
  investments: number
  property: number
  debt: number
  net: number
}

function groupOf(c: Cuenta): 'liquid' | 'investments' | 'property' | 'debt' {
  return CUENTA_GROUP[c.type] ?? 'liquid'
}

export function computeNetWorth(
  cuentas: Cuenta[],
  extra?: Partial<Omit<NetWorthBreakdown, 'net'>>
): NetWorthBreakdown {
  const acc = { liquid: 0, investments: 0, property: 0, debt: 0 }
  for (const c of cuentas) {
    if (c.includeInNw === false) continue
    const g = groupOf(c)
    if (g === 'debt') acc.debt += Math.abs(c.balance)
    else acc[g] += c.balance
  }
  if (extra) {
    for (const k of ['liquid', 'investments', 'property', 'debt'] as const) {
      const v = extra[k]
      if (typeof v === 'number') acc[k] += v
    }
  }
  const liquid = acc.liquid
  const investments = acc.investments
  const property = acc.property
  const debt = acc.debt
  const net = liquid + investments + property - debt
  return { liquid, investments, property, debt, net }
}
