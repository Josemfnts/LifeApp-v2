// Deduplicación de importaciones: la gente importa el mismo mes dos veces, siempre.
// Clave = hash(cuenta | fecha | céntimos con signo | concepto normalizado[:40] | ordinal). El ordinal
// distingue movimientos idénticos de verdad (dos cafés el mismo día) dentro de un mismo lote.
import type { ImportRow } from './types.ts'
import type { Tx } from '../types.ts'
import { toCents } from '../money.ts'
import { normalizeConcept } from '../merchants.ts'

// FNV-1a de 32 bits con dos bases distintas concatenadas: síncrono y con pocas colisiones.
export function hashString(s: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0x050c5d1f
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193)
    h2 = Math.imul(h2 ^ c, 0x01000193)
  }
  return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36)
}

function baseOf(date: string, cents: number, concept: string): string {
  return `${date}|${cents}|${normalizeConcept(concept).slice(0, 40)}`
}

export function dedupeKey(cuenta: string, date: string, amountEuros: number, concept: string, ordinal: number): string {
  return hashString(`${cuenta}|${baseOf(date, toCents(amountEuros), concept)}|${ordinal}`)
}

export interface MarkedRow {
  row: ImportRow
  key: string
  duplicate: boolean
}

export function markDuplicates(incoming: ImportRow[], existing: Tx[], cuenta: string): MarkedRow[] {
  const known = new Set<string>()
  const seenExisting = new Map<string, number>()
  const mine = existing
    .filter(t => t.cuenta === cuenta)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.id ?? 0) - (b.id ?? 0))
  for (const t of mine) {
    if (t.dedupe) { known.add(t.dedupe); continue }
    // Movimiento metido a mano: se calcula su clave con el mismo esquema para detectarlo también.
    const signed = t.type === 'income' ? t.amount : -t.amount
    const base = baseOf(t.date, toCents(signed), t.concept)
    const ordinal = seenExisting.get(base) ?? 0
    seenExisting.set(base, ordinal + 1)
    known.add(dedupeKey(cuenta, t.date, signed, t.concept, ordinal))
  }

  const seenIncoming = new Map<string, number>()
  return incoming.map(row => {
    const base = baseOf(row.date, toCents(row.amount), row.concept)
    const ordinal = seenIncoming.get(base) ?? 0
    seenIncoming.set(base, ordinal + 1)
    const key = dedupeKey(cuenta, row.date, row.amount, row.concept, ordinal)
    return { row, key, duplicate: known.has(key) }
  })
}
