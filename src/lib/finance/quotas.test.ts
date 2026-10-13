// Tests de aceptación de F7 (la cuota mensual de cada proyecto: lo que le TIENEN que pagar).
// Los escribe el ARQUITECTO antes de la implementación: fijan el contrato de
// src/lib/finance/quotas.ts. NO se editan.
//
// El modelo, que es lo que hay que entender antes de tocar nada:
//   una cuota NO se apunta sola como ingreso (eso haría que el patrimonio enseñe dinero que no
//   ha llegado). Genera un PENDIENTE DE COBRO (Pufo me_debe con project), y el botón "Cobrar"
//   que ya existe desde F4 lo convierte en ingreso. Aquí solo se decide QUÉ pendientes faltan.
//
// Las cifras de este fichero son inventadas a propósito: el repo es público y las de los
// clientes de Josema no entran en el código.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_PROJECTS, setProjectCatalog } from './projects.ts'
import { dueQuotaPufos, quotaMonthlyTotal, type Quota } from './quotas.ts'
import type { Pufo } from './types.ts'

const HOY = '2026-10-14'

setProjectCatalog(DEFAULT_PROJECTS)

const quota = (q: Partial<Quota> & Pick<Quota, 'id' | 'project' | 'amount' | 'startDate'>): Quota => ({
  day: 1, freq: 'monthly', active: true, ...q,
})

const pufo = (p: Partial<Pufo> & Pick<Pufo, 'id' | 'amount' | 'date'>): Pufo => ({
  who: 'X', person: 'X', dir: 'me_debe', reason: '', concept: '', settled: false, ...p,
})

test('una cuota mensual genera el pendiente de cada mes desde su fecha de inicio, nunca del futuro', () => {
  const q = quota({ id: 1, project: 'clocks', amount: 100, startDate: '2026-08-01' })
  const r = dueQuotaPufos([q], [], HOY)
  assert.deepEqual(r.pufos.map(p => p.date), ['2026-08-01', '2026-09-01', '2026-10-01'])
  // Noviembre NO: el pendiente aparece cuando llega su día, no antes.
  assert.ok(!r.pufos.some(p => p.date.startsWith('2026-11')))
  assert.equal(r.lastRunByQuota[1], '2026-10-01')
})

test('el pendiente que genera es un me_debe del proyecto, con importe exacto y nombre legible', () => {
  const q = quota({ id: 1, project: 'clocks', amount: 100, startDate: '2026-10-01' })
  const [p] = dueQuotaPufos([q], [], HOY).pufos
  assert.equal(p.dir, 'me_debe')
  assert.equal(p.settled, false)
  assert.equal(p.amount, 100)
  assert.equal(p.project, 'clocks')
  assert.equal(p.quotaId, 1)
  assert.equal(p.date, '2026-10-01')
  // Para que la lista de pendientes de Patrimonio no enseñe huecos:
  assert.ok(p.who.length > 0)
  assert.ok(p.person.length > 0)
  assert.match(p.concept, /Clocks/)
  assert.doesNotMatch(p.concept, /undefined|NaN/)
})

test('idempotente por lastRun: lo ya generado no vuelve a salir aunque Josema lo haya borrado', () => {
  const q = quota({ id: 2, project: 'anantara', amount: 40, day: 5, startDate: '2026-09-05', lastRun: '2026-09-05' })
  const r = dueQuotaPufos([q], [], HOY)
  assert.deepEqual(r.pufos.map(p => p.date), ['2026-10-05'])
  assert.equal(r.lastRunByQuota[2], '2026-10-05')
  // Y con lastRun al día, nada que hacer: abrir la app diez veces no crea nada.
  const yaCorrida = dueQuotaPufos([{ ...q, lastRun: '2026-10-05' }], [], HOY)
  assert.deepEqual(yaCorrida.pufos, [])
  assert.deepEqual(yaCorrida.lastRunByQuota, {})
})

test('cinturón de seguridad: si ya hay un pendiente de esa cuota y ese MES, no se duplica', () => {
  const q = quota({ id: 1, project: 'clocks', amount: 100, startDate: '2026-08-01' })
  const existentes: Pufo[] = [
    pufo({ id: 9, amount: 100, date: '2026-09-03', project: 'clocks', quotaId: 1 }), // otro día, mismo mes
  ]
  const r = dueQuotaPufos([q], existentes, HOY)
  assert.deepEqual(r.pufos.map(p => p.date), ['2026-08-01', '2026-10-01'])
})

test('un pendiente de la cuota YA COBRADO tampoco se regenera', () => {
  const q = quota({ id: 1, project: 'clocks', amount: 100, startDate: '2026-10-01' })
  const existentes: Pufo[] = [
    pufo({ id: 9, amount: 100, date: '2026-10-01', project: 'clocks', quotaId: 1, settled: true, settledDate: '2026-10-10' }),
  ]
  assert.deepEqual(dueQuotaPufos([q], existentes, HOY).pufos, [])
})

