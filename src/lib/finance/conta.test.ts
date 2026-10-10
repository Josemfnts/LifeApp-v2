// Tests de aceptación de F1 (Contabilidad por proyecto). Los escribe el arquitecto ANTES de la
// implementación: fijan el contrato de src/lib/finance/conta.ts. No se editan.
//
// EN ROJO A PROPÓSITO hasta que exista src/lib/finance/conta.ts: es el contrato de la fase F1
// descrita en docs/relevos/contabilidad-fases.md. No "arregles" este fichero borrándolo.
import test from 'node:test'
import assert from 'node:assert/strict'
import { contaMonth, contaYear } from './conta.ts'
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

// El flujo que Josema va a usar: cobro y gasto del mes contra Yatekomo, más una cantidad pendiente.
const COBRO = tx({ id: 1, date: '2026-10-05', amount: 1210, type: 'income', concept: 'Factura octubre', project: 'yatekomo' })
const GASTO = tx({ id: 2, date: '2026-10-07', amount: 310.5, type: 'expense', concept: 'Servidor', category: 'Software', project: 'yatekomo' })
const PENDIENTE = pufo({ id: 10, amount: 500, concept: 'Factura noviembre adelantada', project: 'yatekomo' })

test('contaMonth: cobro 1.210 − gasto 310,50 de Yatekomo deja balance 899,50 y 500 pendientes aparte', () => {
  const m = contaMonth({ txs: [COBRO, GASTO], pufos: [PENDIENTE], month: '2026-10', filter: 'yatekomo' })
  assert.equal(m.month, '2026-10')
  assert.equal(m.cobrado, 1210)
  assert.equal(m.gastado, 310.5)
  assert.equal(m.balance, 899.5)
  assert.equal(m.pendiente, 500) // lo pendiente NO entra en el balance
  assert.equal(m.cobros.length, 1)
  assert.equal(m.gastos.length, 1)
  assert.equal(m.pendientes.length, 1)
  assert.deepEqual(
    { id: m.cobros[0].id, concept: m.cobros[0].concept, amount: m.cobros[0].amount, project: m.cobros[0].project },
    { id: 1, concept: 'Factura octubre', amount: 1210, project: 'yatekomo' },
  )
  assert.equal(m.pendientes[0].amount, 500)
  assert.equal(m.pendientes[0].project, 'yatekomo')
})

test('contaMonth: lo que no es flujo (traspaso, inversión, capital de deuda, ajuste) no es cobro ni gasto', () => {
  const txs = [
    COBRO,
    tx({ id: 3, date: '2026-10-06', amount: 900, type: 'expense', kind: 'transfer', concept: 'A la otra cuenta', project: 'yatekomo' }),
    tx({ id: 4, date: '2026-10-06', amount: 500, type: 'expense', kind: 'investment', concept: 'Compra ETF', project: 'yatekomo' }),
    tx({ id: 5, date: '2026-10-06', amount: 200, type: 'expense', kind: 'debt_principal', concept: 'Capital hipoteca', project: 'yatekomo' }),
    tx({ id: 6, date: '2026-10-06', amount: 30, type: 'income', kind: 'adjust', concept: 'Ajuste de saldo', project: 'yatekomo' }),
  ]
  const m = contaMonth({ txs, pufos: [], month: '2026-10', filter: 'yatekomo' })
  assert.equal(m.cobrado, 1210)
  assert.equal(m.gastado, 0)
  assert.equal(m.balance, 1210)
  assert.equal(m.gastos.length, 0)
})

test('contaMonth: de un gasto compartido solo cuenta mi parte (flowAmount, nunca tx.amount)', () => {
  const compartido = tx({
    id: 7, date: '2026-10-09', amount: 100, type: 'expense', concept: 'Comida con el cliente', project: 'yatekomo',
    split: { mode: 'equal', people: [{ name: 'Socio', share: 60 }], myShare: 40 },
  })
  const m = contaMonth({ txs: [compartido], pufos: [], month: '2026-10', filter: 'yatekomo' })
  assert.equal(m.gastado, 40)
  assert.equal(m.balance, -40)
  assert.equal(m.gastos[0].amount, 40)
})

