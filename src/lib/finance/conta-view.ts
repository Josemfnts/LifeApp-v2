// F2: modelo de vista para la pestaña Conta de Finanzas. Lo único que se puede probar de una
// pantalla con la suite node:test nativa (sin DOM) es el modelo que pinta; este fichero es ese
// modelo. ContabilidadTab.tsx debe limitarse a pintar lo que devuelven contaMonthView/contaYearView.
//
// Reglas (no se negocian):
//  - imports relativos con extensión .ts, import type para tipos, sin @/, sin enums.
//  - dinero: NUNCA formateado. El modelo devuelve números; la UI pasa por fmt del store.
//  - los nombres de mes se duplican aquí (components/finanzas/plan/labels.ts los tiene pero
//    importa @/stores/financeStore, que no se puede cargar desde un test puro).
//  - el motor de cifras está en ./conta.ts; aquí no se vuelve a sumar dinero a mano.
//  - lo pendiente NUNCA entra en el balance (decisión F1). La tabla anual no muestra pendientes
//    y un proyecto que en el año solo tiene pendientes no genera fila (la tabla es de cobros
//    y gastos).

import { addMonthsISO, monthKeyOf } from './dates.ts'
import { contaMonth, contaYear } from './conta.ts'
import { OTHER_PROJECT, type ProjectFilter, type ProjectId, projectLabel } from './projects.ts'
import type { Pufo, Tx } from './types.ts'

// Meses en español, en minúscula. monthKeyLabel los escribe así, tal cual; si la cabecera de la
// UI los quiere con mayúscula, lo hace con CSS.
const MONTH_LABELS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const

const MONTH_SHORT_LABELS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
] as const

function parseMonthKey(monthKey: string): { y: number; m: number } | null {
  const re = /^(\d{4})-(\d{2})$/.exec(monthKey)
  if (!re) return null
  return { y: Number(re[1]), m: Number(re[2]) }
}

// Suma n meses (n puede ser negativo) a un monthKey cruzando el año por los dos lados.
export function shiftMonthKey(monthKey: string, n: number): string {
  const parsed = parseMonthKey(monthKey)
  if (!parsed) return monthKey
  // addMonthsISO espera día fijo: usamos el día 1, que existe en todos los meses.
  const shifted = addMonthsISO(`${monthKey}-01`, n)
  return shifted.slice(0, 7)
}

// '2026-10' → 'octubre 2026' (minúscula).
export function monthKeyLabel(monthKey: string): string {
  const parsed = parseMonthKey(monthKey)
  if (!parsed) return monthKey
  return `${MONTH_LABELS[parsed.m - 1]} ${parsed.y}`
}

export function monthShortLabels(): string[] {
  return [...MONTH_SHORT_LABELS]
}

export type StatTone = 'pos' | 'neg' | 'neu'

export interface ContaMonthStat {
  key: 'cobrado' | 'gastado' | 'balance'
  label: string
  value: number
  tone: StatTone
}

export interface ContaMonthRow {
  id: number | undefined
  date: string
  dateLabel: string
  concept: string
  amount: number
  project: ProjectId
  projectLabel: string
}

export type ContaMonthBlockKey = 'cobros' | 'gastos' | 'pendientes'

export interface ContaMonthBlock {
  key: ContaMonthBlockKey
  title: string
  empty: boolean
  emptyMessage: string
  total: number
  rows: ContaMonthRow[]
}

export interface ContaMonthView {
  month: string
  filter: ProjectFilter
  nav: {
    label: string
    prev: string | null
    next: string | null
  }
  stats: ContaMonthStat[]
  balanceAnio: number
  pendiente: number
  blocks: ContaMonthBlock[]
  empty: boolean
}

export type ContaYearCellTone = StatTone

export interface ContaYearCell {
  monthKey: string
  cobrado: number
  gastado: number
  balance: number
  empty: boolean
}

export interface ContaYearRow {
  project: ProjectId
  label: string
  months: ContaYearCell[]
  total: { cobrado: number; gastado: number; balance: number }
}

export interface ContaYearView {
  year: number
  filter: ProjectFilter
  empty: boolean
  emptyMessage: string
  monthLabels: string[]
  rows: ContaYearRow[]
  totalByMonth: { monthKey: string; cobrado: number; gastado: number; balance: number }[]
  total: { cobrado: number; gastado: number; balance: number }
}

function monthShortOf(monthKey: string): string {
  const parsed = parseMonthKey(monthKey)
  if (!parsed) return ''
  return MONTH_SHORT_LABELS[parsed.m - 1]
}

function shortDayLabel(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  const day = Number(m[3])
  const short = monthShortOf(`${m[1]}-${m[2]}`)
  return `${day} ${short}`
}

function toneFor(value: number): StatTone {
  if (value > 0) return 'pos'
  if (value < 0) return 'neg'
  return 'neu'
}

function emptyMessagesForMonth(pendienteOnly: boolean): {
  cobros: string
  gastos: string
  pendientes: string
} {
  if (pendienteOnly) {
    return {
      cobros: 'Sin cobros este mes.',
      gastos: 'Sin gastos este mes.',
      pendientes: 'Nada pendiente.',
    }
  }
  return {
    cobros: 'Sin cobros este mes.',
    gastos: 'Sin gastos este mes.',
    pendientes: 'Nada pendiente este mes.',
  }
}