test('cuota anual: un solo pendiente al año, no uno al mes', () => {
  const q = quota({ id: 3, project: 'elevencuts', amount: 120, freq: 'yearly', startDate: '2026-09-01' })
  const r = dueQuotaPufos([q], [], HOY)
  assert.deepEqual(r.pufos.map(p => p.date), ['2026-09-01'])
  // El siguiente cae en 2027: hoy no se genera nada más.
  const enDiciembre = dueQuotaPufos([{ ...q, lastRun: '2026-09-01' }], [], '2026-12-31')
  assert.deepEqual(enDiciembre.pufos, [])
})

test('una cuota inactiva no genera nada, y tampoco mueve su lastRun', () => {
  const q = quota({ id: 4, project: 'asensio', amount: 20, startDate: '2026-08-01', active: false })
  const r = dueQuotaPufos([q], [], HOY)
  assert.deepEqual(r.pufos, [])
  assert.deepEqual(r.lastRunByQuota, {})
})

test('el día 31 no se pierde en los meses cortos: cae en el último día del mes', () => {
  const q = quota({ id: 5, project: 'clocks', amount: 100, day: 31, startDate: '2026-08-31' })
  const r = dueQuotaPufos([q], [], HOY)
  assert.deepEqual(r.pufos.map(p => p.date), ['2026-08-31', '2026-09-30'])
})

test('nada anterior a la fecha de inicio, aunque el día ya haya pasado ese mes', () => {
  const q = quota({ id: 6, project: 'clocks', amount: 100, day: 1, startDate: '2026-09-15' })
  const r = dueQuotaPufos([q], [], HOY)
  // El 1 de septiembre es anterior al inicio: el primer pendiente es el de octubre.
  assert.deepEqual(r.pufos.map(p => p.date), ['2026-10-01'])
})

test('tope de seguridad: una fecha de inicio antigua no inunda la app de pendientes', () => {
  const q = quota({ id: 7, project: 'clocks', amount: 100, startDate: '2015-01-01' })
  const r = dueQuotaPufos([q], [], HOY)
  assert.ok(r.pufos.length <= 24, `ha generado ${r.pufos.length} pendientes de golpe`)
  // Y los que genera son los últimos, no los de 2015.
  assert.equal(r.pufos[r.pufos.length - 1].date, '2026-10-01')
})

test('varias cuotas a la vez: cada una con su cuenta y su marca, sin mezclarse', () => {
  const qs = [
    quota({ id: 1, project: 'clocks', amount: 100, startDate: '2026-10-01' }),
    quota({ id: 2, project: 'anantara', amount: 40, day: 5, startDate: '2026-10-05' }),
    quota({ id: 3, project: 'elevencuts', amount: 120, freq: 'yearly', startDate: '2026-09-01' }),
  ]
  const r = dueQuotaPufos(qs, [], HOY)
  assert.equal(r.pufos.length, 3)
  assert.deepEqual(r.pufos.map(p => [p.project, p.amount, p.quotaId]),
    [['clocks', 100, 1], ['anantara', 40, 2], ['elevencuts', 120, 3]])
  assert.deepEqual(r.lastRunByQuota, { 1: '2026-10-01', 2: '2026-10-05', 3: '2026-09-01' })
})

test('importes con céntimos sin arrastre de coma flotante', () => {
  const qs = [
    quota({ id: 1, project: 'clocks', amount: 20.83, startDate: '2026-10-01' }),
    quota({ id: 2, project: 'anantara', amount: 0.1, startDate: '2026-10-01' }),
  ]
  const r = dueQuotaPufos(qs, [], HOY)
  assert.deepEqual(r.pufos.map(p => p.amount), [20.83, 0.1])
})

test('un pendiente apuntado a mano (sin quotaId) no bloquea la cuota de ese mes', () => {
  const q = quota({ id: 1, project: 'clocks', amount: 100, startDate: '2026-10-01' })
  const aMano: Pufo[] = [pufo({ id: 9, amount: 100, date: '2026-10-02', project: 'clocks' })]
  assert.deepEqual(dueQuotaPufos([q], aMano, HOY).pufos.map(p => p.date), ['2026-10-01'])
})

test('quotaMonthlyTotal: lo que debería entrar cada mes, con las anuales repartidas', () => {
  const qs = [
    quota({ id: 1, project: 'clocks', amount: 100, startDate: '2026-08-01' }),
    quota({ id: 2, project: 'anantara', amount: 40, startDate: '2026-09-05' }),
    quota({ id: 3, project: 'elevencuts', amount: 120, freq: 'yearly', startDate: '2026-09-01' }), // 10 €/mes
    quota({ id: 4, project: 'asensio', amount: 20, startDate: '2026-08-01', active: false }),      // no cuenta
  ]
  assert.equal(quotaMonthlyTotal(qs), 150)
  assert.equal(quotaMonthlyTotal([]), 0)
})
