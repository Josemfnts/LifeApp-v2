// Convierte las filas revisadas de una importación en movimientos de la app. Todo movimiento
// importado lleva `importId` (para poder deshacer la importación entera) y `dedupe` (para que
// reimportar el mismo fichero no duplique nada).
import type { Tx } from '../types.ts'
import { roundEuros } from '../money.ts'

export interface ImportRecord {
  id: string
  date: string
  cuenta: string
  filename: string
  format: 'n43' | 'csv'
  total: number
  imported: number
  skipped: number
  undone?: boolean
}

// Fila ya revisada por el usuario: importe con signo (+ abono, − cargo) y categoría decidida.
export interface ReviewedRow {
  date: string
  amount: number
  concept: string
  category: string
  key: string
  merchantId?: string
}

export function buildImportTxs(rows: ReviewedRow[], cuenta: string, importId: string, baseId: number): Tx[] {
  return rows.map((r, i) => ({
    id: baseId + i,
    date: r.date,
    amount: roundEuros(Math.abs(r.amount)),
    type: r.amount >= 0 ? 'income' : 'expense',
    category: r.category,
    concept: r.concept,
    note: '',
    cuenta,
    importId,
    dedupe: r.key,
    ...(r.merchantId ? { merchantId: r.merchantId } : {}),
  }))
}
