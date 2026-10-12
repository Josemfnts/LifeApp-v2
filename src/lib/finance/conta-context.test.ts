// Tests de aceptación de F5 (Contabilidad por proyecto: el cierre).
// Los escribe el arquitecto ANTES de la implementación: fijan el contrato del bloque `projects`
// de `finances_context`, el resumen que la app deja para CompAI / el Agente personal.
// No se editan.
//
// EN ROJO A PROPÓSITO hasta que `buildFinanceContext` devuelva `projects`. La fase está descrita
// en docs/relevos/contabilidad-fases.md (§F5). No "arregles" este fichero borrándolo.
//
// Qué se está cerrando: el asistente no recibe la base de datos, sino ~1-3 KB precalculados
// (context.ts). Hoy ese resumen no sabe NADA de proyectos: puede decir cuánto entró el mes pero
// no quién paga. F5 añade una línea por proyecto con movimiento en el año en curso.
//
// Decisión de diseño que fijan estos tests: el bloque NO es un motor nuevo. Es una proyección de
// `contaYear({ filter: 'all' })` — mismas cifras, mismo vocabulario (cobrado/gastado/pendiente/
// balance) y mismo orden (el del catálogo PROJECTS). Dos motores que suman lo mismo acabarían
// discrepando.
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildFinanceContext, type FinanceState } from './context.ts'
import { contaYear } from './conta.ts'
import type { Tx } from './types.ts'

const tx = (date: string, amount: number, extra: Partial<Tx> = {}): Tx =>
  ({ date, amount, type: 'expense', category: 'Otros gastos', concept: 'x', note: '', ...extra })

// El escenario de referencia de la ficha, con los bordes que importan: otro año, un traspaso
// (no es flujo), un pendiente ya cobrado y un "yo debo" (que no es un cobro).
function state(): FinanceState {
  return {
    txs: [
      tx('2026-10-05', 1210, { type: 'income', category: 'Freelance', project: 'yatekomo' }),
      tx('2026-10-07', 310.5, { project: 'yatekomo' }),
      tx('2026-03-20', 900, { type: 'income', category: 'Freelance', project: 'clocks' }),
      tx('2026-10-09', 500, { type: 'income', kind: 'transfer', category: 'Traspaso', project: 'clocks' }),
      tx('2026-09-09', 100), // sin proyecto: cae en "Otros"
      tx('2025-12-31', 5000, { type: 'income', category: 'Freelance', project: 'anantara' }),
    ],
    cuentas: [{ name: 'Banco', type: 'bank', balance: 3000, color: '', note: '', updatedAt: '' }],
    holdings: [],
    priceCache: {},
    debts: [],
    properties: [],
    presupuestos: [],
    recurrentes: [],
    pufos: [
      { id: 1, who: 'Yatekomo', person: 'Yatekomo', amount: 500, dir: 'me_debe', reason: '', concept: 'Factura', date: '2026-10-01', settled: false, project: 'yatekomo' },
      { id: 2, who: 'Asensio', person: 'Asensio', amount: 200, dir: 'me_debe', reason: '', concept: 'Factura', date: '2026-10-02', settled: true, settledDate: '2026-10-10', project: 'asensio' },
      { id: 3, who: 'Clocks', person: 'Clocks', amount: 50, dir: 'le_debo', reason: '', concept: 'Adelanto', date: '2026-10-03', settled: false, project: 'clocks' },
    ],
    snapshots: [],
  }
}

const HOY = '2026-10-15'

test('projects: una línea por proyecto con movimiento en el año, en el orden del catálogo', () => {
  const c = buildFinanceContext(state(), HOY)
  assert.deepEqual(c.projects, [
    { project: 'clocks', label: 'Clocks', cobrado: 900, gastado: 0, balance: 900, pendiente: 0 },
    { project: 'yatekomo', label: 'Yatekomo', cobrado: 1210, gastado: 310.5, balance: 899.5, pendiente: 500 },
    { project: 'otros', label: 'Otros', cobrado: 0, gastado: 100, balance: -100, pendiente: 0 },
  ])
})

