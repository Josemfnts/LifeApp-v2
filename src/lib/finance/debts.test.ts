import test from 'node:test'
import assert from 'node:assert/strict'
import { effectiveRate, monthlyPayment, schedule, remainingMonths, nextPaymentSplit, simulateExtra, type Debt } from './debts.ts'
import { toCents } from './money.ts'
import { computeNetWorth } from './networth.ts'

function debt(partial: Partial<Debt>): Debt {
  return {
    id: 'd1', name: 'Hipoteca', kind: 'mortgage', principal: 150000, balance: 150000, annualRate: 0.03,
    rateType: 'fixed', termMonths: 360, startDate: '2026-09-15', paymentDay: 15, payments: [], ...partial,
  }
}

const cents = (rows: { [k: string]: number }[], k: string) => rows.reduce((s, r) => s + toCents(r[k]), 0)

test('monthlyPayment: 150.000 € al 3 % a 30 años = 632,41 €', () => {
  assert.equal(monthlyPayment(150000, 0.03, 360), 632.41)
})

test('schedule: cierra a 0, Σ capital == P al céntimo y Σ intereses == Σ cuotas − P', () => {
  const rows = schedule(150000, 0.03, 360, '2026-09-15', 15)
  assert.equal(rows.length, 360)
  assert.equal(rows.at(-1)!.balance, 0)
  assert.equal(cents(rows, 'principal'), toCents(150000))
  assert.equal(cents(rows, 'interest'), cents(rows, 'payment') - toCents(150000))
  assert.equal(rows[0].date, '2026-10-15')
  assert.equal(rows[0].interest, 375)
  assert.equal(rows[0].principal, 257.41)
})

test('sin interés: cuotas iguales y el céntimo sobrante en la última', () => {
  assert.equal(monthlyPayment(1200, 0, 12), 100)
  const rows = schedule(1000, 0, 3, '2026-01-31')
  assert.deepEqual(rows.map(r => r.principal), [333.33, 333.33, 333.34])
  assert.equal(rows[0].date, '2026-02-28')
})

test('tarjeta a plazo corto también cierra exacto', () => {
  const rows = schedule(1000, 0.2, 6, '2026-01-10')
  assert.equal(rows.length, 6)
  assert.equal(rows.at(-1)!.balance, 0)
  assert.equal(cents(rows, 'principal'), toCents(1000))
})

test('effectiveRate: variable = Euríbor + diferencial', () => {
  assert.ok(Math.abs(effectiveRate({ rateType: 'variable', annualRate: 0.05, euribor: 0.025, spread: 0.01 }) - 0.035) < 1e-12)
  assert.equal(effectiveRate({ rateType: 'fixed', annualRate: 0.03 }), 0.03)
})

test('remainingMonths: cuenta los meses cumplidos según el día', () => {
  const d = { startDate: '2020-01-15', termMonths: 360, balance: 100000 }
  assert.equal(remainingMonths(d, '2026-09-15'), 280)
  assert.equal(remainingMonths(d, '2026-09-14'), 281)
  assert.equal(remainingMonths({ ...d, termMonths: 12 }, '2026-09-15'), 1)
  assert.equal(remainingMonths({ ...d, termMonths: 12, balance: 0 }, '2026-09-15'), 0)
})

test('nextPaymentSplit: intereses sobre el pendiente y el resto a capital', () => {
  const d = debt({ balance: 100000, startDate: '2006-09-15', termMonths: 480 })
  const s = nextPaymentSplit(d, '2026-09-15')
  assert.equal(s.interest, 250)
  assert.equal(s.total, monthlyPayment(100000, 0.03, 240))
  assert.equal(toCents(s.principal) + toCents(s.interest), toCents(s.total))
})

test('pagar una cuota solo baja el patrimonio en los intereses', () => {
  const d = debt({ balance: 100000, startDate: '2006-09-15', termMonths: 480 })
  const s = nextPaymentSplit(d, '2026-09-15')
  const before = computeNetWorth([{ name: 'Banco', type: 'bank', balance: 5000, color: '', note: '', updatedAt: '' }], { debt: d.balance })
  const after = computeNetWorth(
    [{ name: 'Banco', type: 'bank', balance: 5000 - s.total, color: '', note: '', updatedAt: '' }],
    { debt: d.balance - s.principal },
  )
  assert.equal(toCents(before.net) - toCents(after.net), toCents(s.interest))
})

test('simulateExtra: reducir plazo ahorra meses e intereses; reducir cuota baja la cuota', () => {
  const d = debt({ balance: 120000, startDate: '2016-09-15', termMonths: 360 })
  const term = simulateExtra(d, 20000, 'reduce_term', '2026-09-15')
  assert.ok(term.monthsSaved > 0)
  assert.ok(term.interestSaved > 0)
  assert.equal(term.newPayment, monthlyPayment(120000, 0.03, 240))
  const pay = simulateExtra(d, 20000, 'reduce_payment', '2026-09-15')
  assert.equal(pay.monthsSaved, 0)
  assert.ok(pay.newPayment < monthlyPayment(120000, 0.03, 240))
  assert.ok(pay.interestSaved > 0)
  assert.ok(term.interestSaved > pay.interestSaved)
  const all = simulateExtra(d, 999999, 'reduce_term', '2026-09-15')
  assert.equal(all.newMonths, 0)
})
