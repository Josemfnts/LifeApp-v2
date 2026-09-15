// Gastos compartidos: el movimiento sale entero de tu cuenta (pagaste tú), pero tu gasto es solo tu parte
// y el resto se convierte en pufos "me debe". El reparto va en céntimos y el resto va al primero (tú).
import type { Tx, TxSplit } from './types.ts'
import { toCents, fromCents, splitCents } from './money.ts'

export function buildSplit(
  total: number,
  mode: TxSplit['mode'],
  people: { name: string; value: number }[],
  includeMe = true,
): TxSplit {
  const totalC = toCents(total)
  let parts: number[]

  if (mode === 'equal') {
    const n = people.length + (includeMe ? 1 : 0)
    if (n === 0) throw new Error('Añade al menos una persona')
    parts = splitCents(totalC, Array.from({ length: n }, () => 1))
  } else if (mode === 'pct') {
    const peopleBp = people.map(p => Math.round(p.value * 100)) // puntos básicos
    const sumBp = peopleBp.reduce((s, x) => s + x, 0)
    if (sumBp > 10000) throw new Error('Los porcentajes suman más de 100')
    if (!includeMe && sumBp !== 10000) throw new Error('Los porcentajes tienen que sumar 100')
    parts = splitCents(totalC, includeMe ? [10000 - sumBp, ...peopleBp] : peopleBp)
  } else {
    const peopleC = people.map(p => toCents(p.value))
    const sumC = peopleC.reduce((s, x) => s + x, 0)
    if (sumC > totalC) throw new Error('Los importes superan el total')
    if (!includeMe && sumC !== totalC) throw new Error('Los importes tienen que sumar el total')
    parts = includeMe ? [totalC - sumC, ...peopleC] : peopleC
  }

  const mine = includeMe ? parts[0] : 0
  const others = includeMe ? parts.slice(1) : parts
  return {
    mode,
    myShare: fromCents(mine),
    people: people.map((p, i) => ({ name: p.name, share: fromCents(others[i]) })),
  }
}

// Lo que cuenta como gasto/ingreso tuyo en estadísticas y presupuestos.
export function flowAmount(tx: Pick<Tx, 'amount' | 'split'>): number {
  return tx.split ? tx.split.myShare : tx.amount
}
