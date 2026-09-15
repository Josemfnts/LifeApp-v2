import test from 'node:test'
import assert from 'node:assert/strict'
import { CUENTA_GROUP, computeNetWorth } from './networth.ts'
import type { Cuenta } from './types.ts'

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

test('CUENTA_GROUP: mapea tipos conocidos', () => {
  assert.equal(CUENTA_GROUP.bank, 'liquid')
  assert.equal(CUENTA_GROUP.savings, 'liquid')
  assert.equal(CUENTA_GROUP.cash, 'liquid')
  assert.equal(CUENTA_GROUP.invest, 'investments')
  assert.equal(CUENTA_GROUP.pension, 'investments')
  assert.equal(CUENTA_GROUP.property, 'property')
  assert.equal(CUENTA_GROUP.vehicle, 'property')
  assert.equal(CUENTA_GROUP.loan, 'debt')
  assert.equal(CUENTA_GROUP.mortgage, 'debt')
  assert.equal(CUENTA_GROUP.credit, 'debt')
})

test('CUENTA_GROUP: tipo desconocido cae a liquid vía computeNetWorth', () => {
  const cuentas: Cuenta[] = [c({ type: 'futuro' as string, balance: 1000 })]
  const r = computeNetWorth(cuentas)
  assert.equal(r.liquid, 1000)
  assert.equal(r.net, 1000)
})

test('computeNetWorth: agrupa y resta deudas con Math.abs', () => {
  const cuentas: Cuenta[] = [
    c({ type: 'bank', balance: 1000 }),
    c({ type: 'savings', balance: 2000 }),
    c({ type: 'cash', balance: 500 }),
    c({ type: 'invest', balance: 3000 }),
    c({ type: 'pension', balance: 4000 }),
    c({ type: 'property', balance: 100000 }),
    c({ type: 'mortgage', balance: -80000 }),
    c({ type: 'loan', balance: -5000 }),
  ]
  const r = computeNetWorth(cuentas)
  assert.equal(r.liquid, 3500)
  assert.equal(r.investments, 7000)
  assert.equal(r.property, 100000)
  assert.equal(r.debt, 85000)
  assert.equal(r.net, 100000 + 7000 + 3500 - 85000)
})

test('computeNetWorth: deuda con saldo positivo (error del usuario) se trata como deuda', () => {
  const cuentas: Cuenta[] = [c({ type: 'mortgage', balance: 1000 })]
  const r = computeNetWorth(cuentas)
  assert.equal(r.debt, 1000)
  assert.equal(r.net, -1000)
})

test('computeNetWorth: includeInNw=false excluye la cuenta', () => {
  const cuentas: Cuenta[] = [
    c({ type: 'bank', balance: 1000 }),
    c({ type: 'savings', balance: 2000, includeInNw: false }),
  ]
  const r = computeNetWorth(cuentas)
  assert.equal(r.liquid, 1000)
  assert.equal(r.net, 1000)
})

test('computeNetWorth: extra suma a los grupos', () => {
  const cuentas: Cuenta[] = [c({ type: 'bank', balance: 1000 })]
  const r = computeNetWorth(cuentas, { investments: 5000, property: 200000, debt: 150000 })
  assert.equal(r.liquid, 1000)
  assert.equal(r.investments, 5000)
  assert.equal(r.property, 200000)
  assert.equal(r.debt, 150000)
  assert.equal(r.net, 1000 + 5000 + 200000 - 150000)
})

test('computeNetWorth: vacío da todo 0', () => {
  const r = computeNetWorth([])
  assert.equal(r.net, 0)
  assert.equal(r.liquid, 0)
  assert.equal(r.debt, 0)
})
