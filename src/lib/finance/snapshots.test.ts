import test from 'node:test'
import assert from 'node:assert/strict'
import {
  upsertTodaySnapshot,
  backfillEstimated,
  variation,
} from './snapshots.ts'
import type { NwSnapshot } from './snapshots.ts'
import type { Cuenta, Tx } from './types.ts'

function snap(partial: Partial<NwSnapshot>): NwSnapshot {
  return { date: '2026-01-01', liquid: 0, investments: 0, property: 0, debt: 0, net: 0, ...partial }
}

function c(partial: Partial<Cuenta>): Cuenta {
  return {
    name: 'X',
    type: 'bank',
    balance: 0,
    color: '',
    note: '',
    updatedAt: '2026-01-01',
    ...partial,
  } as Cuenta
}

test('upsertTodaySnapshot: añade fila de hoy si no existe', () => {
  const r = upsertTodaySnapshot([], '2026-09-15', { liquid: 100, investments: 0, property: 0, debt: 0, net: 100 })
  assert.equal(r.changed, true)
  assert.equal(r.snaps.length, 1)
  assert.equal(r.snaps[0].date, '2026-09-15')
  assert.equal(r.snaps[0].net, 100)
})

test('upsertTodaySnapshot: no toca filas anteriores', () => {
  const prev: NwSnapshot[] = [
    snap({ date: '2026-09-10', net: 50 }),
    snap({ date: '2026-09-14', net: 80 }),
  ]
  const r = upsertTodaySnapshot(prev, '2026-09-15', { liquid: 100, investments: 0, property: 0, debt: 0, net: 100 })
  assert.equal(r.snaps[0].date, '2026-09-10')
  assert.equal(r.snaps[0].net, 50)
  assert.equal(r.snaps[1].net, 80)
  assert.equal(r.snaps[2].net, 100)
})

test('upsertTodaySnapshot: devuelve changed=false si los valores son iguales', () => {
  const prev: NwSnapshot[] = [snap({ date: '2026-09-15', net: 100, liquid: 100 })]
  const r = upsertTodaySnapshot(prev, '2026-09-15', { liquid: 100, investments: 0, property: 0, debt: 0, net: 100 })
  assert.equal(r.changed, false)
  assert.equal(r.snaps, prev)
})

test('upsertTodaySnapshot: cambia si los valores son distintos', () => {
  const prev: NwSnapshot[] = [snap({ date: '2026-09-15', net: 100, liquid: 100 })]
  const r = upsertTodaySnapshot(prev, '2026-09-15', { liquid: 200, investments: 0, property: 0, debt: 0, net: 200 })
  assert.equal(r.changed, true)
  assert.equal(r.snaps[0].net, 200)
})

test('upsertTodaySnapshot: no toca filas con fecha > today', () => {
  const prev: NwSnapshot[] = [snap({ date: '2026-09-20', net: 999 })]
  const r = upsertTodaySnapshot(prev, '2026-09-15', { liquid: 100, investments: 0, property: 0, debt: 0, net: 100 })
  assert.equal(r.changed, false)
  assert.equal(r.snaps.length, 1)
  assert.equal(r.snaps[0].net, 999)
})

test('backfillEstimated: caso numérico (2 cuentas, 4 txs, meses >= oldestTxDate)', () => {
  const cuentas: Cuenta[] = [
    c({ name: 'Banco', type: 'bank', balance: 600 }),
    c({ name: 'Tarjeta', type: 'credit', balance: -200 }),
  ]
  const txs: Tx[] = [
    { date: '2026-06-15', amount: 1000, type: 'income', category: 'Nómina', concept: '', note: '', cuenta: 'Banco' },
    { date: '2026-06-20', amount: 200, type: 'expense', category: 'Comida', concept: '', note: '', cuenta: 'Banco' },
    { date: '2026-07-10', amount: 300, type: 'income', category: 'Freelance', concept: '', note: '', cuenta: 'Banco' },
    { date: '2026-08-05', amount: 100, type: 'expense', category: 'Comida', concept: '', note: '', cuenta: 'Banco' },
  ]
  const snaps = backfillEstimated(cuentas, txs, '2026-09-30', 12)
  assert.ok(snaps.length >= 1, `al menos una snapshot generada, fechas: ${snaps.map(s => s.date).join(', ')}`)
  for (const s of snaps) assert.equal(s.estimated, true)
  for (const s of snaps) assert.ok(s.date < '2026-09-30', 'ninguna fila es hoy')
  for (const s of snaps) assert.ok(s.date >= '2026-06-15', `iso >= oldestTxDate; real: ${s.date}`)
  const august = snaps.find(s => s.date === '2026-08-31')
  assert.ok(august)
  assert.equal(august.liquid, 600)
  assert.equal(august.debt, 200)
  assert.equal(august.net, 600 - 200)
})

test('backfillEstimated: omite meses anteriores al primer movimiento', () => {
  const cuentas: Cuenta[] = [c({ balance: 1000 })]
  const txs: Tx[] = [
    { date: '2026-08-01', amount: 100, type: 'income', category: 'X', concept: '', note: '', cuenta: 'X' },
  ]
  const snaps = backfillEstimated(cuentas, txs, '2026-09-30', 12)
  for (const s of snaps) {
    assert.ok(s.date >= '2026-08-01')
  }
})

test('backfillEstimated: sin txs devuelve []', () => {
  const snaps = backfillEstimated([c({ balance: 1000 })], [], '2026-09-30', 12)
  assert.deepEqual(snaps, [])
})

test('variation: 1M con snapshot hace 1M exacto', () => {
  const snaps: NwSnapshot[] = [
    snap({ date: '2026-08-15', net: 1000 }),
    snap({ date: '2026-09-15', net: 1100 }),
  ]
  const v = variation(snaps, 1100, '2026-09-15', '1M')
  assert.equal(v.abs, 100)
  assert.equal(v.pct, 10)
})

test('variation: 1M sin snapshot exacto usa la anterior', () => {
  const snaps: NwSnapshot[] = [
    snap({ date: '2026-08-10', net: 1000 }),
    snap({ date: '2026-09-15', net: 1100 }),
  ]
  const v = variation(snaps, 1100, '2026-09-15', '1M')
  assert.equal(v.fromDate, '2026-08-10')
  assert.equal(v.abs, 100)
})

test('variation: base 0 da pct null', () => {
  const snaps: NwSnapshot[] = [snap({ date: '2026-08-10', net: 0 })]
  const v = variation(snaps, 100, '2026-09-15', '1M')
  assert.equal(v.pct, null)
})

test('variation: sin snapshots da fromDate null', () => {
  const v = variation([], 100, '2026-09-15', 'Todo')
  assert.equal(v.fromDate, null)
  assert.equal(v.pct, null)
})

test('variation: Todo usa la primera snapshot', () => {
  const snaps: NwSnapshot[] = [
    snap({ date: '2025-01-01', net: 500 }),
    snap({ date: '2026-01-01', net: 800 }),
    snap({ date: '2026-09-15', net: 1000 }),
  ]
  const v = variation(snaps, 1000, '2026-09-15', 'Todo')
  assert.equal(v.fromDate, '2025-01-01')
  assert.equal(v.abs, 500)
})
