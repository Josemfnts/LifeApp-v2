// Tests de aceptación de F2 (Contabilidad por proyecto: las vistas con datos reales).
// Los escribe el arquitecto ANTES de la implementación: fijan el contrato de
// src/lib/finance/conta-view.ts. No se editan.
//
// EN ROJO A PROPÓSITO hasta que exista src/lib/finance/conta-view.ts. La fase está descrita en
// docs/relevos/contabilidad-fases.md (§F2). No "arregles" este fichero borrándolo.
//
// Por qué un motor de vista aparte: la suite es node:test nativo, sin DOM ni librería de
// render, así que lo que se puede probar de una pantalla es el modelo que pinta.
// ContabilidadTab.tsx debe limitarse a pintar lo que devuelven estas dos funciones.
import test from 'node:test'
import assert from 'node:assert/strict'
import { contaMonthView, contaYearView, monthKeyLabel, monthShortLabels, shiftMonthKey } from './conta-view.ts'
import type { Pufo, Tx } from './types.ts'

function tx(partial: Partial<Tx>): Tx {
  return {
    date: '2026-10-05',
    amount: 0,
    type: 'income',
    category: 'Trabajo',
    concept: '',
    note: '',
    cuenta: 'Banco',
    ...partial,
  }
}

function pufo(partial: Partial<Pufo>): Pufo {
  return {
    id: 1,
    who: 'Yatekomo',
    person: 'Yatekomo',
    amount: 0,
    dir: 'me_debe',
    reason: '',
    concept: '',
    date: '2026-10-08',
    settled: false,
    ...partial,
  }
}

const COBRO = tx({ id: 1, date: '2026-10-05', amount: 1210, type: 'income', concept: 'Factura octubre', project: 'yatekomo' })
const GASTO = tx({ id: 2, date: '2026-10-07', amount: 310.5, type: 'expense', concept: 'Servidor', category: 'Software', project: 'yatekomo' })
const PENDIENTE = pufo({ id: 10, amount: 500, concept: 'Factura noviembre adelantada', project: 'yatekomo' })

const HOY = '2026-10-20'

function mesDeOctubre(extra: { txs?: Tx[]; pufos?: Pufo[]; filter?: 'all' | 'yatekomo' | 'otros' | 'asensio' } = {}) {
  return contaMonthView({
    txs: extra.txs ?? [COBRO, GASTO],
    pufos: extra.pufos ?? [PENDIENTE],
    month: '2026-10',
    filter: extra.filter ?? 'yatekomo',
    today: HOY,
  })
}

test('shiftMonthKey: cruza el año por los dos lados', () => {
  assert.equal(shiftMonthKey('2026-10', -1), '2026-09')
  assert.equal(shiftMonthKey('2026-10', 1), '2026-11')
  assert.equal(shiftMonthKey('2026-01', -1), '2025-12')
  assert.equal(shiftMonthKey('2026-12', 1), '2027-01')
  assert.equal(shiftMonthKey('2026-10', 0), '2026-10')
})

test('monthKeyLabel y monthShortLabels: en español y sin inventar meses', () => {
  assert.equal(monthKeyLabel('2026-10'), 'octubre 2026')
  assert.equal(monthKeyLabel('2026-01'), 'enero 2026')
  const cortos = monthShortLabels()
  assert.equal(cortos.length, 12)
  assert.equal(cortos[0], 'ene')
  assert.equal(cortos[9], 'oct')
  assert.equal(cortos[11], 'dic')
})

test('nav del mes: etiqueta, mes anterior y nada de viajar al futuro', () => {
  const v = mesDeOctubre()
  assert.equal(v.month, '2026-10')
  assert.equal(v.nav.label, 'octubre 2026')
  assert.equal(v.nav.prev, '2026-09')
  assert.equal(v.nav.next, null) // octubre es el mes de hoy: no hay flecha a noviembre

  const septiembre = contaMonthView({ txs: [COBRO, GASTO], pufos: [], month: '2026-09', filter: 'yatekomo', today: HOY })
  assert.equal(septiembre.nav.label, 'septiembre 2026')
  assert.equal(septiembre.nav.next, '2026-10')
})

