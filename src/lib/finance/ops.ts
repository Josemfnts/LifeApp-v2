import type { Cuenta, Tx } from './types.ts'

export function buildAdjustment(cuenta: Cuenta, newBalance: number, date: string): Tx | null {
  const diff = newBalance - cuenta.balance
  if (diff === 0) return null
  return {
    type: diff > 0 ? 'income' : 'expense',
    amount: Math.abs(diff),
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
