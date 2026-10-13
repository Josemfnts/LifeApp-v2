// Tests de aceptación de F6 (proyectos que crea Josema, no un catálogo fijo en el código).
// Los escribe el ARQUITECTO antes de la implementación: fijan el contrato de
// src/lib/finance/projects.ts cuando el catálogo pasa a ser un dato del usuario.
// NO se editan: si algo aquí parece imposible o contradictorio, se lee y se pregunta.
//
// Reglas de oro que estos tests protegen:
//  1. El id de un proyecto NO cambia nunca (los movimientos ya guardados lo llevan dentro).
//  2. 'otros' es el cajón: siempre existe, siempre al final, no se renombra ni se archiva.
//  3. Archivar ≠ borrar: un proyecto archivado desaparece del selector pero su histórico
//     sigue siendo legible y sigue sumando en su propia fila.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_PROJECTS,
  OTHER_PROJECT,
  PROJECT_FILTER_ALL,
  activeProjects,
  addProject,
  getProjectCatalog,
  isProjectId,
  matchesProjectFilter,
  projectLabel,
  projectSlug,
  renameProject,
  resolveProjectId,
  setProjectArchived,
  setProjectCatalog,
  type ProjectDef,
} from './projects.ts'

// Cada test parte del catálogo de fábrica: el catálogo activo es estado del módulo
// (lo inyecta el store al cargar) y un test no puede ensuciar al siguiente.
function fresh(): ProjectDef[] {
  setProjectCatalog(DEFAULT_PROJECTS)
  return DEFAULT_PROJECTS.map(p => ({ ...p }))
}

test('DEFAULT_PROJECTS: los cinco clientes + 3D, con Otros al final', () => {
  assert.deepEqual(DEFAULT_PROJECTS.map(p => p.id),
    ['anantara', 'clocks', 'asensio', 'elevencuts', 'yatekomo', '3d', 'otros'])
  assert.deepEqual(DEFAULT_PROJECTS.map(p => p.label),
    ['Anantara', 'Clocks', 'Asensio', 'Elevencuts', 'Yatekomo', '3D', 'Otros'])
  assert.equal(DEFAULT_PROJECTS[DEFAULT_PROJECTS.length - 1].id, OTHER_PROJECT)
  // Ningún color inventado: si lleva color, es un token de la paleta.
  for (const p of DEFAULT_PROJECTS) {
    if (p.color !== undefined) assert.match(p.color, /^var\(--color-acc-[a-z]+\)$/)
  }
  // Ninguno nace archivado.
  assert.ok(!DEFAULT_PROJECTS.some(p => p.archived))
})

test('sin catálogo cargado se usa el de fábrica (la app puede pintar antes de que cargue el store)', () => {
  setProjectCatalog([])
  assert.deepEqual(getProjectCatalog().map(p => p.id), DEFAULT_PROJECTS.map(p => p.id))
  assert.equal(projectLabel('clocks'), 'Clocks')
})

test('projectSlug: id estable a partir del nombre, sin acentos ni símbolos', () => {
  assert.equal(projectSlug('FloodStudio 3D'), 'floodstudio-3d')
  assert.equal(projectSlug('  Clocks   School '), 'clocks-school')
  assert.equal(projectSlug('Añoranza'), 'anoranza')
  assert.equal(projectSlug('Café & Más'), 'cafe-mas')
  assert.equal(projectSlug('3D'), '3d')
  // Un nombre sin ninguna letra ni número no da id: addProject lo rechaza.
  assert.equal(projectSlug('€$%'), '')
  assert.equal(projectSlug('   '), '')
})

test('addProject: alta de un proyecto nuevo, siempre ANTES del cajón Otros', () => {
  const list = fresh()
  const r = addProject(list, 'Bobinadora')
  assert.equal(r.error, undefined)
  assert.equal(r.project?.id, 'bobinadora')
  assert.equal(r.project?.label, 'Bobinadora')
  assert.deepEqual(r.projects.map(p => p.id),
    ['anantara', 'clocks', 'asensio', 'elevencuts', 'yatekomo', '3d', 'bobinadora', 'otros'])
  // La lista de entrada no se muta (el store decide cuándo guardar).
  assert.equal(list.length, DEFAULT_PROJECTS.length)
})

test('addProject: no se duplica un proyecto que ya existe, ni cambiando mayúsculas o espacios', () => {
  const list = fresh()
  for (const label of ['clocks', '  CLOCKS ', 'Clocks']) {
    const r = addProject(list, label)
    assert.ok(r.error, `"${label}" tendría que rechazarse`)
    assert.deepEqual(r.projects.map(p => p.id), list.map(p => p.id))
  }
})

test('addProject: dos nombres distintos que darían el mismo id también choca', () => {
  const list = fresh()
  const r = addProject(list, '¡Clocks!')
  assert.ok(r.error) // el slug sería 'clocks', que ya está pillado
  assert.deepEqual(r.projects.map(p => p.id), list.map(p => p.id))
})

test('addProject: un nombre vacío o solo de símbolos se rechaza con error, no crea un proyecto sin nombre', () => {
  const list = fresh()
  for (const label of ['', '   ', '€$%']) {
    const r = addProject(list, label)
    assert.ok(r.error, `"${label}" tendría que rechazarse`)
    assert.equal(r.projects.length, list.length)
  }
})

test('addProject: el cajón Otros no se puede volver a crear', () => {
  const list = fresh()
  const r = addProject(list, 'Otros')
  assert.ok(r.error)
  assert.equal(r.projects.filter(p => p.id === OTHER_PROJECT).length, 1)
})

