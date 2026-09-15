import test from 'node:test'
import assert from 'node:assert/strict'
import { addDaysISO, occurrences, dueOccurrences, detectRecurring, projectCashflow } from './recurring.ts'
import type { Recurrente, Tx } from './types.ts'

const rec = (partial: Partial<Recurrente>): Recurrente =>
  ({ id: 1, concept: 'Netflix', amount: 12.99, type: 'expense', category: 'Suscripciones', day: 5, active: true, ...partial })

const tx = (date: string, amount: number, extra: Partial<Tx> = {}): Tx =>
  ({ date, amount, type: 'expense', category: 'Suscripciones', concept: 'NETFLIX.COM', note: '', ...extra })

test('addDaysISO cruza meses y años', () => {
  assert.equal(addDaysISO('2026-12-30', 3), '2027-01-02')
  assert.equal(addDaysISO('2026-03-01', -1), '2026-02-28')
})

test('occurrences mensual: día recortado a fin de mes (31 → 30/28)', () => {
  assert.deepEqual(occurrences(rec({ day: 31 }), '2026-01-01', '2026-04-30'), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
})

test('occurrences mensual cada 2 meses desde startDate y nunca antes de ella', () => {
  const r = rec({ day: 10, interval: 2, startDate: '2026-02-10' })
  assert.deepEqual(occurrences(r, '2026-01-01', '2026-08-31'), ['2026-02-10', '2026-04-10', '2026-06-10', '2026-08-10'])
  assert.deepEqual(occurrences(rec({ day: 1, startDate: '2026-03-15' }), '2026-03-01', '2026-05-31'), ['2026-04-01', '2026-05-01'])
})

test('occurrences semanal y anual', () => {
  assert.deepEqual(occurrences(rec({ freq: 'weekly', startDate: '2026-09-01' }), '2026-09-05', '2026-09-30'), ['2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29'])
  assert.deepEqual(occurrences(rec({ freq: 'yearly', day: 29, startDate: '2024-02-29' }), '2024-01-01', '2026-12-31'), ['2024-02-29', '2025-02-28', '2026-02-28'])
})

test('dueOccurrences: con lastRun genera las pendientes; sin lastRun solo el mes actual', () => {
  const r = rec({ day: 5, lastRun: '2026-07-05' })
  assert.deepEqual(dueOccurrences(r, '2026-09-15'), ['2026-08-05', '2026-09-05'])
  assert.deepEqual(dueOccurrences(rec({ day: 5 }), '2026-09-15'), ['2026-09-05'])
  assert.deepEqual(dueOccurrences(rec({ day: 20 }), '2026-09-15'), [])
  assert.deepEqual(dueOccurrences(rec({ active: false }), '2026-09-15'), [])
})

test('detectRecurring: Netflix mensual sí; 2 apariciones, importes dispares, ya cubierto o descartado no', () => {
  const netflix = [tx('2026-06-05', 12.99), tx('2026-07-05', 12.99), tx('2026-08-04', 13.49, { cuenta: 'Banco' }), tx('2026-09-05', 12.99, { cuenta: 'Banco' })]
  const s = detectRecurring(netflix, [], [])
  assert.equal(s.length, 1)
  assert.equal(s[0].freq, 'monthly')
  assert.equal(s[0].amount, 12.99)
  assert.equal(s[0].day, 5)
  assert.equal(s[0].cuenta, 'Banco')
  assert.equal(detectRecurring(netflix.slice(0, 2), [], []).length, 0)
  assert.equal(detectRecurring([tx('2026-06-05', 10), tx('2026-07-05', 30), tx('2026-08-05', 10)], [], []).length, 0)
  assert.equal(detectRecurring(netflix, [rec({ concept: 'Netflix.com' })], []).length, 0)
  assert.equal(detectRecurring(netflix, [], [s[0].key]).length, 0)
  assert.equal(detectRecurring([tx('2026-06-05', 12.99), tx('2026-06-20', 12.99), tx('2026-07-05', 12.99)], [], []).length, 0)
})

test('projectCashflow: un cargo deja el saldo negativo el día correcto', () => {
  const days = projectCashflow(100, [rec({ concept: 'Alquiler', amount: 750, day: 3 }), rec({ id: 2, concept: 'Nómina', amount: 1800, type: 'income', day: 28 })], '2026-09-01', '2026-09-30')
  assert.equal(days.length, 30)
  assert.equal(days[1].balance, 100)
  assert.equal(days[2].balance, -650)
  assert.deepEqual(days[2].events, [{ concept: 'Alquiler', amount: -750 }])
  assert.equal(days.at(-1)!.balance, 1150)
})
