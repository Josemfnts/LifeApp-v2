// Tests de aceptación de F6.1: la CONTABILIDAD tiene que conocer los proyectos que crea Josema.
// Los escribe el arquitecto. NO se editan.
//
// Por qué existe este fichero: al hacer vivo el catálogo (F6) `conta.ts` se quedó iterando la
// constante de los seis de siempre, así que un movimiento de un proyecto nuevo resolvía a un id
// que no estaba en la rejilla (`monthByProject[pid]` undefined) y la pestaña Conta petaba.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_PROJECTS, addProject, setProjectArchived, setProjectCatalog } from './projects.ts'
import { contaMonth, contaYear } from './conta.ts'

const CON_NUEVO = addProject(DEFAULT_PROJECTS, 'Bobinadora').projects

const txs = [
  { id: 1, date: '2026-10-05', type: 'income' as const, amount: 500, category: 'Freelance', concept: 'Factura', project: 'bobinadora' },
  { id: 2, date: '2026-10-07', type: 'expense' as const, amount: 100, category: 'Suministros', concept: 'Filamento', project: '3d' },
  { id: 3, date: '2026-10-09', type: 'income' as const, amount: 70, category: 'Freelance', concept: 'Venta', project: 'fantasma' },
]
const pufos = [
  { id: 1, amount: 200, dir: 'me_debe' as const, settled: false, date: '2026-10-01', concept: 'Factura', project: 'bobinadora' },
]

test('un proyecto creado por Josema sale en la tabla del año con su dinero', () => {
  setProjectCatalog(CON_NUEVO)
  const r = contaYear({ txs, pufos, year: 2026, filter: 'all' })
  const bobinadora = r.rows.find(row => row.project === 'bobinadora')
  assert.ok(bobinadora, 'la fila del proyecto nuevo no está en la tabla del año')
  assert.equal(bobinadora.label, 'Bobinadora')
  assert.equal(bobinadora.total.cobrado, 500)
  assert.equal(bobinadora.total.pendiente, 200)
})

test('el 3D de la semilla también cuenta (antes no estaba en la rejilla)', () => {
  setProjectCatalog(CON_NUEVO)
  const r = contaYear({ txs, pufos, year: 2026, filter: 'all' })
  const tresD = r.rows.find(row => row.project === '3d')
  assert.ok(tresD, 'la fila de 3D no está en la tabla del año')
  assert.equal(tresD.label, '3D')
  assert.equal(tresD.total.gastado, 100)
})

test('no se pierde ni un euro: el total del año suma todo lo marcado y lo desconocido', () => {
  setProjectCatalog(CON_NUEVO)
  const r = contaYear({ txs, pufos, year: 2026, filter: 'all' })
  assert.equal(r.total.cobrado, 570)   // 500 bobinadora + 70 del proyecto que ya no existe
  assert.equal(r.total.gastado, 100)   // 3D
  assert.equal(r.total.pendiente, 200)
  // Lo que apunta a un proyecto inexistente cae en el cajón, no al limbo:
  const otros = r.rows.find(row => row.project === 'otros')
  assert.ok(otros)
  assert.equal(otros.total.cobrado, 70)
})

test('filtrar por un proyecto creado a mano devuelve solo lo suyo', () => {
  setProjectCatalog(CON_NUEVO)
  const mes = contaMonth({ txs, pufos, month: '2026-10', filter: 'bobinadora' })
  assert.equal(mes.cobrado, 500)
  assert.equal(mes.gastado, 0)
  assert.equal(mes.pendiente, 200)
})

test('un proyecto archivado con histórico sigue saliendo en la tabla del año', () => {
  setProjectCatalog(setProjectArchived(CON_NUEVO, 'bobinadora', true).projects)
  const r = contaYear({ txs, pufos, year: 2026, filter: 'all' })
  const bobinadora = r.rows.find(row => row.project === 'bobinadora')
  assert.ok(bobinadora, 'archivar un proyecto no puede esconder lo que ya cobraste')
  assert.equal(bobinadora.total.cobrado, 500)
})
