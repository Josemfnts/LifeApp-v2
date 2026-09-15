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
  recurringId?: number
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
  includeInNw?: boolean
}

export interface Presupuesto {
  category: string
  limit: number
  rollover?: boolean // lo no gastado (o el exceso) pasa al mes siguiente
  since?: string // YYYY-MM desde el que cuenta el rollover
}

export interface Recurrente {
  id: number
  concept: string
  amount: number
  type: 'income' | 'expense'
  category: string
  day: number
  active: boolean
  // Sin freq = mensual el día `day` (formato antiguo, sigue funcionando igual).
  freq?: 'weekly' | 'monthly' | 'yearly'
  interval?: number // cada N semanas/meses/años
  startDate?: string
  cuenta?: string
  lastRun?: string // YYYY-MM-DD de la última ocurrencia generada
  notifyDaysBefore?: number
}
