import test from 'node:test'
import assert from 'node:assert/strict'
import { computeFinanceAlerts } from './alerts.ts'
import type { Recurrente, Tx } from './types.ts'

const rec = (partial: Partial<Recurrente>): Recurrente =>
  ({ id: 7, concept: 'Alquiler', amount: 750, type: 'expense', category: 'Vivienda', day: 16, active: true, ...partial })

const tx = (date: string, amount: number, extra: Partial<Tx> = {}): Tx =>
  ({ date, amount, type: 'expense', category: 'Restaurantes', concept: 'x', note: '', ...extra })

test('upcoming: cargo mañana con aviso de 1 día; con 3 días avisa antes; inactivo no', () => {
  const a = computeFinanceAlerts({ txs: [], presupuestos: [], recurrentes: [rec({})] }, '2026-09-15')
  assert.deepEqual(a, [{ id: 'upcoming:7:2026-09-16', kind: 'upcoming', title: 'Cargo previsto: Alquiler', body: '750,00 € el 16 de septiembre' }])
  assert.equal(computeFinanceAlerts({ txs: [], presupuestos: [], recurrentes: [rec({ day: 18 })] }, '2026-09-15').length, 0)
  assert.equal(computeFinanceAlerts({ txs: [], presupuestos: [], recurrentes: [rec({ day: 18, notifyDaysBefore: 3 })] }, '2026-09-15').length, 1)
  assert.equal(computeFinanceAlerts({ txs: [], presupuestos: [], recurrentes: [rec({ active: false })] }, '2026-09-15').length, 0)
})

test('budget: al 80 % y superado, con id por mes y nivel', () => {
  const warn = computeFinanceAlerts({ txs: [tx('2026-09-02', 85)], presupuestos: [{ category: 'Restaurantes', limit: 100 }], recurrentes: [] }, '2026-09-15')
  assert.equal(warn[0].id, 'budget:Restaurantes:2026-09:warn')
  assert.equal(warn[0].title, 'Presupuesto al 85 %: Restaurantes')
  const over = computeFinanceAlerts({ txs: [tx('2026-09-02', 1234.5)], presupuestos: [{ category: 'Restaurantes', limit: 100 }], recurrentes: [] }, '2026-09-15')
  assert.equal(over[0].id, 'budget:Restaurantes:2026-09:over')
  assert.equal(over[0].body, '1.234,50 € gastados de 100,00 €')
})

test('summary: solo el día 1, sobre el mes anterior y sin contar traspasos', () => {
  const txs = [
    tx('2026-08-01', 2000, { type: 'income', category: 'Nómina' }),
    tx('2026-08-10', 500),
    tx('2026-08-11', 300, { kind: 'transfer' }),
  ]
  const a = computeFinanceAlerts({ txs, presupuestos: [], recurrentes: [] }, '2026-09-01')
  assert.deepEqual(a, [{ id: 'summary:2026-08', kind: 'summary', title: 'Resumen de agosto', body: 'Ingresos 2.000,00 € · Gastos 500,00 € · Ahorro 75 %' }])
  assert.equal(computeFinanceAlerts({ txs, presupuestos: [], recurrentes: [] }, '2026-09-02').length, 0)
})