test('contaMonth: el filtro Todos suma todos los proyectos', () => {
  const otroProyecto = tx({ id: 8, date: '2026-10-04', amount: 200, type: 'income', concept: 'Clocks', project: 'clocks' })
  const m = contaMonth({ txs: [COBRO, GASTO, otroProyecto], pufos: [PENDIENTE], month: '2026-10', filter: 'all' })
  assert.equal(m.cobrado, 1410)
  assert.equal(m.gastado, 310.5)
  assert.equal(m.balance, 1099.5)
  assert.equal(m.pendiente, 500)
})

test('contaMonth: el filtro Otros recoge el gasto global (sin proyecto) y los proyectos desconocidos', () => {
  const global = tx({ id: 9, date: '2026-10-03', amount: 49.99, type: 'expense', concept: 'Gestoría', category: 'Servicios' })
  const viejo = tx({ id: 11, date: '2026-10-03', amount: 10, type: 'expense', concept: 'Cliente retirado', project: 'cliente-que-ya-no-existe' as unknown as Tx['project'] })
  const m = contaMonth({ txs: [COBRO, GASTO, global, viejo], pufos: [], month: '2026-10', filter: 'otros' })
  assert.equal(m.cobrado, 0)
  assert.equal(m.gastado, 59.99)
  assert.equal(m.balance, -59.99)
  assert.equal(m.gastos.length, 2)
  for (const g of m.gastos) assert.equal(g.project, 'otros') // ya resuelto, la UI no vuelve a adivinar
})

test('contaMonth: un proyecto sin movimientos da ceros, no undefined', () => {
  const m = contaMonth({ txs: [COBRO, GASTO], pufos: [PENDIENTE], month: '2026-10', filter: 'asensio' })
  assert.equal(m.cobrado, 0)
  assert.equal(m.gastado, 0)
  assert.equal(m.pendiente, 0)
  assert.equal(m.balance, 0)
  assert.deepEqual(m.cobros, [])
  assert.deepEqual(m.gastos, [])
  assert.deepEqual(m.pendientes, [])
})

test('contaMonth: el mes es frontera exacta; nada del mes anterior ni del siguiente se cuela', () => {
  const antes = tx({ id: 12, date: '2026-09-30', amount: 1000, type: 'income', concept: 'Septiembre', project: 'yatekomo' })
  const despues = tx({ id: 13, date: '2026-11-01', amount: 1000, type: 'income', concept: 'Noviembre', project: 'yatekomo' })
  const m = contaMonth({ txs: [antes, COBRO, despues], pufos: [], month: '2026-10', filter: 'yatekomo' })
  assert.equal(m.cobrado, 1210)
  assert.equal(m.cobros.length, 1)
})

test('contaMonth: sumas en céntimos, sin deriva de coma flotante', () => {
  const txs = [
    tx({ id: 14, date: '2026-10-01', amount: 0.1, type: 'income', project: 'yatekomo' }),
    tx({ id: 15, date: '2026-10-02', amount: 0.2, type: 'income', project: 'yatekomo' }),
    tx({ id: 16, date: '2026-10-03', amount: 0.3, type: 'expense', project: 'yatekomo' }),
  ]
  const m = contaMonth({ txs, pufos: [], month: '2026-10', filter: 'yatekomo' })
  assert.equal(m.cobrado, 0.3)
  assert.equal(m.gastado, 0.3)
  assert.equal(m.balance, 0)
})

test('contaMonth: pendientes = lo que te deben a fin de ese mes (saldado o le_debo no cuentan)', () => {
  const pufos = [
    PENDIENTE,
    pufo({ id: 20, amount: 300, dir: 'me_debe', settled: true, settledDate: '2026-10-09', project: 'yatekomo' }),
    pufo({ id: 21, amount: 70, dir: 'le_debo', project: 'yatekomo' }),
    pufo({ id: 22, amount: 999, dir: 'me_debe', date: '2026-11-02', project: 'yatekomo' }), // aún no existía en octubre
    pufo({ id: 23, amount: 150, dir: 'me_debe', date: '2026-08-15', project: 'yatekomo' }), // de agosto y sin cobrar: sigue debiéndose
  ]
  const m = contaMonth({ txs: [], pufos, month: '2026-10', filter: 'yatekomo' })
  assert.equal(m.pendiente, 650)
  assert.equal(m.pendientes.length, 2)
  assert.equal(m.balance, 0) // lo pendiente nunca mueve el balance
})

