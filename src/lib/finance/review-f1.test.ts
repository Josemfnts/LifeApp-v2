// Regresiones de la revisión de F1: el dinero se calcula en céntimos, no en floats.
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAdjustment } from './ops.ts'
import { computeNetWorth } from './networth.ts'
import { backfillEstimated } from './snapshots.ts'
import type { Cuenta, Tx } from './types.ts'

function cuenta(partial: Partial<Cuenta>): Cuenta {
  return { name: 'Banco', type: 'bank', balance: 0, color: '', note: '', updatedAt: '2026-01-01', ...partial }
}

test('buildAdjustment: 100 → 100.1 apunta exactamente 0.1', () => {
  const tx = buildAdjustment(cuenta({ balance: 100 }), 100.1, '2026-09-15')
  assert.ok(tx)
  assert.equal(tx.amount, 0.1)
  assert.equal(tx.type, 'income')
})

test('buildAdjustment: diferencia sub-céntimo no crea ajuste de 0 €', () => {
  assert.equal(buildAdjustment(cuenta({ balance: 100.1 }), 100.10000000000001, '2026-09-15'), null)
})

test('buildAdjustment: 0.3 → 0.1+0.2 no crea ajuste', () => {
  assert.equal(buildAdjustment(cuenta({ balance: 0.3 }), 0.1 + 0.2, '2026-09-15'), null)
})

test('computeNetWorth: 0.1 + 0.2 − 0.3 da 0 exacto', () => {
  const b = computeNetWorth([
    cuenta({ name: 'A', balance: 0.1 }),
    cuenta({ name: 'B', balance: 0.2 }),
    cuenta({ name: 'C', balance: -0.3 }),
  ])
  assert.equal(b.liquid, 0)
  assert.equal(b.net, 0)
})

test('computeNetWorth: extra se suma en céntimos', () => {
  const b = computeNetWorth([cuenta({ balance: 0.1 })], { liquid: 0.2, debt: 0.3 })
  assert.equal(b.liquid, 0.3)
  assert.equal(b.debt, 0.3)
  assert.equal(b.net, 0)
})

test('backfillEstimated: saldos reconstruidos sin deriva', () => {
  const txs: Tx[] = [
    { date: '2026-08-10', amount: 0.1, type: 'income', category: 'X', concept: '', note: '', cuenta: 'Banco' },
    { date: '2026-08-11', amount: 0.2, type: 'income', category: 'X', concept: '', note: '', cuenta: 'Banco' },
  ]
  const snaps = backfillEstimated([cuenta({ balance: 1.3 })], txs, '2026-09-15', 12)
  const julio = snaps.find(s => s.date === '2026-07-31')
  // julio es anterior al primer movimiento → se omite; agosto ya incluye ambos
  assert.equal(julio, undefined)
  const agosto = snaps.find(s => s.date === '2026-08-31')
  assert.ok(agosto)
  assert.equal(agosto.liquid, 1.3)
})
