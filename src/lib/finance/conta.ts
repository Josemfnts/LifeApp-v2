import { isFlow } from './flow.ts'
import { flowAmount } from './split.ts'
import { addEuros, subEuros } from './money.ts'
import { monthKeyOf } from './dates.ts'
import { OTHER_PROJECT, getProjectCatalog, projectLabel, type ProjectFilter, type ProjectId, matchesProjectFilter, resolveProjectId } from './projects.ts'
import type { Pufo, Tx } from './types.ts'

type TxLike = Pick<Tx, 'id' | 'date' | 'amount' | 'type' | 'project' | 'kind' | 'split' | 'concept'>
type PufoLike = Pick<Pufo, 'id' | 'date' | 'amount' | 'dir' | 'settled' | 'project' | 'concept'>

export interface ContaItem {
  id: number | undefined
  date: string
  concept: string
  amount: number
  project: ProjectId
}

export interface ContaMonthResult {
  month: string
  filter: ProjectFilter
  cobrado: number
  gastado: number
  balance: number
  balanceAnio: number
  pendiente: number
  cobros: ContaItem[]
  gastos: ContaItem[]
  pendientes: ContaItem[]
}

// Primer día del mes SIGUIENTE a monthKey; sirve para "≤ fin de mes" como fecha < esteExclusive.
function endExclusiveMonth(monthKey: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey)
  if (!m) return monthKey
  const y = Number(m[1])
  const mo = Number(m[2])
  const nextY = mo === 12 ? y + 1 : y
  const nextM = mo === 12 ? 1 : mo + 1
  return `${nextY}-${String(nextM).padStart(2, '0')}-01`
}

function compareDateDesc<T extends { date: string; id?: number }>(a: T, b: T): number {
  if (a.date < b.date) return 1
  if (a.date > b.date) return -1
  return (b.id ?? 0) - (a.id ?? 0)
}

function inMonth(iso: string, monthKey: string): boolean {
  return monthKeyOf(iso) === monthKey
}

function beforeExclusive(iso: string, monthEndExclusive: string): boolean {
  return iso < monthEndExclusive
}

function matchesFilter(filter: ProjectFilter, project: ProjectId | string | null | undefined): boolean {
  return matchesProjectFilter(filter, project)
}

export function contaMonth(params: {
  txs: readonly TxLike[]
  pufos: readonly PufoLike[]
  month: string
  filter: ProjectFilter
}): ContaMonthResult {
  const { txs, pufos, month, filter } = params
  const monthEnd = endExclusiveMonth(month)

  const cobros: ContaItem[] = []
  const gastos: ContaItem[] = []
  let cobrado = 0
  let gastado = 0

  for (const t of txs) {
    if (!inMonth(t.date, month)) continue
    if (!isFlow(t)) continue
    if (!matchesFilter(filter, t.project)) continue
    const project = resolveProjectId(t.project)
    const amount = flowAmount(t)
    if (t.type === 'income') {
      cobrado = addEuros(cobrado, amount)
      cobros.push({ id: t.id, date: t.date, concept: t.concept ?? '', amount, project })
    } else {
      gastado = addEuros(gastado, amount)
      gastos.push({ id: t.id, date: t.date, concept: t.concept ?? '', amount, project })
    }
  }

  cobros.sort(compareDateDesc)
  gastos.sort(compareDateDesc)

  const balance = subEuros(cobrado, gastado)

  // balanceAnio: desde el 1 de enero del año del mes pedido, hasta el fin (exclusivo) del mes.
  const year = Number(month.slice(0, 4))
  const yearStart = `${year}-01-01`
  let balanceAnio = 0
  for (const t of txs) {
    if (t.date < yearStart) continue
    if (!beforeExclusive(t.date, monthEnd)) continue
    if (!isFlow(t)) continue
    if (!matchesFilter(filter, t.project)) continue
    const amount = flowAmount(t)
    balanceAnio = t.type === 'income' ? addEuros(balanceAnio, amount) : subEuros(balanceAnio, amount)
  }

  // Pendientes: me_debe activos con date ≤ fin de mes (fecha < primer día del mes siguiente).
  const pendientes: ContaItem[] = []
  let pendiente = 0
  for (const p of pufos) {
    if (p.dir !== 'me_debe') continue
    if (p.settled) continue
    if (!beforeExclusive(p.date, monthEnd)) continue
    if (!matchesFilter(filter, p.project)) continue
    const project = resolveProjectId(p.project)
    pendiente = addEuros(pendiente, p.amount)
    pendientes.push({ id: p.id, date: p.date, concept: p.concept ?? '', amount: p.amount, project })
  }
  pendientes.sort(compareDateDesc)

  return {
    month,
    filter,
    cobrado,
    gastado,
    balance,
    balanceAnio,
    pendiente,
    cobros,
    gastos,
    pendientes,
  }
}