test('stats del mes: tres cifras en una tira, en orden y con su tono', () => {
  const v = mesDeOctubre()
  assert.deepEqual(
    v.stats.map(s => [s.key, s.label, s.value, s.tone]),
    [
      ['cobrado', 'Cobrado', 1210, 'pos'],
      ['gastado', 'Gastos', 310.5, 'neg'],
      ['balance', 'Balance', 899.5, 'pos'],
    ],
  )
  // Lo del año acumulado se ve, pero no se mezcla con las tres cifras del mes.
  assert.equal(v.balanceAnio, 899.5)
})

test('stats del mes: un mes en pérdidas marca el balance en negativo', () => {
  const v = mesDeOctubre({ txs: [GASTO], pufos: [] })
  const balance = v.stats.find(s => s.key === 'balance')
  assert.ok(balance)
  assert.equal(balance.value, -310.5)
  assert.equal(balance.tone, 'neg')
})

test('bloques del mes: filas listas para pintar, sin que la UI vuelva a calcular', () => {
  const v = mesDeOctubre()
  assert.deepEqual(v.blocks.map(b => [b.key, b.title]), [
    ['cobros', 'Cobros'],
    ['gastos', 'Gastos'],
    ['pendientes', 'Te deben'],
  ])

  const cobros = v.blocks[0]
  assert.equal(cobros.empty, false)
  assert.equal(cobros.total, 1210)
  assert.equal(cobros.rows.length, 1)
  assert.deepEqual(
    { ...cobros.rows[0] },
    { id: 1, date: '2026-10-05', dateLabel: '5 oct', concept: 'Factura octubre', amount: 1210, project: 'yatekomo', projectLabel: 'Yatekomo' },
  )

  const pendientes = v.blocks[2]
  assert.equal(pendientes.total, 500)
  assert.equal(pendientes.rows[0].amount, 500)
  assert.equal(pendientes.rows[0].projectLabel, 'Yatekomo')
})

test('bloques del mes: un apunte sin concepto no pinta un hueco', () => {
  const v = mesDeOctubre({ txs: [tx({ id: 3, date: '2026-10-11', amount: 60, type: 'expense', concept: '', project: 'yatekomo' })], pufos: [] })
  const gastos = v.blocks.find(b => b.key === 'gastos')
  assert.ok(gastos)
  assert.equal(gastos.rows[0].concept, 'Sin concepto')
  assert.equal(gastos.rows[0].dateLabel, '11 oct')
})

test('lo pendiente se ve aparte y NUNCA entra en el balance', () => {
  const v = mesDeOctubre({ txs: [], pufos: [PENDIENTE] })
  const balance = v.stats.find(s => s.key === 'balance')
  assert.ok(balance)
  assert.equal(balance.value, 0)
  assert.equal(v.pendiente, 500)
  const pendientes = v.blocks.find(b => b.key === 'pendientes')
  assert.ok(pendientes)
  assert.equal(pendientes.empty, false)
  assert.equal(pendientes.total, 500)
})

test('un mes sin nada: bloques vacíos con su mensaje, cero cifras inventadas', () => {
  const v = mesDeOctubre({ filter: 'asensio' })
  assert.equal(v.empty, true)
  for (const b of v.blocks) {
    assert.equal(b.empty, true)
    assert.deepEqual(b.rows, [])
    assert.equal(b.total, 0)
    assert.equal(typeof b.emptyMessage, 'string')
    assert.notEqual(b.emptyMessage, '')
    // Se acabaron los marcadores de obra de F0: el mensaje habla del mes, no de la fase siguiente.
    assert.equal(/fase/i.test(String(b.emptyMessage)), false)
  }
  assert.equal(v.stats.every(s => s.value === 0), true)
})

