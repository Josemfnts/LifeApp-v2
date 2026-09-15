export type TxKind = 'transfer' | 'adjust' | 'investment' | 'debt_principal'

export interface Tx {
  id?: number
  date: string
  amount: number
  type: 'income' | 'expense'
  category: string
  concept: string
  note: string
  cuenta?: string
  kind?: TxKind
  linkId?: string
  merchantId?: string
  importId?: string
  dedupe?: string
  holdingId?: string
  debtId?: string
}

export interface Hucha {
  name: string
  goal: number
  current: number
  emoji: string
  deadline: string
  color: string
}

export interface Pufo {
  id: number
  who: string
  person: string
  amount: number
  dir: 'me_debe' | 'le_debo'
  reason: string
  concept: string
  date: string
  settled: boolean
  settledDate?: string
}

export interface Cuenta {
  id?: string
  name: string
  type: string
  balance: number
  color: string
  note: string
  updatedAt: string
}

export interface Presupuesto {
  category: string
  limit: number
}

export interface Recurrente {
  id: number
  concept: string
  amount: number
  type: 'income' | 'expense'
  category: string
  day: number
  active: boolean
}
