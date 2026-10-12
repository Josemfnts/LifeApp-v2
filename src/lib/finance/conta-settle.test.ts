// Tests de aceptación de F4 (Contabilidad por proyecto: cerrar el ciclo del cobro).
// Los escribe el arquitecto ANTES de la implementación: fijan el contrato de
// src/lib/finance/conta-settle.ts. No se editan.
//
// EN ROJO A PROPÓSITO hasta que exista src/lib/finance/conta-settle.ts. La fase está descrita en
// docs/relevos/contabilidad-fases.md (§F4). No "arregles" este fichero borrándolo.
//
// Qué se está cerrando: hoy `settlePufo` del financeStore solo marca el pufo `settled` con la
// fecha de HOY y no crea ningún movimiento. Visto desde Conta, eso hace desaparecer el dinero:
// el pendiente sale de "Te deben" y no entra en "Cobros". F4 convierte el pendiente en el
// ingreso real, con la fecha en la que de verdad entró el dinero.
//
// Por qué un motor puro: la suite es node:test nativo sin DOM. Lo que se prueba es la pieza que
// decide QUÉ se escribe; la hoja solo recoge fecha y cuenta y manda el resultado al store.
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSettlement, settleError } from './conta-settle.ts'
import type { Pufo } from './types.ts'

// Un pendiente vivo: Yatekomo me debe 500 € desde el 1 de octubre.
function pendiente(extra: Partial<Pufo> = {}): Pufo {
  return {
    id: 7,
    who: 'Yatekomo',
    person: 'Yatekomo',
    amount: 500,
    dir: 'me_debe',
    reason: 'Factura noviembre',
    concept: 'Factura noviembre',
    date: '2026-10-01',
    settled: false,
    project: 'yatekomo',
    ...extra,
  }
}

const COBRADO_EL = '2026-11-03'

test('buildSettlement: el pendiente se convierte en un ingreso normal de Finanzas', () => {
  const s = buildSettlement({ pufo: pendiente(), date: COBRADO_EL, cuenta: 'Banco' })
  assert.ok(s)
  // Exactamente estas claves: el cobro de un pendiente es un movimiento corriente, como en F3.
  assert.deepEqual({ ...s.tx }, {
    date: COBRADO_EL,
    amount: 500,
    type: 'income',
    category: 'Freelance',
    concept: 'Factura noviembre',
    note: '',
    cuenta: 'Banco',
    project: 'yatekomo',
  })
})

test('buildSettlement: el ingreso NO lleva kind (si lo llevara se caería del balance de Conta)', () => {
  const s = buildSettlement({ pufo: pendiente(), date: COBRADO_EL, cuenta: 'Banco' })
  assert.ok(s)
  assert.equal('kind' in s.tx, false)
  assert.equal('id' in s.tx, false) // el id lo pone el store
  assert.equal('split' in s.tx, false)
})

test('buildSettlement: el pufo se liquida con la fecha REAL del cobro, no con la de hoy', () => {
  const s = buildSettlement({ pufo: pendiente(), date: COBRADO_EL, cuenta: 'Banco' })
  assert.ok(s)
  // El parche se aplica con spread sobre el pufo existente: solo estas dos claves.
  assert.deepEqual({ ...s.pufoPatch }, { settled: true, settledDate: COBRADO_EL })
})

test('buildSettlement: el importe es el del pendiente, al céntimo', () => {
  const s = buildSettlement({ pufo: pendiente({ amount: 1210.5 }), date: COBRADO_EL, cuenta: 'Banco' })
  assert.ok(s)
  assert.equal(s.tx.amount, 1210.5)
})

test('buildSettlement: el proyecto y el concepto se heredan del pendiente', () => {
  const s = buildSettlement({
    pufo: pendiente({ project: 'clocks', concept: 'Mantenimiento Q3' }),
    date: COBRADO_EL,
    cuenta: 'Banco',
  })
  assert.ok(s)
  assert.equal(s.tx.project, 'clocks')
  assert.equal(s.tx.concept, 'Mantenimiento Q3')
})

test('buildSettlement: un pendiente sin proyecto no se inventa uno', () => {
  const sin = pendiente()
  delete sin.project
  const s = buildSettlement({ pufo: sin, date: COBRADO_EL, cuenta: 'Banco' })
  assert.ok(s)
  assert.equal(s.tx.project, undefined)
})

test('buildSettlement: sin cuenta elegida el ingreso se guarda sin cuenta, no con una vacía', () => {
  const s = buildSettlement({ pufo: pendiente(), date: COBRADO_EL, cuenta: '' })
  assert.ok(s)
  assert.equal(s.tx.cuenta, undefined)
})

test('settleError: hace falta la fecha en la que entró el dinero', () => {
  assert.equal(settleError({ pufo: pendiente(), date: '', cuenta: 'Banco' }), 'Elige la fecha del cobro')
  assert.equal(settleError({ pufo: pendiente(), date: '   ', cuenta: 'Banco' }), 'Elige la fecha del cobro')
  // Formato de la app: YYYY-MM-DD (lo que da el <input type="date">).
  assert.equal(settleError({ pufo: pendiente(), date: '03/11/2026', cuenta: 'Banco' }), 'Elige la fecha del cobro')
  assert.equal(settleError({ pufo: pendiente(), date: COBRADO_EL, cuenta: 'Banco' }), null)
})

test('settleError: un pendiente ya cobrado no se cobra dos veces', () => {
  const yaCobrado = pendiente({ settled: true, settledDate: '2026-10-20' })
  assert.equal(settleError({ pufo: yaCobrado, date: COBRADO_EL, cuenta: 'Banco' }), 'Este pendiente ya está cobrado')
})

test('settleError: lo que yo debo no se "cobra" (sería un gasto, no un ingreso)', () => {
  const leDebo = pendiente({ dir: 'le_debo' })
  assert.equal(settleError({ pufo: leDebo, date: COBRADO_EL, cuenta: 'Banco' }), 'Este pendiente no es un cobro')
})

test('settleError: un pendiente sin importe no genera movimiento', () => {
  assert.equal(settleError({ pufo: pendiente({ amount: 0 }), date: COBRADO_EL, cuenta: 'Banco' }), 'El pendiente no tiene importe')
})

test('buildSettlement: con cualquier error devuelve null (nada a medias llega al store)', () => {
  assert.equal(buildSettlement({ pufo: pendiente(), date: '', cuenta: 'Banco' }), null)
  assert.equal(buildSettlement({ pufo: pendiente({ settled: true }), date: COBRADO_EL, cuenta: 'Banco' }), null)
  assert.equal(buildSettlement({ pufo: pendiente({ dir: 'le_debo' }), date: COBRADO_EL, cuenta: 'Banco' }), null)
  assert.equal(buildSettlement({ pufo: pendiente({ amount: 0 }), date: COBRADO_EL, cuenta: 'Banco' }), null)
})

test('buildSettlement: no toca el pufo original (el store aplica el parche, no mutamos)', () => {
  const p = pendiente()
  buildSettlement({ pufo: p, date: COBRADO_EL, cuenta: 'Banco' })
  assert.equal(p.settled, false)
  assert.equal(p.settledDate, undefined)
})
