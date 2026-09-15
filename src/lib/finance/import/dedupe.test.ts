import test from 'node:test'
import assert from 'node:assert/strict'
import { hashString, markDuplicates } from './dedupe.ts'
import type { ImportRow } from './types.ts'
import type { Tx } from '../types.ts'

const rows: ImportRow[] = [
  { date: '2026-09-01', amount: -45.3, concept: 'COMPRA TARJ 4589 MERCADONA' },
  { date: '2026-09-02', amount: 1850, concept: 'NOMINA SEPTIEMBRE' },
  { date: '2026-09-03', amount: -12.99, concept: 'NETFLIX.COM' },
]

function asImported(marked: ReturnType<typeof markDuplicates>, cuenta: string): Tx[] {
  return marked.map((m, i) => ({
    id: i + 1,
    date: m.row.date,
    amount: Math.abs(m.row.amount),
    type: m.row.amount >= 0 ? 'income' : 'expense',
    category: 'Otros gastos',
    concept: m.row.concept,
    note: '',
    cuenta,
    dedupe: m.key,
  }))
}

test('hashString: estable y distinto para entradas distintas', () => {
  assert.equal(hashString('abc'), hashString('abc'))
  assert.notEqual(hashString('abc'), hashString('abd'))
})

test('markDuplicates: reimportar el mismo fichero marca todo como duplicado', () => {
  const first = markDuplicates(rows, [], 'Banco')
  assert.ok(first.every(m => !m.duplicate))
  const second = markDuplicates(rows, asImported(first, 'Banco'), 'Banco')
  assert.ok(second.every(m => m.duplicate))
})

test('markDuplicates: dos cafés iguales el mismo día no se marcan entre sí', () => {
  const cafe: ImportRow = { date: '2026-09-05', amount: -1.5, concept: 'CAFE BAR PEPE' }
  const r = markDuplicates([cafe, { ...cafe }], [], 'Banco')
  assert.deepEqual(r.map(m => m.duplicate), [false, false])
  assert.notEqual(r[0].key, r[1].key)
})

test('markDuplicates: un movimiento manual idéntico previo se detecta (solo uno de los dos cafés)', () => {
  const manual: Tx = { id: 7, date: '2026-09-05', amount: 1.5, type: 'expense', category: 'Restaurantes', concept: 'Café bar Pepe', note: '', cuenta: 'Banco' }
  const cafe: ImportRow = { date: '2026-09-05', amount: -1.5, concept: 'CAFE BAR PEPE' }
  const r = markDuplicates([cafe, { ...cafe }], [manual], 'Banco')
  assert.deepEqual(r.map(m => m.duplicate), [true, false])
})

test('markDuplicates: el mismo movimiento en otra cuenta no es duplicado', () => {
  const first = markDuplicates(rows, [], 'Banco')
  const other = markDuplicates(rows, asImported(first, 'Banco'), 'Ahorro')
  assert.ok(other.every(m => !m.duplicate))
})
