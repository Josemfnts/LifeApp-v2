// Catálogo vivo de proyectos de Josema para Contabilidad por proyecto (F6).
// Antes era una constante en código; ahora Josema crea, renombra y archiva sus proyectos
// desde la pestaña Conta, y la lista vive en `finances_projects` (store). Este módulo sigue
// siendo PURO: solo datos y normalización; no toca storage ni transacciones. El catálogo
// activo lo inyecta el store al arrancar y cada vez que el espejo vivo recarga la clave.

export type ProjectId = string

export interface ProjectDef {
  id: ProjectId
  label: string
  color?: string
  archived?: boolean
}

// Semilla que muestra la app cuando el usuario no tiene nada guardado todavía.
// Orden = el que ve Josema en los selectores: los cinco clientes + 3D + Otros al final.
// Los colores son tokens de la paleta; un proyecto creado por el usuario puede no llevar color.
export const DEFAULT_PROJECTS: readonly ProjectDef[] = [
  { id: 'anantara', label: 'Anantara', color: 'var(--color-acc-blue)' },
  { id: 'clocks', label: 'Clocks', color: 'var(--color-acc-gold)' },
  { id: 'asensio', label: 'Asensio', color: 'var(--color-acc-purple)' },
  { id: 'elevencuts', label: 'Elevencuts', color: 'var(--color-acc-orange)' },
  { id: 'yatekomo', label: 'Yatekomo', color: 'var(--color-acc-green)' },
  { id: '3d', label: '3D' },
  { id: 'otros', label: 'Otros' },
]

export const OTHER_PROJECT: ProjectId = 'otros'

export const PROJECT_FILTER_ALL = 'all' as const

export type ProjectFilter = ProjectId | typeof PROJECT_FILTER_ALL

const DIACRITICS = /\p{Diacritic}/gu

// Estado del módulo: el catálogo activo que inyecta el store. Mientras nadie lo inyecte,
// la app puede pintar con la semilla (DEFAULT_PROJECTS) sin tocar storage.
let activeList: readonly ProjectDef[] = DEFAULT_PROJECTS

// Reemplaza el catálogo activo. Lista vacía = vuelve a la semilla (la app puede pintar
// antes de que el store termine de cargar sin que los selectores salgan vacíos).
export function setProjectCatalog(list: readonly ProjectDef[]): void {
  activeList = list.length > 0 ? list : DEFAULT_PROJECTS
}

export function getProjectCatalog(): readonly ProjectDef[] {
  return activeList
}

// Igual que getProjectCatalog pero sin archivados y con Otros siempre al final (los tests
// clavan ese orden). El archivo histórico de un archivado sigue consultable con
// `projectLabel` y `resolveProjectId`, que miran el catálogo entero.
export function activeProjects(): readonly ProjectDef[] {
  return selectActiveProjects(activeList)
}

// Variante pura que los componentes usan para derivar el selector del estado de Zustand:
// misma regla de orden (archivados fuera, Otros al final). Si el catálogo no tiene Otros
// (caso raro: alguien lo borró), se devuelve el resto tal cual.
export function selectActiveProjects(list: readonly ProjectDef[]): readonly ProjectDef[] {
  const withoutArchived = list.filter(p => !p.archived)
  const other = withoutArchived.find(p => p.id === OTHER_PROJECT)
  const rest = withoutArchived.filter(p => p.id !== OTHER_PROJECT)
  return other ? [...rest, other] : rest
}

// Slug estable a partir del nombre: NFD sin diacríticos, minúsculas, espacios y no-alfanum
// → '-', trim de '-'. Vacío si no hay letra ni número (los tests lo exigen).
export function projectSlug(label: string): ProjectId {
  const norm = label.normalize('NFD').replace(DIACRITICS, '').toLowerCase().trim()
  const slug = norm.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return slug
}

// Resultado de operar sobre el catálogo: lista nueva (no muta la entrada) y, si no es
// error, el proyecto creado/renombrado/archivado. El error es legible y va tal cual al toast.
export interface ProjectsResult {
  projects: ProjectDef[]
  project?: ProjectDef
  error?: string
}

function findById(list: readonly ProjectDef[], id: ProjectId): ProjectDef | undefined {
  return list.find(p => p.id === id)
}

function findBySlug(list: readonly ProjectDef[], slug: ProjectId): ProjectDef | undefined {
  return list.find(p => p.id === slug)
}

// Añade un proyecto nuevo antes del cajón Otros. Rechaza:
//  - slug vacío (nombre sin letras ni números)
//  - slug igual a otro id del catálogo (con o sin mayúsculas/acentos/símbolos)
//  - slug 'all' (reservado por el filtro)
//  - nombre 'Otros' (el cajón ya está)
export function addProject(list: readonly ProjectDef[], label: string, color?: string): ProjectsResult {
  const slug = projectSlug(label)
  if (slug.length === 0) return { projects: list.slice(), error: 'El proyecto necesita al menos una letra o un número' }
  if (slug === PROJECT_FILTER_ALL) return { projects: list.slice(), error: '"all" está reservado para el filtro' }
  if (findBySlug(list, slug)) return { projects: list.slice(), error: `Ya existe un proyecto con ese nombre (id "${slug}")` }

  const newProject: ProjectDef = { id: slug, label: label.trim() || label, ...(color ? { color } : {}) }
  const otherIdx = list.findIndex(p => p.id === OTHER_PROJECT)
  if (otherIdx < 0) {
    // Caso raro: el catálogo no tiene Otros. Lo añadimos al final.
    return { projects: [...list, newProject, { id: OTHER_PROJECT, label: 'Otros' }], project: newProject }
  }
  const projects = [...list.slice(0, otherIdx), newProject, ...list.slice(otherIdx)]
  return { projects, project: newProject }
}

