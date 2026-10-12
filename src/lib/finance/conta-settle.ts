import type { Pufo, Tx } from './types.ts'
import { defaultCategory } from './conta-draft.ts'

// F4 de Contabilidad por proyecto: cerrar el ciclo del cobro. Hoy `settlePufo` del
// financeStore solo marca el pufo `settled` con la fecha de HOY y no crea ningún movimiento:
// visto desde Conta, eso hace desaparecer el dinero. Esta pieza decide QUÉ se escribe cuando
// Josema dice "este pendiente ya está cobrado": lo convierte en un movimiento corriente con la
// fecha real del cobro y devuelve el parche al pufo. La suite es node:test nativo, así que se
// queda en funciones puras sin tocar el store.
//
// Contrato fijado por src/lib/finance/conta-settle.test.ts (intocable).

export interface SettlementInput {
  pufo: Pufo
  date: string
  cuenta: string
}

export interface Settlement {
  tx: Omit<Tx, 'id'>
  pufoPatch: { settled: true; settledDate: string }
}

// Formato de la app para fechas: YYYY-MM-DD (lo que da <input type="date">).
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isDateFormat(s: string): boolean {
  return DATE_RE.test(s)
}

export function settleError(input: SettlementInput): string | null {
  if (!input.date || !input.date.trim() || !isDateFormat(input.date)) {
    return 'Elige la fecha del cobro'
  }
  const p = input.pufo
  if (p.settled) return 'Este pendiente ya está cobrado'
  if (p.dir !== 'me_debe') return 'Este pendiente no es un cobro'
  if (!(p.amount > 0)) return 'El pendiente no tiene importe'
  return null
}

export function buildSettlement(input: SettlementInput): Settlement | null {
  if (settleError(input)) return null
  const p = input.pufo
  const trimmedCuenta = input.cuenta.trim()
  return {
    tx: {
      date: input.date,
      amount: p.amount,
      type: 'income',
      category: defaultCategory('cobro'),
      concept: p.concept,
      note: '',
      ...(trimmedCuenta ? { cuenta: trimmedCuenta } : {}),
      ...(p.project ? { project: p.project } : {}),
    },
    pufoPatch: { settled: true, settledDate: input.date },
  }
}