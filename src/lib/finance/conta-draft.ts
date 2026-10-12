import type { ProjectId } from './projects.ts'
import type { Pufo, Tx } from './types.ts'
import { parseEuroInput, roundEuros } from './money.ts'
import { projectLabel } from './projects.ts'

// F3 de Contabilidad por proyecto: el borrador y el apunte que sale de él.
// La hoja (ContaAddSheet.tsx) solo teclea encima y manda el resultado al store.
// Contrato fijado por src/lib/finance/conta-draft.test.ts (intocable).

export type ContaKind = 'cobro' | 'pendiente' | 'gasto'

export interface ContaDraft {
  kind: ContaKind
  project: ProjectId | null
  date: string
  amount: string
  concept: string
  cuenta: string
  category: string
}

export type ContaEntry =
  | { kind: 'tx'; tx: Omit<Tx, 'id'> }
  | { kind: 'pufo'; pufo: Omit<Pufo, 'id'> }

// Categorías por defecto cuando el borrador deja category vacío. Duplicamos los
// literales que viven en QuickAddSheet.tsx: un fichero de src/lib/finance/** no
// puede importar componentes (la suite es node:test puro).
export function defaultCategory(kind: ContaKind): string {
  if (kind === 'cobro') return 'Freelance'
  return 'Otros gastos'
}

export function emptyDraft(args: {
  kind: ContaKind
  project: ProjectId | null
  today: string
}): ContaDraft {
  return {
    kind: args.kind,
    project: args.project,
    date: args.today,
    amount: '',
    concept: '',
    cuenta: '',
    category: '',
  }
}

// Validación en un solo sitio y en este orden: proyecto → importe → concepto.
export function draftError(draft: ContaDraft): string | null {
  if (!draft.project) return 'Elige un proyecto'
  const n = parseEuroInput(draft.amount)
  if (!(n > 0)) return 'Introduce un importe'
  if (!draft.concept.trim()) return 'Introduce un concepto'
  return null
}

export function buildContaEntry(draft: ContaDraft): ContaEntry | null {
  if (draftError(draft)) return null
  const trimmedConcept = draft.concept.trim()
  const amount = roundEuros(parseEuroInput(draft.amount))
  const project = draft.project as ProjectId
  const who = projectLabel(project)

  if (draft.kind === 'pendiente') {
    return {
      kind: 'pufo',
      pufo: {
        dir: 'me_debe',
        settled: false,
        who,
        person: who,
        amount,
        reason: trimmedConcept,
        concept: trimmedConcept,
        date: draft.date,
        project,
      },
    }
  }

  return {
    kind: 'tx',
    tx: {
      date: draft.date,
      amount,
      type: draft.kind === 'cobro' ? 'income' : 'expense',
      category: draft.category.trim() || defaultCategory(draft.kind),
      concept: trimmedConcept,
      note: '',
      cuenta: draft.cuenta.trim() || undefined,
      project,
    },
  }
}

// "Guardar y añadir otro": conserva el contexto, vacía lo que se teclea.
export function nextDraft(draft: ContaDraft): ContaDraft {
  return {
    kind: draft.kind,
    project: draft.project,
    date: draft.date,
    amount: '',
    concept: '',
    cuenta: draft.cuenta,
    category: draft.category,
  }
}