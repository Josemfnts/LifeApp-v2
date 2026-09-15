// CSV bancario genérico: separador, decimales y fechas en formato español o inglés, y mapeo de
// columnas por nombre de cabecera (con fallback a un mapeo elegido por el usuario).
import type { ImportRow } from './types.ts'
import { parseEuroInput, roundEuros } from '../money.ts'

export interface CsvMapping {
  headerRow: number
  date: number
  concept: number
  amount?: number
  debit?: number
  credit?: number
  balance?: number
}

// Divide el texto en filas y campos respetando comillas dobles ("" escapadas y saltos de línea
// dentro de comillas). Quita el BOM. Si no se da separador, se detecta.
export function splitCSV(text: string, delimiter?: string): string[][] {
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const d = delimiter ?? detectDelimiter(s)
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += c
      continue
    }
    if (c === '"' && field === '') { inQuotes = true; continue }
    if (c === d) { row.push(field); field = ''; continue }
    if (c === '\r') continue
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue }
    field += c
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

// El separador es el que da un número de columnas (>1) más repetido entre las primeras líneas;
// en empate, el que da más columnas.
export function detectDelimiter(sample: string): string {
  const head = sample.split(/\r?\n/).slice(0, 25).join('\n')
  let best = ','
  let bestScore = -1
  for (const d of [';', ',', '\t']) {
    const counts = splitCSV(head, d).filter(r => r.some(c => c.trim())).map(r => r.length)
    const freq = new Map<number, number>()
    for (const n of counts) freq.set(n, (freq.get(n) ?? 0) + 1)
    let modeN = 1
    let modeF = 0
    for (const [n, f] of freq) {
      if (n > 1 && (f > modeF || (f === modeF && n > modeN))) { modeN = n; modeF = f }
    }
    if (modeN <= 1) continue
    const score = modeF * 1000 + modeN
    if (score > bestScore) { bestScore = score; best = d }
  }
  return best
}

export const parseAmountES = parseEuroInput

function validDate(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1) return null
  if (d > new Date(Date.UTC(y, m, 0)).getUTCDate()) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function parseDateFlexible(s: string): string | null {
  const t = (s ?? '').trim()
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/.exec(t)
  if (m) return validDate(Number(m[1]), Number(m[2]), Number(m[3]))
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?:\s.*)?$/.exec(t)
  if (m) {
    let y = Number(m[3])
    if (m[3].length === 2) y = y <= 79 ? 2000 + y : 1900 + y
    return validDate(y, Number(m[2]), Number(m[1]))
  }
  return null
}

function key(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.\s:()]/g, '')
}

// Sinónimos por orden de preferencia (p. ej. "completed date" antes que "started date").
const DATE = ['completed date', 'fecha operacion', 'f. operacion', 'fecha', 'date', 'fecha valor', 'f. valor', 'started date']
const CONCEPT = ['concepto', 'descripcion', 'description', 'movimiento', 'detalle', 'beneficiario']
const AMOUNT = ['importe', 'amount', 'cantidad', 'importe (eur)', 'importe eur']
const DEBIT = ['cargo', 'cargos', 'debe', 'gastos']
const CREDIT = ['abono', 'abonos', 'haber', 'ingresos']
const BALANCE = ['saldo', 'balance', 'disponible']

function findCol(cells: string[], synonyms: string[], taken: Set<number>): number | undefined {
  for (const syn of synonyms) {
    const k = key(syn)
    const idx = cells.findIndex((c, i) => !taken.has(i) && c === k)
    if (idx >= 0) return idx
  }
  return undefined
}

export function guessMapping(rows: string[][]): CsvMapping | null {
  for (let r = 0; r < Math.min(15, rows.length); r++) {
    const cells = rows[r].map(key)
    const taken = new Set<number>()
    const date = findCol(cells, DATE, taken)
    if (date === undefined) continue
    taken.add(date)
    const amount = findCol(cells, AMOUNT, taken)
    if (amount !== undefined) taken.add(amount)
    const debit = findCol(cells, DEBIT, taken)
    if (debit !== undefined) taken.add(debit)
    const credit = findCol(cells, CREDIT, taken)
    if (credit !== undefined) taken.add(credit)
    if (amount === undefined && debit === undefined && credit === undefined) continue
    const balance = findCol(cells, BALANCE, taken)
    if (balance !== undefined) taken.add(balance)
    let concept = findCol(cells, CONCEPT, taken)
    if (concept === undefined) concept = cells.findIndex((c, i) => !taken.has(i) && c.length > 0)
    return { headerRow: r, date, concept, amount, debit, credit, balance }
  }
  return null
}

export function applyMapping(rows: string[][], m: CsvMapping): { rows: ImportRow[]; errors: string[] } {
  const out: ImportRow[] = []
  let skipped = 0
  const cell = (row: string[], i?: number) => (i === undefined || i < 0 ? '' : (row[i] ?? '').trim())
  for (const row of rows.slice(m.headerRow + 1)) {
    if (!row.some(c => c.trim())) continue
    const date = parseDateFlexible(cell(row, m.date))
    let amount: number
    if (m.amount !== undefined) {
      amount = parseAmountES(cell(row, m.amount))
    } else {
      const d = parseAmountES(cell(row, m.debit))
      const c = parseAmountES(cell(row, m.credit))
      amount = Number.isNaN(d) && Number.isNaN(c) ? NaN : (Number.isNaN(c) ? 0 : Math.abs(c)) - (Number.isNaN(d) ? 0 : Math.abs(d))
    }
    if (!date || !Number.isFinite(amount)) { skipped += 1; continue }
    const balance = m.balance !== undefined ? parseAmountES(cell(row, m.balance)) : NaN
    out.push({
      date,
      amount: roundEuros(amount),
      concept: cell(row, m.concept).replace(/\s+/g, ' '),
      ...(Number.isFinite(balance) ? { balanceAfter: roundEuros(balance) } : {}),
    })
  }
  const errors = skipped ? [`${skipped} ${skipped === 1 ? 'fila omitida' : 'filas omitidas'} (fecha o importe no válidos).`] : []
  return { rows: out, errors }
}