function yearEmptyMessage(): string {
  return 'Sin movimientos este año.'
}

function rowFromContaItem(
  item: { id: number | undefined; date: string; concept: string; amount: number; project: ProjectId },
  showProject: boolean,
): ContaMonthRow {
  const project = item.project ?? OTHER_PROJECT
  return {
    id: item.id,
    date: item.date,
    dateLabel: shortDayLabel(item.date),
    concept: item.concept && item.concept.trim() !== '' ? item.concept : 'Sin concepto',
    amount: item.amount,
    project,
    projectLabel: showProject ? projectLabel(project) : '',
  }
}

export function contaMonthView(params: {
  txs: readonly Tx[]
  pufos: readonly Pufo[]
  month: string
  filter: ProjectFilter
  today: string // 'YYYY-MM-DD' para no viajar al futuro
}): ContaMonthView {
  const { txs, pufos, month, filter, today } = params

  const result = contaMonth({ txs, pufos, month, filter })

  const todayKey = monthKeyOf(today)
  const nextKey = shiftMonthKey(month, 1)
  const nav = {
    label: monthKeyLabel(month),
    prev: shiftMonthKey(month, -1),
    next: nextKey > todayKey ? null : nextKey,
  }

  // 'gastado' es siempre tone 'neg': es un egreso, no depende de la cifra. El 'balance' va por valor.
  const stats: ContaMonthStat[] = [
    { key: 'cobrado', label: 'Cobrado', value: result.cobrado, tone: toneFor(result.cobrado) },
    { key: 'gastado', label: 'Gastos', value: result.gastado, tone: 'neg' },
    { key: 'balance', label: 'Balance', value: result.balance, tone: toneFor(result.balance) },
  ]

  const showProject = true
  const messages = emptyMessagesForMonth(result.cobrado === 0 && result.gastado === 0 && result.pendiente > 0)

  const blocks: ContaMonthBlock[] = [
    {
      key: 'cobros',
      title: 'Cobros',
      empty: result.cobros.length === 0,
      emptyMessage: messages.cobros,
      total: result.cobrado,
      rows: result.cobros.map(i => rowFromContaItem(i, showProject)),
    },
    {
      key: 'gastos',
      title: 'Gastos',
      empty: result.gastos.length === 0,
      emptyMessage: messages.gastos,
      total: result.gastado,
      rows: result.gastos.map(i => rowFromContaItem(i, showProject)),
    },
    {
      key: 'pendientes',
      title: 'Te deben',
      empty: result.pendientes.length === 0,
      emptyMessage: messages.pendientes,
      total: result.pendiente,
      rows: result.pendientes.map(i => rowFromContaItem(i, showProject)),
    },
  ]

  const empty = result.cobrado === 0 && result.gastado === 0 && result.pendiente === 0

  return {
    month,
    filter,
    nav,
    stats,
    balanceAnio: result.balanceAnio,
    pendiente: result.pendiente,
    blocks,
    empty,
  }
}

// La tabla del año es de cobros y gastos: una celda está vacía si el mes no tiene ni cobros
// ni gastos, con independencia del filtro o de si hay pendientes. El bloque "Te deben" se
// ve solo en la vista Mes.
function cellFromYearMonth(m: { month: string; cobrado: number; gastado: number; balance: number }): ContaYearCell {
  return {
    monthKey: m.month,
    cobrado: m.cobrado,
    gastado: m.gastado,
    balance: m.balance,
    empty: m.cobrado === 0 && m.gastado === 0,
  }
}

export function contaYearView(params: {
  txs: readonly Tx[]
  pufos: readonly Pufo[]
  year: number
  filter?: ProjectFilter
}): ContaYearView {
  const { txs, pufos, year } = params
  const filter: ProjectFilter = params.filter ?? 'all'
  const result = contaYear({ txs, pufos, year, filter })

  // La tabla es de cobros y gastos. Un proyecto que en el año solo tiene pendientes no genera
  // fila (decisión F2: lo pendiente se ve una sola vez, en la vista Mes).
  const rows: ContaYearRow[] = result.rows
    .filter(r => !(r.total.cobrado === 0 && r.total.gastado === 0))
    .map(r => {
      const months: ContaYearCell[] = r.months.map(cellFromYearMonth)
      return {
        project: r.project,
        label: r.label,
        months,
        total: {
          cobrado: r.total.cobrado,
          gastado: r.total.gastado,
          balance: r.total.balance,
        },
      }
    })

  const totalByMonth = result.totalByMonth.map(m => ({
    monthKey: m.month,
    cobrado: m.cobrado,
    gastado: m.gastado,
    balance: m.balance,
  }))

  const empty = rows.length === 0

  return {
    year,
    filter,
    empty,
    emptyMessage: yearEmptyMessage(),
    monthLabels: monthShortLabels(),
    rows,
    totalByMonth,
    total: {
      cobrado: result.total.cobrado,
      gastado: result.total.gastado,
      balance: result.total.balance,
    },
  }
}