test('contaMonth: balanceAnio acumula de enero al fin de ese mes', () => {
  const txs = [
    tx({ id: 30, date: '2026-01-15', amount: 1000, type: 'income', project: 'yatekomo' }),
    tx({ id: 31, date: '2026-01-20', amount: 100, type: 'expense', project: 'yatekomo' }),
    COBRO,
    GASTO,
    tx({ id: 32, date: '2026-12-01', amount: 5000, type: 'income', project: 'yatekomo' }), // posterior: no acumula aún
  ]
  const m = contaMonth({ txs, pufos: [], month: '2026-10', filter: 'yatekomo' })
  assert.equal(m.balance, 899.5)
  assert.equal(m.balanceAnio, 1799.5)
})

test('contaMonth: listas ordenadas de lo más reciente a lo más antiguo', () => {
  const txs = [
    tx({ id: 40, date: '2026-10-01', amount: 100, type: 'income', concept: 'Primero', project: 'yatekomo' }),
    tx({ id: 41, date: '2026-10-20', amount: 200, type: 'income', concept: 'Último', project: 'yatekomo' }),
    tx({ id: 42, date: '2026-10-10', amount: 300, type: 'income', concept: 'Medio', project: 'yatekomo' }),
  ]
  const m = contaMonth({ txs, pufos: [], month: '2026-10', filter: 'yatekomo' })
  assert.deepEqual(m.cobros.map(c => c.concept), ['Último', 'Medio', 'Primero'])
})

test('contaYear: tabla proyecto × mes con totales de fila y de columna', () => {
  const txs = [
    COBRO, GASTO,
    tx({ id: 50, date: '2026-03-10', amount: 500, type: 'income', concept: 'Clocks marzo', project: 'clocks' }),
    tx({ id: 51, date: '2026-10-02', amount: 100, type: 'expense', concept: 'Gestoría', category: 'Servicios' }), // global → otros
    tx({ id: 52, date: '2025-10-02', amount: 777, type: 'income', concept: 'Año pasado', project: 'yatekomo' }),
  ]
  const y = contaYear({ txs, pufos: [], year: 2026 })
  assert.equal(y.year, 2026)
  // Solo proyectos con movimiento en el año, en el orden del catálogo (clocks antes de yatekomo, otros al final)
  assert.deepEqual(y.rows.map(r => r.project), ['clocks', 'yatekomo', 'otros'])
  for (const r of y.rows) assert.equal(r.months.length, 12)

  const yate = y.rows.find(r => r.project === 'yatekomo')
  assert.ok(yate)
  assert.equal(yate.months[9].cobrado, 1210) // índice 9 = octubre
  assert.equal(yate.months[9].gastado, 310.5)
  assert.equal(yate.months[9].balance, 899.5)
  assert.equal(yate.months[2].balance, 0) // marzo no es suyo
  assert.equal(yate.total.balance, 899.5) // el 777 de 2025 no se cuela

  const clocks = y.rows.find(r => r.project === 'clocks')
  assert.ok(clocks)
  assert.equal(clocks.months[2].cobrado, 500)
  assert.equal(clocks.total.cobrado, 500)

  const otros = y.rows.find(r => r.project === 'otros')
  assert.ok(otros)
  assert.equal(otros.total.gastado, 100)
  assert.equal(otros.total.balance, -100)

  // Columnas (totales por mes) y total del año
  assert.equal(y.totalByMonth.length, 12)
  assert.equal(y.totalByMonth[9].cobrado, 1210)
  assert.equal(y.totalByMonth[9].gastado, 410.5)
  assert.equal(y.totalByMonth[2].cobrado, 500)
  assert.equal(y.total.cobrado, 1710)
  assert.equal(y.total.gastado, 410.5)
  assert.equal(y.total.balance, 1299.5)
})

test('contaYear: con filtro de proyecto solo trae esa fila', () => {
  const txs = [COBRO, GASTO, tx({ id: 60, date: '2026-03-10', amount: 500, type: 'income', project: 'clocks' })]
  const y = contaYear({ txs, pufos: [], year: 2026, filter: 'yatekomo' })
  assert.deepEqual(y.rows.map(r => r.project), ['yatekomo'])
  assert.equal(y.total.balance, 899.5)
})

test('contaYear: un año sin movimientos no revienta', () => {
  const y = contaYear({ txs: [COBRO], pufos: [], year: 2024 })
  assert.deepEqual(y.rows, [])
  assert.equal(y.total.cobrado, 0)
  assert.equal(y.total.balance, 0)
  assert.equal(y.totalByMonth.length, 12)
})
