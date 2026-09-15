import test from 'node:test'
import assert from 'node:assert/strict'
import { buildFinanceContext, type FinanceState } from './context.ts'
import type { Tx } from './types.ts'

const tx = (date: string, amount: number, extra: Partial<Tx> = {}): Tx =>
  ({ date, amount, type: 'expense', category: 'Restaurantes', concept: 'x', note: '', ...extra })

function state(): FinanceState {
  const txs: Tx[] = [
    tx('2026-09-01', 2000, { type: 'income', category: 'Nómina' }),
    tx('2026-09-05', 120),
    tx('2026-09-06', 90, { split: { mode: 'equal', myShare: 30, people: [{ name: 'Ana', share: 30 }, { name: 'Luis', share: 30 }] } }),
    tx('2026-09-07', 500, { kind: 'transfer', category: 'Traspaso' }),
    tx('2026-09-08', 300, { category: 'Alimentación' }),
  ]
  for (let m = 3; m <= 8; m++) txs.push(tx(`2026-0${m}-10`, 100))
  return {
    txs,
    cuentas: [{ name: 'Banco', type: 'bank', balance: 3000, color: '', note: '', updatedAt: '' }],
    holdings: [],
    priceCache: {},
    debts: [{ id: 'd', name: 'Hipoteca', kind: 'mortgage', principal: 150000, balance: 100000, annualRate: 0.03, rateType: 'fixed', termMonths: 480, startDate: '2006-09-15', paymentDay: 15, payments: [] }],
    properties: [],
    presupuestos: [{ category: 'Restaurantes', limit: 160 }],
    recurrentes: [{ id: 1, concept: 'Alquiler', amount: 750, type: 'expense', category: 'Vivienda', day: 20, active: true }],
    pufos: [
      { id: 1, who: 'Ana', person: 'Ana', amount: 30, dir: 'me_debe', reason: '', concept: '', date: '2026-09-06', settled: false },
      { id: 2, who: 'Pepe', person: 'Pepe', amount: 15, dir: 'le_debo', reason: '', concept: '', date: '2026-09-01', settled: true },
    ],
    snapshots: [{ date: '2026-08-15', liquid: 2800, investments: 0, property: 0, debt: 100300, net: -97500 }],
  }
}

test('mes: flujo con mi parte de los compartidos y sin traspasos; tasa de ahorro', () => {
  const c = buildFinanceContext(state(), '2026-09-15', Date.parse('2026-09-15T12:00:00Z'))
  assert.deepEqual(c.month, { key: '2026-09', income: 2000, expense: 450, savingsRate: 78 })
})

test('categorías top con media de 6 meses, presupuestos en aviso y próximos cargos', () => {
  const c = buildFinanceContext(state(), '2026-09-15')
  assert.deepEqual(c.topCategories[0], { category: 'Alimentación', amount: 300, avg6m: 0, deltaPct: null })
  assert.deepEqual(c.topCategories[1], { category: 'Restaurantes', amount: 150, avg6m: 100, deltaPct: 50 })
  assert.deepEqual(c.budgets, [{ category: 'Restaurantes', pct: 94, level: 'warn' }])
  assert.deepEqual(c.upcoming, [{ date: '2026-09-20', concept: 'Alquiler', amount: -750 }])
})

test('patrimonio, deudas, pufos activos y tamaño compacto', () => {
  const c = buildFinanceContext(state(), '2026-09-15')
  // 30 € que Ana me debe (pufo activo) cuentan como líquido, igual que en el hero y la foto diaria.
  assert.equal(c.netWorth.now, 3000 + 30 - 100000)
  assert.equal(c.netWorth.breakdown.liquid, 3030)
  assert.equal(c.netWorth.var1M, -96970 - -97500)
  assert.equal(c.debts.total, 100000)
  assert.ok(c.debts.monthlyPayments > 0)
  assert.deepEqual(c.receivables, { meDeben: 30, lesDebo: 0 })
  assert.match(c.disclaimer, /asesoramiento/)
  assert.ok(JSON.stringify(c).length < 4096)
})
