import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAdjustment, buildTransfer, nextTxId } from './ops.ts'
import type { Cuenta } from './types.ts'

function c(partial: Partial<Cuenta>): Cuenta {
  return {
    name: 'Banco',
    type: 'bank',
    balance: 0,
    color: '',
    note: '',
    updatedAt: '2026-01-01',
    ...partial,
  } as Cuenta
}

test('buildAdjustment: diff > 0 es income', () => {
  const r = buildAdjustment(c({ balance: 100 }), 250, '2026-09-15')
  assert.ok(r)
  assert.equal(r.type, 'income')
  assert.equal(r.amount, 150)
  assert.equal(r.category, 'Ajuste')
  assert.equal(r.concept, 'Ajuste de saldo')
  assert.equal(r.cuenta, 'Banco')
  assert.equal(r.date, '2026-09-15')
  assert.equal(r.kind, 'adjust')
})

test('buildAdjustment: diff < 0 es expense', () => {
  const r = buildAdjustment(c({ balance: 250 }), 100, '2026-09-15')
  assert.ok(r)
  assert.equal(r.type, 'expense')
  assert.equal(r.amount, 150)
  assert.equal(r.kind, 'adjust')
})

test('buildAdjustment: diff == 0 devuelve null', () => {
  assert.equal(buildAdjustment(c({ balance: 100 }), 100, '2026-09-15'), null)
})

test('buildTransfer: crea dos patas con mismo linkId', () => {
  const [from, to] = buildTransfer('Banco', 'Ahorro', 100, '2026-09-15')
  assert.equal(from.type, 'expense')
  assert.equal(from.amount, 100)
  assert.equal(from.cuenta, 'Banco')
  assert.equal(from.category, 'Traspaso')
  assert.equal(from.kind, 'transfer')
  assert.equal(to.type, 'income')
  assert.equal(to.amount, 100)
  assert.equal(to.cuenta, 'Ahorro')
  assert.equal(to.category, 'Traspaso')
  assert.equal(to.kind, 'transfer')
  assert.ok(from.linkId && from.linkId === to.linkId)
  assert.equal(from.date, '2026-09-15')
})

test('buildTransfer: concept por defecto', () => {
  const [from, to] = buildTransfer('A', 'B', 50, '2026-09-15')
  assert.equal(from.concept, 'Traspaso A → B')
  assert.equal(to.concept, 'Traspaso A → B')
})

test('buildTransfer: concept custom', () => {
  const [from, to] = buildTransfer('A', 'B', 50, '2026-09-15', 'Ahorro mensual')
  assert.equal(from.concept, 'Ahorro mensual')
  assert.equal(to.concept, 'Ahorro mensual')
})

test('buildTransfer: lanza si from === to', () => {
  assert.throws(() => buildTransfer('A', 'A', 50, '2026-09-15'), /iguales/)
})

test('buildTransfer: lanza si amount <= 0', () => {
  assert.throws(() => buildTransfer('A', 'B', 0, '2026-09-15'), /Importe/)
  assert.throws(() => buildTransfer('A', 'B', -10, '2026-09-15'), /Importe/)
})

test('nextTxId: lista vacia usa Date.now()', () => {
  const id = nextTxId([])
  assert.ok(id > 0)
  assert.ok(id <= Date.now())
})

test('nextTxId: ids existentes menores que Date.now() -> Date.now()', () => {
  const txs = [{ id: 1 }, { id: 2 }, { id: 3 }] as unknown as Parameters<typeof nextTxId>[0]
  const id = nextTxId(txs)
  assert.ok(id >= Date.now())
})

test('nextTxId: ids existentes mayores que Date.now() -> max+1 (caso applyImport + adjust)', () => {
  const bigId = Date.now() + 1000
  const txs = [{ id: bigId }, { id: bigId + 1 }] as unknown as Parameters<typeof nextTxId>[0]
  const id = nextTxId(txs)
  assert.equal(id, bigId + 2)
})

test('nextTxId: ignora ids no numéricos', () => {
  const txs = [{ id: undefined }, { id: 5 }] as unknown as Parameters<typeof nextTxId>[0]
  const id = nextTxId(txs)
  assert.ok(id >= Date.now())
  assert.notEqual(id, NaN)
})
