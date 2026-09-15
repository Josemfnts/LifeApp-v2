import test from 'node:test'
import assert from 'node:assert/strict'
import { currentValue, valueSeries, equity, type Property } from './properties.ts'
import type { Debt } from './debts.ts'

function prop(partial: Partial<Property>): Property {
  return { id: 'p1', name: 'Casa', kind: 'home', purchasePrice: 200000, purchaseDate: '2024-03-15', valuationMode: 'manual', valuations: [], ...partial }
}

test('manual: sin tasaciones vale lo que costó; con tasación, la última', () => {
  assert.equal(currentValue(prop({}), '2026-09-15'), 200000)
  const p = prop({ valuations: [
    { date: '2025-01-01', value: 210000, source: 'manual' },
    { date: '2026-01-01', value: 225000, source: 'manual' },
    { date: '2027-01-01', value: 999999, source: 'manual' },
  ] })
  assert.equal(currentValue(p, '2026-09-15'), 225000)
})

test('% anual: 4 % durante ~2,5 años desde la compra', () => {
  const v = currentValue(prop({ valuationMode: 'annual_pct', annualPct: 0.04 }), '2026-09-15')
  assert.ok(v > 220000 && v < 221500, String(v))
})

test('% anual: una tasación manual intermedia reinicia la base', () => {
  const p = prop({ valuationMode: 'annual_pct', annualPct: 0.04, valuations: [{ date: '2025-09-15', value: 230000, source: 'manual' }] })
  const v = currentValue(p, '2026-09-15')
  assert.ok(v > 239000 && v < 239300, String(v))
  assert.equal(currentValue(p, '2025-09-15'), 230000)
})

test('valueSeries: aniversarios de compra + hoy, el último es el valor actual', () => {
  const p = prop({ purchaseDate: '2023-06-01', valuationMode: 'annual_pct', annualPct: 0.03 })
  const s = valueSeries(p, '2026-09-15')
  assert.deepEqual(s.map(x => x.date), ['2023-06-01', '2024-06-01', '2025-06-01', '2026-06-01', '2026-09-15'])
  assert.equal(s[0].value, 200000)
  assert.equal(s.at(-1)!.value, currentValue(p, '2026-09-15'))
})

test('equity: valor menos la hipoteca ligada (ignora deudas de otros inmuebles)', () => {
  const debts = [
    { id: 'd1', propertyId: 'p1', balance: 180000 },
    { id: 'd2', propertyId: 'otro', balance: 50000 },
    { id: 'd3', propertyId: 'p1', balance: 1000, includeInNw: false },
  ] as Debt[]
  assert.equal(equity(prop({ valuations: [{ date: '2026-01-01', value: 250000, source: 'manual' }] }), debts, '2026-09-15'), 70000)
})
