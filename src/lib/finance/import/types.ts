export interface ImportRow {
  date: string
  valueDate?: string
  amount: number
  concept: string
  balanceAfter?: number
}

export interface ParseCheck {
  ok: boolean
  message: string
}

export interface ParseResult {
  format: 'n43' | 'csv'
  rows: ImportRow[]
  errors: string[]
  check?: ParseCheck
  finalBalance?: number
  accountId?: string
}
