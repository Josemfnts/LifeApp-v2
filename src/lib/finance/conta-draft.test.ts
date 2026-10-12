// Tests de aceptación de F3 (Contabilidad por proyecto: registrar rápido).
// Los escribe el arquitecto ANTES de la implementación: fijan el contrato de
// src/lib/finance/conta-draft.ts. No se editan.
//
// EN ROJO A PROPÓSITO hasta que exista src/lib/finance/conta-draft.ts. La fase está descrita en
// docs/relevos/contabilidad-fases.md (§F3). No "arregles" este fichero borrándolo.
//
// Por qué un borrador aparte de la hoja: F3 ESCRIBE dinero (un Tx o un Pufo de verdad). La suite
// es node:test nativo sin DOM, así que lo que se prueba es el borrador y el apunte que sale de él;
// la hoja se limita a teclear encima del borrador y a mandar el resultado al store.
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildContaEntry, draftError, emptyDraft, nextDraft } from './conta-draft.ts'

const HOY = '2026-10-12'

// Un borrador listo para guardar: cobro de Yatekomo de 1.210,50 € al Banco.
function cobroListo() {
  return {
    ...emptyDraft({ kind: 'cobro' as const, project: 'yatekomo' as const, today: HOY }),
    amount: '1.210,50',
    concept: '  Factura octubre  ',
    cuenta: 'Banco',
  }
}

test('emptyDraft: nace con el proyecto activo, la fecha de hoy y los campos de teclear vacíos', () => {
  const d = emptyDraft({ kind: 'cobro', project: 'yatekomo', today: HOY })
  assert.equal(d.kind, 'cobro')
  assert.equal(d.project, 'yatekomo')
  assert.equal(d.date, HOY)
  assert.equal(d.amount, '')
  assert.equal(d.concept, '')
  // Con el filtro en "Todos" no hay proyecto: el borrador lo refleja y no se inventa "Otros".
  const sinProyecto = emptyDraft({ kind: 'gasto', project: null, today: HOY })
  assert.equal(sinProyecto.project, null)
})

test('draftError: sin proyecto no se guarda nada (el filtro Todos obliga a elegir)', () => {
  const d = { ...cobroListo(), project: null }
  assert.equal(draftError(d), 'Elige un proyecto')
  // El proyecto se pregunta ANTES del importe: es el error que se enseña primero.
  assert.equal(draftError({ ...d, amount: '' }), 'Elige un proyecto')
})

test('draftError: el importe tiene que ser un número mayor que cero', () => {
  const d = cobroListo()
  for (const amount of ['', '   ', '0', '0,00', 'abc', '-50']) {
    assert.equal(draftError({ ...d, amount }), 'Introduce un importe', `importe "${amount}"`)
  }
  assert.equal(draftError({ ...d, amount: '0,01' }), null)
})

test('draftError: un apunte sin concepto no entra (ni con espacios)', () => {
  const d = cobroListo()
  assert.equal(draftError({ ...d, concept: '   ' }), 'Introduce un concepto')
  assert.equal(draftError(d), null)
})

test('draftError: "Otros" elegido a mano es un proyecto válido', () => {
  assert.equal(draftError({ ...cobroListo(), project: 'otros' }), null)
})

test('buildContaEntry: un cobro es un ingreso normal de Finanzas, con su proyecto', () => {
  const entry = buildContaEntry(cobroListo())
  assert.ok(entry)
  assert.equal(entry.kind, 'tx')
  if (entry.kind !== 'tx') return
  // Exactamente estas claves: un movimiento de Conta es un movimiento corriente, sin extras.
  assert.deepEqual({ ...entry.tx }, {
    date: HOY,
    amount: 1210.5,
    type: 'income',
    category: 'Freelance',
    concept: 'Factura octubre',
    note: '',
    cuenta: 'Banco',
    project: 'yatekomo',
  })
})

test('buildContaEntry: el cobro NO lleva kind (si lo llevara, isFlow lo sacaría del balance)', () => {
  const entry = buildContaEntry(cobroListo())
  assert.ok(entry)
  if (entry.kind !== 'tx') return
  assert.equal('kind' in entry.tx, false)
  assert.equal('id' in entry.tx, false) // el id lo pone el store, no el borrador
  assert.equal('split' in entry.tx, false)
})