test('de un gasto compartido, la fila muestra mi parte y no el importe bruto', () => {
  const compartido = tx({
    id: 7, date: '2026-10-09', amount: 100, type: 'expense', concept: 'Comida con el cliente', project: 'yatekomo',
    split: { mode: 'equal', people: [{ name: 'Socio', share: 60 }], myShare: 40 },
  })
  const v = mesDeOctubre({ txs: [compartido], pufos: [] })
  const gastos = v.blocks.find(b => b.key === 'gastos')
  assert.ok(gastos)
  assert.equal(gastos.rows[0].amount, 40)
  assert.equal(gastos.total, 40)
})

test('filtro Otros: lo sin marcar y lo de un proyecto retirado caen ahí, ya etiquetados', () => {
  const global = tx({ id: 9, date: '2026-10-03', amount: 49.99, type: 'expense', concept: 'Gestoría', category: 'Servicios' })
  const viejo = tx({ id: 11, date: '2026-10-04', amount: 10, type: 'expense', concept: 'Cliente retirado', project: 'cliente-que-ya-no-existe' as unknown as Tx['project'] })
  const v = mesDeOctubre({ txs: [COBRO, GASTO, global, viejo], pufos: [], filter: 'otros' })
  const gastos = v.blocks.find(b => b.key === 'gastos')
  assert.ok(gastos)
  assert.equal(gastos.rows.length, 2)
  for (const r of gastos.rows) {
    assert.equal(r.project, 'otros')
    assert.equal(r.projectLabel, 'Otros')
  }
  assert.equal(gastos.total, 59.99)
})

test('vista Año: tabla proyecto × mes con etiquetas cortas y totales de fila, columna y año', () => {
  const txs = [
    COBRO, GASTO,
    tx({ id: 50, date: '2026-03-10', amount: 500, type: 'income', concept: 'Clocks marzo', project: 'clocks' }),
    tx({ id: 51, date: '2026-10-02', amount: 100, type: 'expense', concept: 'Gestoría', category: 'Servicios' }),
  ]
  const y = contaYearView({ txs, pufos: [PENDIENTE], year: 2026 })
  assert.equal(y.year, 2026)
  assert.equal(y.empty, false)
  assert.deepEqual(y.monthLabels, monthShortLabels())
  assert.deepEqual(y.rows.map(r => [r.project, r.label]), [['clocks', 'Clocks'], ['yatekomo', 'Yatekomo'], ['otros', 'Otros']])

  const yate = y.rows.find(r => r.project === 'yatekomo')
  assert.ok(yate)
  assert.equal(yate.months.length, 12)
  assert.equal(yate.months[9].monthKey, '2026-10')
  assert.equal(yate.months[9].balance, 899.5)
  assert.equal(yate.months[9].empty, false)
  assert.equal(yate.months[2].empty, true) // marzo no es suyo: celda en blanco, no un 0 gritando
  assert.equal(yate.total.balance, 899.5)

  assert.equal(y.totalByMonth[9].cobrado, 1210)
  assert.equal(y.totalByMonth[9].gastado, 410.5)
  assert.equal(y.total.cobrado, 1710)
  assert.equal(y.total.balance, 1299.5)
})

test('vista Año: un proyecto con solo pendientes no inventa fila (la tabla es de cobros y gastos)', () => {
  const y = contaYearView({ txs: [], pufos: [PENDIENTE], year: 2026 })
  assert.deepEqual(y.rows, [])
  assert.equal(y.empty, true)
  assert.equal(typeof y.emptyMessage, 'string')
  assert.notEqual(y.emptyMessage, '')
})

test('vista Año: con filtro de proyecto solo trae esa fila; un año vacío no revienta', () => {
  const soloYate = contaYearView({ txs: [COBRO, GASTO, tx({ id: 60, date: '2026-03-10', amount: 500, type: 'income', project: 'clocks' })], pufos: [], year: 2026, filter: 'yatekomo' })
  assert.deepEqual(soloYate.rows.map(r => r.project), ['yatekomo'])
  assert.equal(soloYate.total.balance, 899.5)

  const vacio = contaYearView({ txs: [COBRO], pufos: [], year: 2024 })
  assert.deepEqual(vacio.rows, [])
  assert.equal(vacio.empty, true)
  assert.equal(vacio.totalByMonth.length, 12)
  assert.equal(vacio.total.cobrado, 0)
})
