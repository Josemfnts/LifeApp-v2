// Parser de Norma 43 (AEB/CSB 43): extracto bancario español de ancho fijo.
// Registros: 11 cabecera de cuenta · 22 movimiento · 23 concepto complementario · 33 totales de
// cuenta · 88 fin de fichero. Posiciones 1-indexadas; importes de 14 dígitos con 2 decimales
// implícitos, que aquí se leen directamente como céntimos enteros (nunca pasan por floats).
import type { ImportRow, ParseResult } from './types.ts'
import { fromCents } from '../money.ts'

const CODES = new Set(['11', '22', '23', '33', '88'])

function pad(line: string, len: number): string {
  if (line.length >= len) return line.slice(0, len)
  return line + ' '.repeat(len - line.length)
}

function sliceAt(line: string, start1: number, end1: number): string {
  return line.slice(Math.max(0, start1 - 1), Math.min(line.length, end1))
}

function aammddToIso(s: string): string | null {
  const m = /^(\d{2})(\d{2})(\d{2})$/.exec(s.trim())
  if (!m) return null
  const yy = Number(m[1])
  const mm = Number(m[2])
  const dd = Number(m[3])
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null
  const year = yy <= 79 ? 2000 + yy : 1900 + yy
  return `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
}

function cents14(raw: string): number | null {
  const digits = raw.trim()
  return /^\d{1,14}$/.test(digits) ? Number(digits) : null
}

function eur(cents: number): string {
  return (cents / 100).toFixed(2)
}

// Los bancos a menudo recortan los espacios finales de cada línea, así que no se exige que midan
// 80 caracteres: basta con que empiece por una cabecera 11 y todas las líneas sean registros N43.
export function isN43(text: string): boolean {
  if (!text) return false
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length < 2) return false
  if (!/^11\d{4}/.test(lines[0])) return false
  return lines.every(l => CODES.has(l.slice(0, 2)) && l.replace(/\s+$/, '').length <= 82)
}

interface AccState {
  account: string
  initialCents: number
  initialReadOk: boolean
  debitCents: number
  creditCents: number
  debitCount: number
  creditCount: number
  finalCents?: number
  finalReadOk: boolean
  totalsOk?: boolean
  readErrors: number
}

export function parseN43(text: string): ParseResult {
  const errors: string[] = []
  const rows: ImportRow[] = []
  if (!text || !text.trim()) {
    return { format: 'n43', rows: [], errors: ['Fichero vacío'], check: { ok: false, message: 'El fichero no tiene líneas' } }
  }

  const accounts: AccState[] = []
  let active: AccState | null = null
  // Movimiento en curso: su concepto es la suma de sus registros 23; si no trae ninguno, la referencia.
  let current: { idx: number; fallback: string; extras: string[] } | null = null

  const flush = () => {
    if (!current) return
    const extra = current.extras.join(' ').replace(/\s+/g, ' ').trim()
    rows[current.idx] = { ...rows[current.idx], concept: extra || current.fallback }
    current = null
  }

  const rawLines = text.split(/\r?\n/)
  for (let lineNumber = 1; lineNumber <= rawLines.length; lineNumber++) {
    const raw = rawLines[lineNumber - 1]
    const line = raw.replace(/\s+$/, '')
    if (line.length < 2) continue
    const code = line.slice(0, 2)

    if (code === '11') {
      flush()
      const sign = sliceAt(line, 33, 33) === '1' ? -1 : 1
      const initial = cents14(sliceAt(line, 34, 47))
      active = {
        account: sliceAt(line, 11, 20).trim() || 'desconocida',
        initialCents: initial === null ? 0 : sign * initial,
        initialReadOk: initial !== null,
        debitCents: 0,
        creditCents: 0,
        debitCount: 0,
        creditCount: 0,
        finalReadOk: true,
        readErrors: initial === null ? 1 : 0,
      }
      accounts.push(active)
      continue
    }

    if (code === '22') {
      flush()
      if (!active) {
        errors.push(`Línea ${lineNumber}: movimiento (registro 22) antes de una cabecera de cuenta (11): ignorado.`)
        continue
      }
      const date = aammddToIso(sliceAt(line, 11, 16))
      const dh = sliceAt(line, 28, 28)
      const c = cents14(sliceAt(line, 29, 42))
      if (!date || (dh !== '1' && dh !== '2') || c === null) {
        errors.push(`Línea ${lineNumber}: movimiento ilegible (fecha, debe/haber o importe), omitido.`)
        active.readErrors += 1
        continue
      }
      const isDebit = dh === '1'
      if (isDebit) { active.debitCents += c; active.debitCount += 1 }
      else { active.creditCents += c; active.creditCount += 1 }
      const doc = sliceAt(line, 43, 52).trim()
      const ref1 = sliceAt(line, 53, 64).trim()
      const ref2 = sliceAt(line, 65, 80).trim()
      const valueDate = aammddToIso(sliceAt(line, 17, 22))
      rows.push({ date, valueDate: valueDate ?? undefined, amount: fromCents(isDebit ? -c : c), concept: '' })
      current = { idx: rows.length - 1, fallback: (ref2 || ref1 || doc).replace(/\s+/g, ' '), extras: [] }
      continue
    }

    if (code === '23') {
      if (current) current.extras.push(`${sliceAt(line, 5, 42).trim()} ${sliceAt(line, 43, 80).trim()}`.trim())
      continue
    }

    if (code === '33') {
      flush()
      if (!active) continue
      const numDebe = Number(sliceAt(line, 21, 25).trim() || '0')
      const totDebeRaw = cents14(sliceAt(line, 26, 39))
      const numHaber = Number(sliceAt(line, 40, 44).trim() || '0')
      const totHaberRaw = cents14(sliceAt(line, 45, 58))
      const finalSign = sliceAt(line, 59, 59) === '1' ? -1 : 1
      const finalRaw = cents14(sliceAt(line, 60, 73))
      const readErrors = [
        totDebeRaw === null,
        totHaberRaw === null,
        finalRaw === null,
      ].filter(Boolean).length
      active.readErrors += readErrors
      if (totDebeRaw === null || totHaberRaw === null || finalRaw === null) {
        errors.push(`Línea ${lineNumber}: totales del registro 33 ilegibles.`)
      }
      active.totalsOk =
        totDebeRaw === active.debitCents && totHaberRaw === active.creditCents &&
        numDebe === active.debitCount && numHaber === active.creditCount
      active.finalCents = finalRaw === null ? 0 : finalSign * finalRaw
      active.finalReadOk = finalRaw !== null
      if (!active.totalsOk && totDebeRaw !== null && totHaberRaw !== null) {
        errors.push(
          `La cuenta ${active.account} no cuadra con su registro de totales: cargos ${eur(totDebeRaw)} (${numDebe}) frente a ${eur(active.debitCents)} (${active.debitCount}) leídos; abonos ${eur(totHaberRaw)} (${numHaber}) frente a ${eur(active.creditCents)} (${active.creditCount}).`,
        )
      }
      active = null
      continue
    }

    if (code === '88') flush()
  }
  flush()

  if (accounts.length > 1) {
    errors.push(`El fichero trae ${accounts.length} cuentas; se importan todas en la cuenta elegida.`)
  }

  const closed = accounts.filter(a => a.finalCents !== undefined || a.readErrors > 0)
  let check: ParseResult['check']
  if (closed.length === 0) {
    check = { ok: false, message: 'El fichero no trae registro de totales (33): no se puede verificar.' }
  } else {
    const problems: string[] = []
    for (const a of closed) {
      if (a.readErrors > 0) {
        problems.push(`La cuenta ${a.account} tiene ${a.readErrors} campo(s) ilegible(s) (importe o totales).`)
        continue
      }
      const expected = a.initialCents + a.creditCents - a.debitCents
      if (expected !== a.finalCents) {
        problems.push(
          `Saldo final no cuadra en ${a.account}: inicial ${eur(a.initialCents)} + abonos ${eur(a.creditCents)} − cargos ${eur(a.debitCents)} = ${eur(expected)}; el fichero dice ${eur(a.finalCents ?? 0)}.`,
        )
      } else if (!a.totalsOk) {
        problems.push(`Los totales de ${a.account} no cuadran con sus movimientos.`)
      }
    }
    check = problems.length
      ? { ok: false, message: problems.join(' ') }
      : { ok: true, message: `✓ Totales y saldo final cuadran (${rows.length} movimientos).` }
  }

  const only = accounts.length === 1 ? accounts[0] : null
  return {
    format: 'n43',
    rows,
    errors,
    check,
    finalBalance: only?.finalCents !== undefined ? fromCents(only.finalCents) : undefined,
    accountId: accounts[0]?.account,
  }
}

export const _internal = { pad, sliceAt, aammddToIso }
