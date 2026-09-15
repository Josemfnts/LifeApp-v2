import test from 'node:test'
import assert from 'node:assert/strict'
import {
  toCents,
  fromCents,
  roundEuros,
  addEuros,
  subEuros,
  sumEuros,
  splitCents,
} from './money.ts'

test('toCents: enteros y positivos', () => {
  assert.equal(toCents(1), 100)
  assert.equal(toCents(0), 0)
  assert.equal(toCents(0.5), 50)
  assert.equal(toCents(12.34), 1234)
})

test('toCents: robusto a coma flotante', () => {
  assert.equal(toCents(0.1 + 0.2), 30)
  assert.equal(toCents(1.005), 101)
  assert.equal(toCents(0.004), 0)
  assert.equal(toCents(0.005), 1)
})

test('toCents: negativos (half away from zero)', () => {
  assert.equal(toCents(-12.345), -1235)
  assert.equal(toCents(-0.5), -50)
  assert.equal(toCents(-0.1), -10)
})

test('toCents: NaN y undefined devuelven 0', () => {
  assert.equal(toCents(NaN), 0)
  assert.equal(toCents(undefined as unknown as number), 0)
  assert.equal(toCents(Infinity), 0)
})

test('fromCents: 2 decimales exactos', () => {
  assert.equal(fromCents(100), 1)
  assert.equal(fromCents(1234), 12.34)
  assert.equal(fromCents(-50), -0.5)
  assert.equal(fromCents(0), 0)
})

test('roundEuros: igual a fromCents(toCents(n))', () => {
  assert.equal(roundEuros(12.345), 12.35)
  assert.equal(roundEuros(12.344), 12.34)
  assert.equal(roundEuros(-12.345), -12.35)
})

test('addEuros: suma por céntimos, sin deriva', () => {
  assert.equal(addEuros(0.1, 0.2), 0.3)
  assert.equal(addEuros(1.005, 2.5), 3.51)
  assert.equal(addEuros(-12.345, 0.5), -11.85)
  assert.equal(addEuros(), 0)
})

test('subEuros: resta por céntimos', () => {
  assert.equal(subEuros(1, 0.3), 0.7)
  assert.equal(subEuros(0, 5), -5)
  assert.equal(subEuros(-12.34, 0.5), -12.84)
})

test('sumEuros: suma un array', () => {
  assert.equal(sumEuros([0.1, 0.2, 0.3]), 0.6)
  assert.equal(sumEuros([]), 0)
  assert.equal(sumEuros([100, 200, -150]), 150)
})

test('splitCents: ejemplo [100, [1,1,1]] -> [34,33,33]', () => {
  assert.deepEqual(splitCents(100, [1, 1, 1]), [34, 33, 33])
})

test('splitCents: pesos iguales exactos', () => {
  assert.deepEqual(splitCents(1000, [50, 50]), [500, 500])
})

test('splitCents: resto al primero', () => {
  assert.deepEqual(splitCents(1001, [70, 30]), [701, 300])
})

test('splitCents: la suma siempre es el total', () => {
  const casos: Array<[number, number[]]> = [
    [0, [1, 1, 1]],
    [1, [1, 1, 1]],
    [99, [33, 33, 33]],
    [12345, [1, 2, 3]],
    [-100, [1, 1, 1]],
    [100000, [1, 2, 3, 4]],
  ]
  for (const [total, pesos] of casos) {
    const partes = splitCents(total, pesos)
    const suma = partes.reduce((s, v) => s + v, 0)
    assert.equal(suma, total, `splitCents(${total}, ${pesos}) = ${partes} (suma=${suma})`)
  }
})

test('splitCents: un solo participante', () => {
  assert.deepEqual(splitCents(123, [1]), [123])
  assert.deepEqual(splitCents(-50, [1]), [-50])
})

test('splitCents: pesos con cero', () => {
  assert.deepEqual(splitCents(100, [0, 1, 1]), [0, 50, 50])
  assert.deepEqual(splitCents(100, [1, 0, 1]), [50, 0, 50])
})

test('splitCents: todos los pesos a cero -> todo ceros', () => {
  assert.deepEqual(splitCents(100, [0, 0, 0]), [0, 0, 0])
})

test('splitCents: input vacío', () => {
  assert.deepEqual(splitCents(100, []), [])
})
