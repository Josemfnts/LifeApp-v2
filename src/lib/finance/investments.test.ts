import test from 'node:test'
import assert from 'node:assert/strict'
import { position, resolvePrice, valuation, portfolio, applySplit, dcaDue, type Holding } from './investments.ts'

function holding(partial: Partial<Holding>): Holding {
  return { id: 'h1', kind: 'etf', name: 'ETF', lots: [], sales: [], ...partial }
}

const DAY = 86_400_000
const NOW = Date.parse('2026-09-15T12:00:00')

// Caso FIFO hecho a mano:
//  lote1 2026-01-10: 10 × 100 + 5 com. = 1005 €   · lote2 2026-02-10: 5 × 120 = 600 €
//  venta1 2026-02-20: 12 × 130 − 6 = 1554 → consume lote1 entero (1005) + 2/5 de lote2 (240) → realizado +309
//  lote3 2026-03-10: 10 × 90 + 10 com. = 910 €
//  venta2 2026-04-01: 5 × 80 = 400 → consume 3 de lote2 (360) + 2/10 de lote3 (182) → realizado −142
//  Queda: 8 uds de lote3 con coste 728 → medio 91. Realizado total 167.
const fifo = holding({
  lots: [
    { id: 'l1', date: '2026-01-10', quantity: 10, unitCost: 100, fees: 5 },
    { id: 'l3', date: '2026-03-10', quantity: 10, unitCost: 90, fees: 10 },
    { id: 'l2', date: '2026-02-10', quantity: 5, unitCost: 120, fees: 0 },
  ],
  sales: [
    { id: 's2', date: '2026-04-01', quantity: 5, unitPrice: 80, fees: 0 },
    { id: 's1', date: '2026-02-20', quantity: 12, unitPrice: 130, fees: 6 },
  ],
})

test('position: FIFO con 3 lotes y 2 ventas (caso a mano, desordenado a propósito)', () => {
  assert.deepEqual(position(fifo), { quantity: 8, costBasis: 728, avgCost: 91, realized: 167 })
})

test('position: staking y airdrop a coste 0', () => {
  const p = position(holding({
    kind: 'crypto',
    lots: [
      { id: 'a', date: '2026-01-01', quantity: 1, unitCost: 1000, fees: 0 },
      { id: 'b', date: '2026-02-01', quantity: 0.1, unitCost: 950, fees: 0, source: 'staking' },
    ],
  }))
  assert.equal(p.quantity, 1.1)
  assert.equal(p.costBasis, 1000)
  assert.ok(Math.abs(p.avgCost - 909.0909) < 0.001)
})

test('position: vender más de lo que hay lanza', () => {
  assert.throws(() => position(holding({
    lots: [{ id: 'a', date: '2026-01-01', quantity: 2, unitCost: 10, fees: 0 }],
    sales: [{ id: 's', date: '2026-02-01', quantity: 3, unitPrice: 12, fees: 0 }],
  })), /supera/)
})

test('position: una venta anterior a la primera compra lanza (orden cronológico)', () => {
  assert.throws(() => position(holding({
    lots: [{ id: 'a', date: '2026-03-01', quantity: 5, unitCost: 10, fees: 0 }],
    sales: [{ id: 's', date: '2026-02-01', quantity: 1, unitPrice: 12, fees: 0 }],
  })), /supera/)
})

test('resolvePrice: en vivo, manual, manual viejo, fondo viejo, en vivo antiguo y coste', () => {
  const base = holding({ lots: [{ id: 'a', date: '2026-01-01', quantity: 4, unitCost: 25, fees: 0 }] })
  const cache = { bitcoin: { eur: 55000, at: NOW - 5 * 60 * 1000 } }
  assert.deepEqual(
    { ...resolvePrice({ ...base, kind: 'crypto', coingeckoId: 'bitcoin' }, cache, NOW), asOf: null },
    { price: 55000, source: 'live', asOf: null, stale: false },
  )
  assert.deepEqual(resolvePrice({ ...base, manualPrice: 30, priceAt: '2026-09-12' }, {}, NOW), { price: 30, source: 'manual', asOf: '2026-09-12', stale: false })
  assert.equal(resolvePrice({ ...base, manualPrice: 30, priceAt: '2026-09-07' }, {}, NOW).stale, true)
  assert.equal(resolvePrice({ ...base, kind: 'fund', manualPrice: 30, priceAt: '2026-09-11' }, {}, NOW).stale, true)
  const old = resolvePrice({ ...base, kind: 'crypto', coingeckoId: 'bitcoin' }, { bitcoin: { eur: 50000, at: NOW - DAY } }, NOW)
  assert.equal(old.source, 'live')
  assert.equal(old.stale, true)
  assert.deepEqual(resolvePrice(base, {}, NOW), { price: 25, source: 'cost', asOf: null, stale: false })
})

test('valuation: valor, latente y % sobre el coste', () => {
  const v = valuation(fifo, 100)
  assert.equal(v.value, 800)
  assert.equal(v.unrealized, 72)
  assert.ok(v.unrealizedPct !== null && Math.abs(v.unrealizedPct - 9.8901) < 0.001)
})

test('portfolio: suma por tipo, excluye includeInNw=false y aparta posiciones imposibles', () => {
  const p = portfolio([
    { ...fifo, manualPrice: 100, priceAt: '2026-09-15' },
    holding({ id: 'h2', kind: 'crypto', name: 'BTC', coingeckoId: 'bitcoin', lots: [{ id: 'x', date: '2026-01-01', quantity: 0.01, unitCost: 40000, fees: 0 }] }),
    holding({ id: 'h3', name: 'Fuera', includeInNw: false, manualPrice: 10, lots: [{ id: 'y', date: '2026-01-01', quantity: 100, unitCost: 1, fees: 0 }] }),
    holding({ id: 'h4', name: 'Rota', lots: [], sales: [{ id: 's', date: '2026-01-01', quantity: 1, unitPrice: 1, fees: 0 }] }),
  ], { bitcoin: { eur: 50000, at: NOW } }, NOW)
  assert.equal(p.value, 1300)
  assert.equal(p.cost, 1128)
  assert.equal(p.unrealized, 172)
  assert.equal(p.realized, 167)
  assert.deepEqual(p.byKind, { etf: 800, crypto: 500 })
  assert.deepEqual(p.invalid, ['Rota'])
})

test('applySplit 4:1: cuadruplica cantidades, conserva coste y valor', () => {
  const before = { ...fifo, manualPrice: 100 }
  const after = applySplit(before, 4)
  const p = position(after)
  assert.equal(p.quantity, 32)
  assert.equal(p.costBasis, 728)
  assert.equal(p.realized, 167)
  assert.equal(after.manualPrice, 25)
  assert.equal(valuation(after, 25).value, valuation(before, 100).value)
  assert.throws(() => applySplit(before, 0))
})

test('dcaDue: bordes de día y de mes', () => {
  const h = holding({ dca: { amount: 100, day: 5, cuenta: 'Banco', active: true, lastRun: '2026-08' } })
  assert.equal(dcaDue(h, '2026-09-05'), true)
  assert.equal(dcaDue(h, '2026-09-04'), false)
  assert.equal(dcaDue({ ...h, dca: { ...h.dca!, lastRun: '2026-09' } }, '2026-09-20'), false)
  assert.equal(dcaDue({ ...h, dca: { ...h.dca!, active: false } }, '2026-09-20'), false)
  assert.equal(dcaDue(holding({}), '2026-09-20'), false)
})
