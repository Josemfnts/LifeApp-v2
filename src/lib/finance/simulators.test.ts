import test from 'node:test'
import assert from 'node:assert/strict'
import { simulateLoan, simulateMortgage, simulateSavings, DISCLAIMER } from './simulators.ts'
import { toCents } from './money.ts'

test('préstamo: 10.000 € a 5 años al 6 % → cuota 193,33 € y coste total cuadrado', () => {
  const s = simulateLoan({ amount: 10000, years: 5, tin: 0.06, openingFeePct: 0.01 })
  assert.equal(s.payment, 193.33)
  assert.equal(s.schedule.length, 60)
  assert.equal(s.openingFee, 100)
  assert.equal(toCents(s.totalCost), toCents(10000) + toCents(s.totalInterest) + toCents(100))
  assert.ok(s.totalInterest > 1590 && s.totalInterest < 1610, String(s.totalInterest))
})

test('hipoteca: el patrimonio solo baja en los gastos de compra; ratios y asequibilidad', () => {
  const s = simulateMortgage({
    price: 250000, downPayment: 50000, years: 30, tin: 0.03, purchaseCostsPct: 0.1,
    netWorth: 90000, liquid: 80000, totalAssets: 100000, totalDebt: 10000, monthlyIncome: 3000,
  })
  assert.equal(s.loan, 200000)
  assert.equal(s.purchaseCosts, 25000)
  assert.equal(s.upfrontCash, 75000)
  assert.equal(s.nwAfter, 65000)
  assert.equal(s.liquidAfter, 5000)
  assert.equal(s.debtToAssetsBefore, 0.1)
  assert.ok(s.debtToAssetsAfter !== null && Math.abs(s.debtToAssetsAfter - 210000 / 275000) < 1e-9)
  assert.ok(s.paymentToIncome !== null && s.paymentToIncome < 0.35)
  assert.equal(s.canAfford, true)
  const broke = simulateMortgage({ price: 250000, downPayment: 50000, years: 30, tin: 0.03, netWorth: 10000, liquid: 20000, totalAssets: 20000, totalDebt: 0 })
  assert.equal(broke.canAfford, false)
  assert.equal(broke.paymentToIncome, null)
})

test('ahorro: 1.000 € + 100 €/mes al 7 % 10 años coincide con el bucle de Análisis al euro', () => {
  const points = simulateSavings({ initial: 1000, monthly: 100, annualReturn: 0.07, years: 10, inflation: 0.02 })
  let total = 1000
  for (let i = 0; i < 120; i++) total = total * (1 + 0.07 / 12) + 100
  const last = points.at(-1)!
  assert.equal(points.length, 11)
  assert.equal(Math.round(last.value), Math.round(total))
  assert.equal(last.contributed, 13000)
  assert.ok(last.realValue < last.value)
  assert.deepEqual(points[0], { year: 0, contributed: 1000, value: 1000, realValue: 1000 })
})

test('disclaimer presente', () => {
  assert.match(DISCLAIMER, /No es asesoramiento financiero/)
})