test('buildContaEntry: un gasto sale como expense y con su categoría por defecto', () => {
  const entry = buildContaEntry({ ...cobroListo(), kind: 'gasto', amount: '310,50', concept: 'Servidor' })
  assert.ok(entry)
  assert.equal(entry.kind, 'tx')
  if (entry.kind !== 'tx') return
  assert.equal(entry.tx.type, 'expense')
  assert.equal(entry.tx.amount, 310.5)
  assert.equal(entry.tx.category, 'Otros gastos')
  assert.equal(entry.tx.project, 'yatekomo')
})

test('buildContaEntry: la categoría que elija Josema manda sobre la de por defecto', () => {
  const entry = buildContaEntry({ ...cobroListo(), kind: 'gasto', category: 'Suscripciones' })
  assert.ok(entry)
  if (entry.kind !== 'tx') return
  assert.equal(entry.tx.category, 'Suscripciones')
})

test('buildContaEntry: un pendiente es un pufo "me debe" y NO mueve ninguna cuenta', () => {
  const entry = buildContaEntry({ ...cobroListo(), kind: 'pendiente', amount: '500', concept: 'Factura noviembre' })
  assert.ok(entry)
  assert.equal(entry.kind, 'pufo')
  if (entry.kind !== 'pufo') return
  const p = entry.pufo
  assert.equal(p.dir, 'me_debe')
  assert.equal(p.amount, 500)
  assert.equal(p.project, 'yatekomo')
  assert.equal(p.who, 'Yatekomo') // quien te debe es el proyecto, con su etiqueta
  assert.equal(p.person, 'Yatekomo')
  assert.equal(p.concept, 'Factura noviembre')
  assert.equal(p.reason, 'Factura noviembre')
  assert.equal(p.date, HOY)
  assert.equal(p.settled, false)
  assert.equal('id' in p, false) // el id lo pone quien guarda
  assert.equal('cuenta' in p, false) // un pendiente no toca saldos
  assert.equal('settledDate' in p, false)
})

test('buildContaEntry: el importe se lee en formato español y se queda en céntimos exactos', () => {
  const mil = buildContaEntry({ ...cobroListo(), amount: '1.210,50' })
  const centimo = buildContaEntry({ ...cobroListo(), amount: '0,99' })
  const entero = buildContaEntry({ ...cobroListo(), amount: '1210' })
  assert.ok(mil)
  assert.ok(centimo)
  assert.ok(entero)
  if (mil.kind !== 'tx' || centimo.kind !== 'tx' || entero.kind !== 'tx') return
  assert.equal(mil.tx.amount, 1210.5)
  assert.equal(centimo.tx.amount, 0.99)
  assert.equal(entero.tx.amount, 1210)
})

test('buildContaEntry: con un borrador inválido devuelve null (nada a medias llega al store)', () => {
  assert.equal(buildContaEntry({ ...cobroListo(), project: null }), null)
  assert.equal(buildContaEntry({ ...cobroListo(), amount: '' }), null)
  assert.equal(buildContaEntry({ ...cobroListo(), concept: ' ' }), null)
})

test('buildContaEntry: la fecha del borrador manda (un cobro se puede apuntar en otro mes)', () => {
  const entry = buildContaEntry({ ...cobroListo(), date: '2026-09-30' })
  assert.ok(entry)
  if (entry.kind !== 'tx') return
  assert.equal(entry.tx.date, '2026-09-30')
})

test('buildContaEntry: sin cuenta elegida el movimiento se guarda sin cuenta, no con una vacía', () => {
  const entry = buildContaEntry({ ...cobroListo(), cuenta: '' })
  assert.ok(entry)
  if (entry.kind !== 'tx') return
  assert.equal(entry.tx.cuenta, undefined)
})

test('nextDraft ("Guardar y añadir otro"): conserva el contexto y vacía lo que se teclea', () => {
  const d = { ...cobroListo(), date: '2026-10-05', category: 'Freelance' }
  const siguiente = nextDraft(d)
  assert.equal(siguiente.kind, 'cobro')
  assert.equal(siguiente.project, 'yatekomo')
  assert.equal(siguiente.date, '2026-10-05')
  assert.equal(siguiente.cuenta, 'Banco')
  assert.equal(siguiente.category, 'Freelance')
  assert.equal(siguiente.amount, '')
  assert.equal(siguiente.concept, '')
})