test('projects: las cifras son exactamente las de contaYear (una sola fuente, no dos motores)', () => {
  const s = state()
  const c = buildFinanceContext(s, HOY)
  const rows = contaYear({ txs: s.txs, pufos: s.pufos, year: 2026, filter: 'all' }).rows
  assert.deepEqual(
    c.projects,
    rows.map(r => ({ project: r.project, label: r.label, ...r.total })),
  )
})

test('projects: un proyecto sin movimiento en el año no sale (ni con ceros)', () => {
  const c = buildFinanceContext(state(), HOY)
  const ids = c.projects.map(p => p.project)
  // Anantara solo tiene un cobro de 2025; Asensio, un pendiente ya cobrado; Elevencuts, nada.
  assert.equal(ids.includes('anantara'), false)
  assert.equal(ids.includes('asensio'), false)
  assert.equal(ids.includes('elevencuts'), false)
})

test('projects: lo que no es flujo no cuenta como cobro (un traspaso no es facturar)', () => {
  const c = buildFinanceContext(state(), HOY)
  const clocks = c.projects.find(p => p.project === 'clocks')
  assert.ok(clocks)
  assert.equal(clocks.cobrado, 900) // no 1400
})

test('projects: un pendiente ya cobrado no sigue contando, y lo que yo debo no es un pendiente', () => {
  const c = buildFinanceContext(state(), HOY)
  const clocks = c.projects.find(p => p.project === 'clocks')
  assert.ok(clocks)
  assert.equal(clocks.pendiente, 0) // los 50 € que YO debo a Clocks no son dinero por cobrar
  const yatekomo = c.projects.find(p => p.project === 'yatekomo')
  assert.ok(yatekomo)
  assert.equal(yatekomo.pendiente, 500) // solo el vivo; los 200 de Asensio están cobrados
})

test('projects: el año es el de la fecha del contexto, no el calendario del servidor', () => {
  const c = buildFinanceContext(state(), '2025-12-15')
  assert.deepEqual(c.projects, [
    { project: 'anantara', label: 'Anantara', cobrado: 5000, gastado: 0, balance: 5000, pendiente: 0 },
  ])
})

test('projects: añadirlo no cambia nada de lo que el asistente ya recibía', () => {
  const c = buildFinanceContext(state(), HOY)
  assert.deepEqual(c.month, { key: '2026-10', income: 1210, expense: 310.5, savingsRate: 74 })
  assert.deepEqual(c.receivables, { meDeben: 500, lesDebo: 50 })
  assert.equal(c.netWorth.breakdown.liquid, 3450) // 3000 + 500 que me deben − 50 que debo
})

// El contexto entero viaja a la nube y lo lee un modelo: el presupuesto es 4 KB. Con el año
// completo y los seis proyectos en marcha tiene que seguir cabiendo; si algún día no cabe, se
// recortan los proyectos sin movimiento, no se sube el límite.
test('projects: con el año lleno y los seis proyectos, el JSON sigue por debajo de 4 KB', () => {
  const s = state()
  const txs: Tx[] = []
  const projects = ['anantara', 'clocks', 'asensio', 'elevencuts', 'yatekomo', 'otros'] as const
  for (const p of projects) {
    for (let m = 1; m <= 12; m++) {
      const mes = String(m).padStart(2, '0')
      txs.push(tx(`2026-${mes}-05`, 1234.56, { type: 'income', category: 'Freelance', project: p }))
      txs.push(tx(`2026-${mes}-07`, 432.1, { category: 'Suministros', project: p }))
    }
  }
  const gordo: FinanceState = {
    ...s,
    txs,
    pufos: projects.map((p, i) => ({
      id: 100 + i, who: 'Cliente', person: 'Cliente', amount: 999.99, dir: 'me_debe' as const,
      reason: '', concept: 'Factura pendiente', date: '2026-10-01', settled: false, project: p,
    })),
    presupuestos: [{ category: 'Suministros', limit: 100 }],
  }
  const c = buildFinanceContext(gordo, HOY)
  assert.equal(c.projects.length, 6)
  assert.ok(JSON.stringify(c).length < 4096, `el contexto mide ${JSON.stringify(c).length} bytes`)
})
