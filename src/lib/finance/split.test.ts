import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSplit, flowAmount } from './split.ts'
import { toCents } from './money.ts'

const sum = (s: ReturnType<typeof buildSplit>) => toCents(s.myShare) + s.people.reduce((a, p) => a + toCents(p.share), 0)

test('partes iguales: el céntimo sobrante va a mí y la suma cuadra', () => {
  const s = buildSplit(10, 'equal', [{ name: 'Ana', value: 0 }, { name: 'Luis', value: 0 }])
  assert.equal(s.myShare, 3.34)
  assert.deepEqual(s.people, [{ name: 'Ana', share: 3.33 }, { name: 'Luis', share: 3.33 }])
  assert.equal(sum(s), 1000)
})

test('porcentajes: lo que falta hasta 100 es mío', () => {
  const s = buildSplit(80, 'pct', [{ name: 'Ana', value: 25 }])
  assert.equal(s.myShare, 60)
  assert.equal(s.people[0].share, 20)
  assert.throws(() => buildSplit(80, 'pct', [{ name: 'Ana', value: 70 }, { name: 'Luis', value: 40 }]), /más de 100/)
})

test('importes: el resto es mío; no se puede repartir más que el total', () => {
  const s = buildSplit(45.5, 'amount', [{ name: 'Ana', value: 12.25 }, { name: 'Luis', value: 10 }])
  assert.equal(s.myShare, 23.25)
  assert.equal(sum(s), 4550)
  assert.throws(() => buildSplit(10, 'amount', [{ name: 'Ana', value: 11 }]), /superan/)
})

test('sin incluirme: tiene que repartirse todo', () => {
  const s = buildSplit(30, 'equal', [{ name: 'Ana', value: 0 }, { name: 'Luis', value: 0 }], false)
  assert.equal(s.myShare, 0)
  assert.equal(sum(s), 3000)
  assert.throws(() => buildSplit(30, 'pct', [{ name: 'Ana', value: 50 }], false), /sumar 100/)
})

test('flowAmount: con reparto cuenta solo mi parte', () => {
  assert.equal(flowAmount({ amount: 60 }), 60)
  assert.equal(flowAmount({ amount: 60, split: { mode: 'equal', myShare: 20, people: [] } }), 20)
})
