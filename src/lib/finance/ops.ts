import type { Cuenta, Tx } from './types.ts'
import { toCents, fromCents } from './money.ts'

export function buildAdjustment(cuenta: Cuenta, newBalance: number, date: string): Tx | null {
  // Diferencia en céntimos: con floats, 100.1 − 100 = 0.0999… y 100.1 vs 100.10000000000001
  // daría un ajuste de 0 €.
  const diffC = toCents(newBalance) - toCents(cuenta.balance)
  if (diffC === 0) return null
  const amount = fromCents(Math.abs(diffC))
  return {
    type: diffC > 0 ? 'income' : 'expense',
    amount,
    category: 'Ajuste',
    concept: 'Ajuste de saldo',
    note: '',
    cuenta: cuenta.name,
    date,
    kind: 'adjust',
  }
}

export function buildTransfer(
  from: string,
  to: string,
  amount: number,
  date: string,
  concept?: string
): [Tx, Tx] {
  if (from === to) throw new Error('Origen y destino iguales')
  if (!(amount > 0)) throw new Error('Importe inválido')
  const linkId = crypto.randomUUID()
  const c = concept ?? `Traspaso ${from} → ${to}`
  const txFrom: Tx = {
    type: 'expense',
    amount,
    category: 'Traspaso',
    concept: c,
    note: '',
    cuenta: from,
    date,
    kind: 'transfer',
    linkId,
  }
  const txTo: Tx = {
    type: 'income',
    amount,
    category: 'Traspaso',
    concept: c,
    note: '',
    cuenta: to,
    date,
    kind: 'transfer',
    linkId,
  }
  return [txFrom, txTo]
}

// Siguiente id de Tx libre: mayor entre Date.now() y el maximo de los ids existentes + 1.
// Garantiza unicidad cuando varias llamadas al mismo milisegundo (p.ej. applyImport +
// adjustBalance en el mismo tick) comparten Date.now().
export function nextTxId(txs: Tx[]): number {
  let maxId = 0
  for (const t of txs) {
    if (typeof t.id === 'number' && t.id > maxId) maxId = t.id
  }
  const now = Date.now()
  return Math.max(now, maxId + 1)
}
