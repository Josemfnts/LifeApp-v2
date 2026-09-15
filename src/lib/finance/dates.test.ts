import test from 'node:test'
import assert from 'node:assert/strict'
import { localISO, monthKeyOf, addMonthsISO, daysBetween } from './dates.ts'

test('localISO: formato YYYY-MM-DD', () => {
  const d = new Date(2026, 8, 15)
  assert.equal(localISO(d), '2026-09-15')
})

test('localISO: usa la hora local, no UTC', () => {
  const d = new Date(2026, 0, 1)
  d.setHours(0, 0, 0, 0)
  assert.equal(localISO(d), '2026-01-01')
})

test('monthKeyOf: extrae YYYY-MM', () => {
  assert.equal(monthKeyOf('2026-09-15'), '2026-09')
  assert.equal(monthKeyOf('2026-01-01'), '2026-01')
  assert.equal(monthKeyOf('2028-12-31'), '2028-12')
})

test('addMonthsISO: básico', () => {
  assert.equal(addMonthsISO('2026-01-15', 1), '2026-02-15')
  assert.equal(addMonthsISO('2026-12-15', 1), '2027-01-15')
  assert.equal(addMonthsISO('2027-01-15', -1), '2026-12-15')
})

test('addMonthsISO: recorta al fin de mes (31 -> 28/29)', () => {
  assert.equal(addMonthsISO('2026-01-31', 1), '2026-02-28')
  assert.equal(addMonthsISO('2028-01-31', 1), '2028-02-29')
  assert.equal(addMonthsISO('2026-03-31', 1), '2026-04-30')
  assert.equal(addMonthsISO('2026-05-31', -1), '2026-04-30')
})

test('addMonthsISO: meses de 30 días respetando borde', () => {
  assert.equal(addMonthsISO('2026-01-30', 1), '2026-02-28')
  assert.equal(addMonthsISO('2026-04-30', 1), '2026-05-30')
})

test('addMonthsISO: input mal formado se devuelve tal cual', () => {
  assert.equal(addMonthsISO('basura', 1), 'basura')
  assert.equal(addMonthsISO('2026-1-15', 1), '2026-1-15')
})

test('daysBetween: básico', () => {
  assert.equal(daysBetween('2026-01-01', '2026-01-10'), 9)
  assert.equal(daysBetween('2026-01-10', '2026-01-01'), -9)
  assert.equal(daysBetween('2026-01-01', '2026-01-01'), 0)
})

test('daysBetween: cruza años', () => {
  assert.equal(daysBetween('2025-12-25', '2026-01-05'), 11)
})

test('daysBetween: usa UTC (sin horario de verano)', () => {
  assert.equal(daysBetween('2026-03-29', '2026-03-30'), 1)
  assert.equal(daysBetween('2026-10-25', '2026-10-26'), 1)
})
