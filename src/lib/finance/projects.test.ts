// Tests de aceptación de F0 (Contabilidad por proyecto). Los escribe el arquitecto ANTES de
// la implementación: fijan el contrato de src/lib/finance/projects.ts. No se editan.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PROJECTS,
  OTHER_PROJECT,
  PROJECT_FILTER_ALL,
  isProjectId,
  projectLabel,
  resolveProjectId,
  matchesProjectFilter,
} from './projects.ts'

test('PROJECTS: los seis proyectos de Josema, en orden y con Otros al final', () => {
  assert.deepEqual(PROJECTS.map(p => p.id), ['anantara', 'clocks', 'asensio', 'elevencuts', 'yatekomo', 'otros'])
  assert.deepEqual(PROJECTS.map(p => p.label), ['Anantara', 'Clocks', 'Asensio', 'Elevencuts', 'Yatekomo', 'Otros'])
  assert.equal(OTHER_PROJECT, 'otros')
  assert.equal(PROJECTS[PROJECTS.length - 1].id, OTHER_PROJECT)
})

test('PROJECT_FILTER_ALL no colisiona con ningún id de proyecto', () => {
  assert.equal(PROJECT_FILTER_ALL, 'all')
  assert.ok(!PROJECTS.some(p => p.id === PROJECT_FILTER_ALL))
})

test('isProjectId: solo los ids del catálogo', () => {
  assert.equal(isProjectId('yatekomo'), true)
  assert.equal(isProjectId('otros'), true)
  assert.equal(isProjectId('Yatekomo'), false) // el id es siempre minúsculas; para texto suelto, resolveProjectId
  assert.equal(isProjectId('all'), false)
  assert.equal(isProjectId(''), false)
  assert.equal(isProjectId(undefined), false)
  assert.equal(isProjectId(null), false)
  assert.equal(isProjectId(7), false)
})

test('projectLabel: etiqueta legible; lo que no está marcado es Otros', () => {
  assert.equal(projectLabel('anantara'), 'Anantara')
  assert.equal(projectLabel('elevencuts'), 'Elevencuts')
  assert.equal(projectLabel('otros'), 'Otros')
  assert.equal(projectLabel(undefined), 'Otros')
  assert.equal(projectLabel(null), 'Otros')
  assert.equal(projectLabel(''), 'Otros')
  assert.equal(projectLabel('cliente-raro'), 'Otros')
})

test('resolveProjectId: normaliza lo que teclee o traiga un dato viejo', () => {
  assert.equal(resolveProjectId('yatekomo'), 'yatekomo')
  assert.equal(resolveProjectId('Yatekomo'), 'yatekomo')
  assert.equal(resolveProjectId('  ANANTARA  '), 'anantara')
  assert.equal(resolveProjectId('Clocks'), 'clocks')
  assert.equal(resolveProjectId('Anantará'), 'anantara') // sin acentos
  assert.equal(resolveProjectId('Eleven Cuts'), 'otros') // no inventamos coincidencias parciales
  assert.equal(resolveProjectId('otra cosa'), 'otros')
  assert.equal(resolveProjectId(undefined), 'otros')
  assert.equal(resolveProjectId(null), 'otros')
  assert.equal(resolveProjectId(''), 'otros')
})

test('matchesProjectFilter: Todos lo deja pasar todo', () => {
  for (const v of ['anantara', 'yatekomo', 'otros', '', undefined, null, 'basura']) {
    assert.equal(matchesProjectFilter(PROJECT_FILTER_ALL, v), true)
  }
})

test('matchesProjectFilter: un proyecto concreto solo deja pasar lo suyo', () => {
  assert.equal(matchesProjectFilter('yatekomo', 'yatekomo'), true)
  assert.equal(matchesProjectFilter('yatekomo', 'Yatekomo'), true) // normaliza el dato guardado
  assert.equal(matchesProjectFilter('yatekomo', 'clocks'), false)
  assert.equal(matchesProjectFilter('yatekomo', undefined), false)
  assert.equal(matchesProjectFilter('yatekomo', ''), false)
})

test('matchesProjectFilter: Otros recoge lo sin marcar y lo desconocido (gasto global)', () => {
  assert.equal(matchesProjectFilter('otros', 'otros'), true)
  assert.equal(matchesProjectFilter('otros', undefined), true)
  assert.equal(matchesProjectFilter('otros', null), true)
  assert.equal(matchesProjectFilter('otros', ''), true)
  assert.equal(matchesProjectFilter('otros', 'cliente-que-ya-no-existe'), true)
  assert.equal(matchesProjectFilter('otros', 'asensio'), false)
})
