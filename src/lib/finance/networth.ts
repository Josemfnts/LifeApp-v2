import type { Cuenta } from './types.ts'
import { toCents, fromCents } from './money.ts'

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
  let liquidC = 0
  let investmentsC = 0
  let propertyC = 0
  let debtC = 0
  for (const c of cuentas) {
    if (c.includeInNw === false) continue
    const g = groupOf(c)
    const cents = toCents(c.balance)
    if (g === 'debt') debtC += Math.abs(cents)
    else if (g === 'liquid') liquidC += cents
    else if (g === 'investments') investmentsC += cents
    else propertyC += cents
  }
  if (extra) {
    for (const k of ['liquid', 'investments', 'property', 'debt'] as const) {
      const v = extra[k]
      if (typeof v === 'number') {
        if (k === 'debt') debtC += Math.abs(toCents(v))
        else if (k === 'liquid') liquidC += toCents(v)
        else if (k === 'investments') investmentsC += toCents(v)
        else propertyC += toCents(v)
      }
    }
  }
  const liquid = fromCents(liquidC)
  const investments = fromCents(investmentsC)
  const property = fromCents(propertyC)
  const debt = fromCents(debtC)
  const net = fromCents(liquidC + investmentsC + propertyC - debtC)
  return { liquid, investments, property, debt, net }
}