// Cambia la etiqueta de un proyecto (el id NO cambia; los movimientos guardados lo llevan
// dentro). Rechaza id inexistente, renombrar el cajón Otros, slug resultante duplicado y
// slug 'all'.
export function renameProject(list: readonly ProjectDef[], id: ProjectId, label: string): ProjectsResult {
  const target = findById(list, id)
  if (!target) return { projects: list.slice(), error: `No existe el proyecto "${id}"` }
  if (id === OTHER_PROJECT) return { projects: list.slice(), error: 'El cajón "Otros" no se puede renombrar' }

  const slug = projectSlug(label)
  if (slug.length === 0) return { projects: list.slice(), error: 'El proyecto necesita al menos una letra o un número' }
  if (slug === PROJECT_FILTER_ALL) return { projects: list.slice(), error: '"all" está reservado para el filtro' }

  // ¿Choca con otro proyecto que ya existe?
  const clash = list.find(p => p.id === slug && p.id !== id)
  if (clash) return { projects: list.slice(), error: `Ya existe un proyecto con ese nombre (id "${slug}")` }

  // El slug del propio id puede no cambiar (renombrar a algo que produce el mismo slug):
  // entonces no hay colisión y se acepta. Eso pasa, p.ej., con '3D Studio' → '3d-studio'
  // y al volver a teclear '3d-studio' el slug no cambia.
  const next: ProjectDef = { ...target, label: label.trim() || label }
  const projects = list.map(p => (p.id === id ? next : p))
  return { projects, project: next }
}

// Archiva o desarchiva. Archivar ≠ borrar: el histórico sigue siendo legible (projectLabel
// y resolveProjectId lo siguen reconociendo) pero el proyecto sale del selector. El cajón
// Otros no se archiva nunca (es donde cae lo sin marcar).
export function setProjectArchived(list: readonly ProjectDef[], id: ProjectId, archived: boolean): ProjectsResult {
  if (id === OTHER_PROJECT) return { projects: list.slice(), error: 'El cajón "Otros" no se puede archivar' }
  const target = findById(list, id)
  if (!target) return { projects: list.slice(), error: `No existe el proyecto "${id}"` }
  // No-op: si ya está en el estado pedido, devolvemos la misma lista (sin mutar).
  if (!!target.archived === archived) return { projects: list.slice() }
  const next: ProjectDef = { ...target, archived: archived || undefined }
  const projects = list.map(p => (p.id === id ? next : p))
  return { projects, project: next }
}

// isProjectId: true si el id existe en el catálogo activo (incluyendo archivados: el
// histórico siempre debe poder resolver un id guardado).
export function isProjectId(v: unknown): v is ProjectId {
  return typeof v === 'string' && v.length > 0 && findById(activeList, v) !== undefined
}

// Variante: solo cuenta los activos (no archivados). Lo usa la UI para decidir si un
// proyecto guardado como preferencia sigue siendo seleccionable o hay que caer a 'Todos'.
export function isActiveProjectId(v: unknown): v is ProjectId {
  if (typeof v !== 'string' || v.length === 0) return false
  const p = findById(activeList, v)
  return !!p && !p.archived
}

// Etiqueta legible de un id; lo desconocido (incluso ids que el catálogo tuvo y ya no
// tiene) cae al label del cajón Otros.
export function projectLabel(v: string | null | undefined): string {
  if (typeof v === 'string' && v.length > 0) {
    const found = findById(activeList, v)
    if (found) return found.label
  }
  const other = findById(activeList, OTHER_PROJECT)
  return other?.label ?? 'Otros'
}

// Normaliza texto y resuelve al id del catálogo si existe. Si no, 'otros'. Así CompAI y
// el alta rápida pueden pasar mayúsculas, acentos o lo que traigan. Aplicamos el mismo
// slug que `projectSlug` para que '  3D Studio ' y '3d-studio' caigan al mismo id.
export function resolveProjectId(v: string | null | undefined): ProjectId {
  if (typeof v !== 'string') return OTHER_PROJECT
  const slug = projectSlug(v)
  if (slug.length === 0) return OTHER_PROJECT
  return findById(activeList, slug) ? slug : OTHER_PROJECT
}

// Filtro: 'all' deja pasar todo; un proyecto concreto solo lo suyo (normalizando); Otros
// recoge lo desconocido y lo sin marcar.
export function matchesProjectFilter(filter: ProjectFilter, v: string | null | undefined): boolean {
  if (filter === PROJECT_FILTER_ALL) return true
  return resolveProjectId(v) === filter
}