export interface ContaYearMonth {
  month: string
  cobrado: number
  gastado: number
  balance: number
  pendiente: number
}

export interface ContaYearRow {
  project: ProjectId
  label: string
  months: ContaYearMonth[]
  total: { cobrado: number; gastado: number; balance: number; pendiente: number }
}

export interface ContaYearResult {
  year: number
  filter: ProjectFilter
  rows: ContaYearRow[]
  totalByMonth: ContaYearMonth[]
  total: { cobrado: number; gastado: number; balance: number; pendiente: number }
}

function emptyMonth(month: string): ContaYearMonth {
  return { month, cobrado: 0, gastado: 0, balance: 0, pendiente: 0 }
}

function addPending(month: ContaYearMonth, p: { amount: number }): ContaYearMonth {
  return { ...month, pendiente: addEuros(month.pendiente, p.amount) }
}

export function contaYear(params: {
  txs: readonly TxLike[]
  pufos: readonly PufoLike[]
  year: number
  filter?: ProjectFilter
}): ContaYearResult {
  const { txs, pufos, year, filter = 'all' } = params
  const yearStart = `${year}-01-01`
  const yearEndExclusive = `${year + 1}-01-01`
  const monthKeys: string[] = []
  for (let i = 0; i < 12; i++) monthKeys.push(`${year}-${String(i + 1).padStart(2, '0')}`)

  // Orden y rejilla: SALEN del catálogo vivo. Incluye archivados (un proyecto archivado con
  // histórico conserva su fila en la tabla del año, lo decide la ficha de F6.1). El catálogo
  // lo inyecta el store al arrancar; si nadie lo ha inyectado, contiene DEFAULT_PROJECTS.
  const order = getProjectCatalog().map(p => p.id)
  const monthByProject: Record<ProjectId, ContaYearMonth[]> = {} as Record<ProjectId, ContaYearMonth[]>
  for (const pid of order) monthByProject[pid] = monthKeys.map(emptyMonth)
  const touched = new Set<ProjectId>()

  // Crea la fila para un pid que no estaba en el catálogo (caso: un movimiento cuyo project
  // resuelve a un id que ya no está, o a 'otros' por si las flys). Sin esto, el `idx` siguiente
  // daba TypeError y la pestaña Conta se quedaba en blanco.
  function ensureRow(pid: ProjectId): ContaYearMonth[] {
    let row = monthByProject[pid]
    if (!row) {
      row = monthKeys.map(emptyMonth)
      monthByProject[pid] = row
    }
    return row
  }

  for (const t of txs) {
    if (t.date < yearStart) continue
    if (t.date >= yearEndExclusive) continue
    if (!isFlow(t)) continue
    const pid = resolveProjectId(t.project)
    if (!matchesFilter(filter, pid)) continue
    const idx = Number(monthKeyOf(t.date).slice(5, 7)) - 1
    const row = ensureRow(pid)
    const cur = row[idx]
    const amount = flowAmount(t)
    const incCobrado = addEuros(cur.cobrado, amount)
    const incGastado = addEuros(cur.gastado, amount)
    const next: ContaYearMonth = {
      month: cur.month,
      cobrado: t.type === 'income' ? incCobrado : cur.cobrado,
      gastado: t.type === 'expense' ? incGastado : cur.gastado,
      balance: 0,
      pendiente: cur.pendiente,
    }
    next.balance = subEuros(next.cobrado, next.gastado)
    row[idx] = next
    touched.add(pid)
  }

  for (const p of pufos) {
    if (p.dir !== 'me_debe') continue
    if (p.settled) continue
    if (p.date < yearStart) continue
    if (p.date >= yearEndExclusive) continue
    const pid = resolveProjectId(p.project)
    if (!matchesFilter(filter, pid)) continue
    const idx = Number(monthKeyOf(p.date).slice(5, 7)) - 1
    monthByProject[pid] = ensureRow(pid)
    monthByProject[pid][idx] = addPending(monthByProject[pid][idx], p)
    touched.add(pid)
  }

  // Las filas del año salen en el ORDEN del catálogo (archivados incluidos, su histórico se ve).
  // Si un pid quedó tocado sin estar en el catálogo (lo creó ensureRow), se cuelga al final:
  // son movimientos huérfanos cuyo `resolveProjectId` devolvió un id que ya no existe (caso
  // raro: alguien manipuló activeList a mano o un movimiento apunta a un slug borrado).
  // 'otros' ya está cubierto por su fila del catálogo, así que lo filtramos para no duplicar.
  const catalogIds = new Set(order)
  const rows: ContaYearRow[] = []
  for (const pid of order) {
    if (!touched.has(pid)) continue
    const months = monthByProject[pid]
    let cobrado = 0, gastado = 0, pendiente = 0
    for (const m of months) {
      cobrado = addEuros(cobrado, m.cobrado)
      gastado = addEuros(gastado, m.gastado)
      pendiente = addEuros(pendiente, m.pendiente)
    }
    rows.push({
      project: pid,
      label: projectLabel(pid),
      months,
      total: { cobrado, gastado, balance: subEuros(cobrado, gastado), pendiente },
    })
  }
  for (const pid of touched) {
    if (catalogIds.has(pid)) continue
    if (pid === OTHER_PROJECT) continue
    const months = monthByProject[pid]
    let cobrado = 0, gastado = 0, pendiente = 0
    for (const m of months) {
      cobrado = addEuros(cobrado, m.cobrado)
      gastado = addEuros(gastado, m.gastado)
      pendiente = addEuros(pendiente, m.pendiente)
    }
    rows.push({
      project: pid,
      label: projectLabel(pid),
      months,
      total: { cobrado, gastado, balance: subEuros(cobrado, gastado), pendiente },
    })
  }

  const totalByMonth: ContaYearMonth[] = monthKeys.map((mk, i) => {
    let cobrado = 0, gastado = 0, pendiente = 0
    for (const r of rows) {
      cobrado = addEuros(cobrado, r.months[i].cobrado)
      gastado = addEuros(gastado, r.months[i].gastado)
      pendiente = addEuros(pendiente, r.months[i].pendiente)
    }
    return { month: mk, cobrado, gastado, balance: subEuros(cobrado, gastado), pendiente }
  })

  const total = totalByMonth.reduce(
    (acc, m) => ({
      cobrado: addEuros(acc.cobrado, m.cobrado),
      gastado: addEuros(acc.gastado, m.gastado),
      balance: 0,
      pendiente: addEuros(acc.pendiente, m.pendiente),
    }),
    { cobrado: 0, gastado: 0, balance: 0, pendiente: 0 },
  )
  total.balance = subEuros(total.cobrado, total.gastado)

  return { year, filter, rows, totalByMonth, total }
}
