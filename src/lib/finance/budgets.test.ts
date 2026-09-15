import test from 'node:test'
import assert from 'node:assert/strict'
import { budgetStatus, nextMonthKey, prevMonthKey } from './budgets.ts'
import type { Tx } from './types.ts'

const tx = (date: string, amount: number, extra: Partial<Tx> = {}): Tx =>
  ({ date, amount, type: 'expense', category: 'Restaurantes', concept: 'x', note: '', ...extra })

test('meses: siguiente y anterior cruzando año', () => {
  assert.equal(nextMonthKey('2026-12'), '2027-01')
  assert.equal(prevMonthKey('2026-01'), '2025-12')
})

test('sin rollover: solo cuenta el mes, excluye no-flujo, otras categorías e ingresos', () => {
  const txs = [
    tx('2026-09-02', 60), tx('2026-09-10', 25.5), tx('2026-08-30', 500),
    tx('2026-09-11', 99, { category: 'Ocio' }), tx('2026-09-12', 99, { kind: 'transfer' }), tx('2026-09-13', 99, { type: 'income' }),
  ]
  const s = budgetStatus({ category: 'Restaurantes', limit: 100 }, txs, '2026-09')
  assert.deepEqual(s, { spent: 85.5, carry: 0, available: 100, pct: 85.5, level: 'warn' })
})

test('rollover con sobrante: lo no gastado de meses anteriores suma', () => {
  const txs = [tx('2026-07-05', 70), tx('2026-08-05', 90), tx('2026-09-05', 120)]
  const s = budgetStatus({ category: 'Restaurantes', limit: 100, rollover: true, since: '2026-07' }, txs, '2026-09')
  assert.equal(s.carry, 40)
  assert.equal(s.available, 140)
  assert.equal(s.level, 'warn')
})

test('rollover con exceso: el mes pasado resta y el nivel pasa a superado', () => {
  const txs = [tx('2026-08-05', 150), tx('2026-09-05', 60)]
  const s = budgetStatus({ category: 'Restaurantes', limit: 100, rollover: true, since: '2026-08' }, txs, '2026-09')
  assert.equal(s.carry, -50)
  assert.equal(s.available, 50)
  assert.equal(s.level, 'over')
})

test('rollover con since en el mes actual no arrastra nada', () => {
  const s = budgetStatus({ category: 'Restaurantes', limit: 100, rollover: true, since: '2026-09' }, [tx('2026-08-01', 10)], '2026-09')
  assert.equal(s.carry, 0)
  assert.equal(s.level, 'ok')
})
