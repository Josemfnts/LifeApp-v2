// Catálogo fijo de proyectos de Josema para Contabilidad por proyecto (F0).
// Importante: este fichero es solo de datos y normalización; no toca storage ni transacciones.

export type ProjectId = 'anantara' | 'clocks' | 'asensio' | 'elevencuts' | 'yatekomo' | 'otros'

export interface ProjectDef {
  id: ProjectId
  label: string
  color?: string
}

export const PROJECTS: readonly ProjectDef[] = [
  { id: 'anantara', label: 'Anantara', color: 'var(--color-acc-blue)' },
  { id: 'clocks', label: 'Clocks', color: 'var(--color-acc-gold)' },
  { id: 'asensio', label: 'Asensio', color: 'var(--color-acc-purple)' },
  { id: 'elevencuts', label: 'Elevencuts', color: 'var(--color-acc-orange)' },
  { id: 'yatekomo', label: 'Yatekomo', color: 'var(--color-acc-green)' },
  { id: 'otros', label: 'Otros' },
]

export const OTHER_PROJECT: ProjectId = 'otros'

export const PROJECT_FILTER_ALL = 'all' as const

export type ProjectFilter = ProjectId | typeof PROJECT_FILTER_ALL

const PROJECT_IDS: readonly ProjectId[] = PROJECTS.map(p => p.id)

const DIACRITICS = /\p{Diacritic}/gu

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .trim()
    .toLowerCase()
}

export function isProjectId(v: unknown): v is ProjectId {
  return typeof v === 'string' && (PROJECT_IDS as readonly string[]).includes(v)
}

export function projectLabel(v: string | null | undefined): string {
  if (typeof v === 'string' && v.length > 0) {
    const found = PROJECTS.find(p => p.id === v)
    if (found) return found.label
  }
  return OTHER_LABEL
}

export function resolveProjectId(v: string | null | undefined): ProjectId {
  if (typeof v !== 'string') return OTHER_PROJECT
  const normalized = normalize(v)
  if (normalized.length === 0) return OTHER_PROJECT
  return isProjectId(normalized) ? normalized : OTHER_PROJECT
}

export function matchesProjectFilter(filter: ProjectFilter, v: string | null | undefined): boolean {
  if (filter === PROJECT_FILTER_ALL) return true
  return resolveProjectId(v) === filter
}

const OTHER_LABEL = (PROJECTS.find(p => p.id === OTHER_PROJECT) as ProjectDef).label