test('renameProject: cambia la etiqueta y NO el id (los movimientos guardados no se quedan huérfanos)', () => {
  const list = fresh()
  const r = renameProject(list, 'clocks', 'Clocks Barber')
  assert.equal(r.error, undefined)
  const clocks = r.projects.find(p => p.id === 'clocks')
  assert.equal(clocks?.label, 'Clocks Barber')
  assert.deepEqual(r.projects.map(p => p.id), list.map(p => p.id)) // mismo orden, mismos ids
  // Y con el catálogo renombrado cargado, un movimiento viejo sigue resolviendo:
  setProjectCatalog(r.projects)
  assert.equal(resolveProjectId('clocks'), 'clocks')
  assert.equal(projectLabel('clocks'), 'Clocks Barber')
})

test('renameProject: no se pisa el nombre de otro proyecto, ni se toca Otros', () => {
  const list = fresh()
  const choca = renameProject(list, 'clocks', 'Asensio')
  assert.ok(choca.error)
  assert.deepEqual(choca.projects.map(p => p.label), list.map(p => p.label))

  const cajon = renameProject(list, OTHER_PROJECT, 'Varios')
  assert.ok(cajon.error)
  assert.equal(cajon.projects.find(p => p.id === OTHER_PROJECT)?.label, 'Otros')

  const fantasma = renameProject(list, 'no-existe', 'Lo que sea')
  assert.ok(fantasma.error)
})

test('archivar: fuera del selector, pero el histórico sigue siendo suyo y legible', () => {
  const list = fresh()
  const r = setProjectArchived(list, 'yatekomo', true)
  assert.equal(r.error, undefined)
  setProjectCatalog(r.projects)

  assert.ok(!activeProjects().some(p => p.id === 'yatekomo'))   // no se ofrece para apuntar
  assert.equal(projectLabel('yatekomo'), 'Yatekomo')            // lo cobrado sigue teniendo nombre
  assert.equal(resolveProjectId('yatekomo'), 'yatekomo')        // NO cae en Otros
  assert.equal(matchesProjectFilter('yatekomo', 'yatekomo'), true)
  assert.equal(isProjectId('yatekomo'), true)

  // Y se puede desarchivar: vuelve a su sitio de siempre, no al final.
  const vuelta = setProjectArchived(r.projects, 'yatekomo', false)
  assert.equal(vuelta.error, undefined)
  assert.deepEqual(vuelta.projects.map(p => p.id), DEFAULT_PROJECTS.map(p => p.id))
})

test('archivar: el cajón Otros no se archiva nunca (es donde cae lo sin marcar)', () => {
  const list = fresh()
  const r = setProjectArchived(list, OTHER_PROJECT, true)
  assert.ok(r.error)
  setProjectCatalog(r.projects)
  assert.ok(activeProjects().some(p => p.id === OTHER_PROJECT))
})

test('activeProjects: sin archivados, en el orden del catálogo y con Otros al final', () => {
  const conNuevo = addProject(fresh(), 'Bobinadora').projects
  const conArchivado = setProjectArchived(conNuevo, 'asensio', true).projects
  setProjectCatalog(conArchivado)
  assert.deepEqual(activeProjects().map(p => p.id),
    ['anantara', 'clocks', 'elevencuts', 'yatekomo', '3d', 'bobinadora', 'otros'])
})

test('lo que no está marcado, o apunta a un proyecto que ya no existe, es Otros', () => {
  fresh()
  assert.equal(resolveProjectId(undefined), OTHER_PROJECT)
  assert.equal(resolveProjectId(null), OTHER_PROJECT)
  assert.equal(resolveProjectId(''), OTHER_PROJECT)
  assert.equal(resolveProjectId('borrado-hace-un-ano'), OTHER_PROJECT)
  assert.equal(projectLabel('borrado-hace-un-ano'), 'Otros')
  assert.equal(matchesProjectFilter(OTHER_PROJECT, undefined), true)
  assert.equal(matchesProjectFilter(OTHER_PROJECT, 'borrado-hace-un-ano'), true)
  // Texto suelto con mayúsculas/acentos sigue resolviendo al id (lo usa CompAI y el importador).
  assert.equal(resolveProjectId('  CLOCKS '), 'clocks')
  assert.equal(resolveProjectId('3D'), '3d')
})

test('el filtro "todos" sigue sin poder colisionar con un proyecto creado a mano', () => {
  assert.equal(PROJECT_FILTER_ALL, 'all')
  const r = addProject(fresh(), 'All')
  // 'all' está reservado: o se rechaza, o el id no es 'all'. Lo que no puede es quedar en 'all'.
  if (!r.error) assert.notEqual(r.project?.id, PROJECT_FILTER_ALL)
  setProjectCatalog(r.projects)
  assert.equal(matchesProjectFilter(PROJECT_FILTER_ALL, 'cualquier-cosa'), true)
})

test('un proyecto creado a mano se comporta igual que uno de fábrica', () => {
  const r = addProject(fresh(), '3D Studio')
  setProjectCatalog(r.projects)
  assert.equal(isProjectId('3d-studio'), true)
  assert.equal(projectLabel('3d-studio'), '3D Studio')
  assert.equal(resolveProjectId('  3D Studio '), '3d-studio')
  assert.equal(matchesProjectFilter('3d-studio', '3d-studio'), true)
  assert.equal(matchesProjectFilter('3d', '3d-studio'), false) // '3d' y '3d-studio' son distintos
})
