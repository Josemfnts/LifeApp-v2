import { saveToStorage, loadFromStorage } from '@/lib/storage'
import { create } from 'zustand'
import { onRemoteChange } from '@/lib/mirror'
import {
  DEFAULT_PROJECTS,
  addProject,
  renameProject,
  setProjectCatalog,
  setProjectArchived,
  type ProjectDef,
} from '@/lib/finance/projects'
import { addEuros, roundEuros, subEuros, sumEuros, toCents } from '@/lib/finance/money'
import { nextPaymentSplit, simulateExtra, type Debt } from '@/lib/finance/debts'
import { dueOccurrences } from '@/lib/finance/recurring'
import { buildFinanceContext } from '@/lib/finance/context'
import { currentValue, type Property, type Valuation } from '@/lib/finance/properties'
import { position, portfolio, resolvePrice, dcaDue, type Holding, type Lot, type Sale, type PriceCache } from '@/lib/finance/investments'
import { fetchCryptoPrices, loadPriceCache, savePriceCache } from '@/lib/finance/prices'
import { localISO } from '@/lib/finance/dates'
import { computeNetWorth } from '@/lib/finance/networth'
import { upsertTodaySnapshot, backfillEstimated, type NwSnapshot } from '@/lib/finance/snapshots'
import { buildAdjustment, buildTransfer, nextTxId } from '@/lib/finance/ops'
import { buildSettlement } from '@/lib/finance/conta-settle'
import { matchMerchant, learnMerchant, SEED_MERCHANTS, type Merchant } from '@/lib/finance/merchants'
import { buildImportTxs, type ImportRecord, type ReviewedRow } from '@/lib/finance/import/apply'
import type { CsvMapping } from '@/lib/finance/import/csv'
import { dueQuotaPufos, type Quota } from '@/lib/finance/quotas'

// Los comercios del usuario van primero: en empate de patrón, matchMerchant se queda con el
// primero, así un override de usuario gana al seed.
function allMerchants(user: Merchant[]): Merchant[] {
  return [...user, ...SEED_MERCHANTS]
}

function uid(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// Compra o venta de una inversión contra una cuenta: mueve dinero pero NO es gasto ni ingreso
// (kind 'investment', excluido del flujo). El resultado de la venta se ve en el P&L, no en el flujo.
function investmentTx(txs: Tx[], p: { type: 'income' | 'expense'; amount: number; cuenta: string; date: string; concept: string; holdingId: string }): Tx {
  return {
    id: nextTxId(txs), type: p.type, amount: roundEuros(p.amount), category: 'Inversión', concept: p.concept,
    note: '', cuenta: p.cuenta, date: p.date, kind: 'investment', holdingId: p.holdingId,
  }
}

export type { Tx, TxKind, Hucha, Pufo, Cuenta, Presupuesto, Recurrente } from '@/lib/finance/types'
export type { Quota } from '@/lib/finance/quotas'
import type { Tx, Hucha, Pufo, Cuenta, Presupuesto, Recurrente } from '@/lib/finance/types'

export const CAT_META: Record<string, { icon: string; color: string; type: string }> = {
  'Nómina':          { icon:'💼', color:'var(--color-acc-green)', type:'income' },
  'Freelance':       { icon:'💻', color:'var(--color-acc-green)', type:'income' },
  'Otros ingresos':  { icon:'📥', color:'var(--color-acc-green)', type:'income' },
  'Dividendos':      { icon:'💶', color:'var(--color-acc-green)', type:'income' },
  'Vivienda':        { icon:'🏠', color:'var(--color-acc-blue)', type:'expense' },
  'Alimentación':    { icon:'🛒', color:'var(--color-acc-gold)', type:'expense' },
  'Transporte':      { icon:'🚗', color:'var(--color-acc-purple)', type:'expense' },
  'Salud':           { icon:'💊', color:'var(--color-acc-green)', type:'expense' },
  'Ocio':            { icon:'🎬', color:'var(--color-acc-orange)', type:'expense' },
  'Ropa':            { icon:'👕', color:'var(--color-acc-gold)', type:'expense' },
  'Suscripciones':   { icon:'📱', color:'var(--color-acc-purple)', type:'expense' },
  'Deporte':         { icon:'🏋️', color:'var(--color-acc-orange)', type:'expense' },
  'Restaurantes':    { icon:'🍽️', color:'var(--color-acc-orange)', type:'expense' },
  'Viajes':          { icon:'✈️', color:'var(--color-acc-blue)', type:'expense' },
  'Educación':       { icon:'📚', color:'var(--color-acc-blue)', type:'expense' },
  'Ahorro':          { icon:'🏦', color:'var(--color-acc-gold)', type:'expense' },
  'Otros gastos':    { icon:'📤', color:'#8a8d96', type:'expense' },
  'Ajuste':          { icon:'⚖️', color:'var(--color-sub)',        type:'adjust' },
  'Traspaso':        { icon:'🔁', color:'var(--color-acc-blue)',   type:'transfer' },
  'Inversión':       { icon:'📈', color:'var(--color-acc-purple)', type:'investment' },
  'Intereses':       { icon:'💸', color:'var(--color-red)',        type:'expense' },
  'Amortización':    { icon:'🏦', color:'var(--color-acc-blue)',   type:'debt_principal' },
}

export const CUENTA_TYPE: Record<string, { label: string; icon: string; asset: boolean }> = {
  bank:     { label:'Cuenta bancaria', icon:'🏦', asset:true },
  savings:  { label:'Ahorro',          icon:'💰', asset:true },
  invest:   { label:'Inversión',       icon:'📈', asset:true },
  cash:     { label:'Efectivo',        icon:'💵', asset:true },
  property: { label:'Inmueble',        icon:'🏠', asset:true },
  vehicle:  { label:'Vehículo',        icon:'🚗', asset:true },
  pension:  { label:'Pensión/Plan',    icon:'👴', asset:true },
  loan:     { label:'Préstamo',        icon:'💸', asset:false },
  mortgage: { label:'Hipoteca',        icon:'🏠', asset:false },
  credit:   { label:'Tarjeta crédito', icon:'💳', asset:false },
}

export function fmt(n: number): string {
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' €'
}
export function fmtShort(n: number): string {
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'k€'
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(n) + '€'
}

interface FinanceStore {
  txs: Tx[]
  huchas: Hucha[]
  pufos: Pufo[]
  cuentas: Cuenta[]
  presupuestos: Presupuesto[]
  recurrentes: Recurrente[]
  snapshots: NwSnapshot[]
  merchants: Merchant[]
  imports: ImportRecord[]
  importMaps: Record<string, CsvMapping>
  holdings: Holding[]
  priceCache: PriceCache
  addHolding: (h: Holding, cuenta?: string) => void
  updateHolding: (id: string, partial: Partial<Holding>) => void
  removeHolding: (id: string) => void
  buyLot: (holdingId: string, lot: Omit<Lot, 'id'>, cuenta?: string) => void
  sell: (holdingId: string, sale: Omit<Sale, 'id'>, cuenta?: string) => void
  refreshPrices: () => Promise<number>
  runDueDca: () => { done: string[]; skipped: string[] }
  debts: Debt[]
  properties: Property[]
  projects: ProjectDef[]
  saveDebt: (d: Debt) => void
  removeDebt: (id: string) => void
  payDebt: (id: string, opts?: { date?: string; cuenta?: string }) => void
  extraAmortization: (id: string, amount: number, opts?: { date?: string; cuenta?: string; mode?: 'reduce_term' | 'reduce_payment' }) => void
  saveProperty: (p: Property) => void
  removeProperty: (id: string) => void
  addValuation: (propertyId: string, v: Valuation) => void
  // Catálogo vivo de proyectos (Conta). Lee/escribe en finances_projects y reinyecta el catálogo
  // activo que usan los selectores y projectLabel/resolveProjectId (es estado del módulo en
  // projects.ts: sin reinyectar, un addProject guardado no aparece hasta recargar la app).
  addProject: (label: string, color?: string) => { ok: boolean; error?: string }
  renameProject: (id: string, label: string) => { ok: boolean; error?: string }
  archiveProject: (id: string, archived: boolean) => { ok: boolean; error?: string }
  // Cuotas (Conta F7): lo que le TIENEN que pagar a Josema cada mes. Viven en finances_quotas
  // y, al abrir Finanzas, generateDueQuotas crea los pendientes que faltan (Pufo me_debe con
  // project y quotaId). El motor puro (dueQuotaPufos/quotaMonthlyTotal) decide qué entra; el
  // store solo guarda ids y aplica los lastRun.
  quotas: Quota[]
  addQuota: (q: Omit<Quota, 'id' | 'lastRun'> & { id?: number }) => Quota
  updateQuota: (id: number, partial: Partial<Quota>) => void
  toggleQuotaActive: (id: number, active: boolean) => void
  removeQuota: (id: number) => void
  // Genera los pufos de las cuotas que tocan hasta hoy. Sin escrituras si nada cambia (si no,
  // cada apertura mete ruido en el espejo vivo y CompAI).
  generateDueQuotas: () => Pufo[]
  applyImport: (p: { cuenta: string; filename: string; format: 'n43' | 'csv'; rows: ReviewedRow[]; skipped: number }) => ImportRecord
  undoImport: (importId: string) => number
  saveImportMap: (bank: string, mapping: CsvMapping) => void
  addTx: (tx: Tx) => void
  removeTx: (idx: number, opts?: { removeSplitPufos?: boolean }) => void
  updateTx: (idx: number, tx: Partial<Tx>) => void
  updateTxFull: (idx: number, tx: Partial<Tx>) => void
  addHucha: (h: Hucha) => void
  aportarHucha: (i: number, amount: number) => void
  removeHucha: (i: number) => void
  addPufo: (p: Pufo) => void
  settlePufo: (idx: number) => void
  cobrarPufo: (idx: number, opts: { date: string; cuenta?: string }) => void
  removePufo: (idx: number) => void
  saveCuenta: (c: Cuenta, editIdx?: number | null) => void
  removeCuenta: (idx: number) => void
  setPresupuesto: (cat: string, limit: number, rollover?: boolean) => void
  recurringDismissed: string[]
  updateRecurrente: (id: number, partial: Partial<Recurrente>) => void
  dismissSuggestion: (key: string) => void
  removePresupuesto: (cat: string) => void
  addRecurrente: (r: Recurrente) => void
  removeRecurrente: (id: number) => void
  processRecurrentes: () => Tx[]
  recordSnapshot: () => void
  adjustBalance: (cuentaName: string, newBalance: number, date?: string, importId?: string) => void
  addTransfer: (from: string, to: string, amount: number, date: string, concept?: string) => void
}

// Ajusta el saldo de la cuenta referenciada por un movimiento. dir=1 lo aplica
// (al añadir), dir=-1 lo revierte (al borrar). Si el movimiento no tiene cuenta
// o la cuenta ya no existe (p.ej. renombrada), devuelve null y no se toca nada.
function cuentasConMovimiento(cuentas: Cuenta[], tx: Tx, dir: 1 | -1): Cuenta[] | null {
  if (!tx.cuenta) return null
  const i = cuentas.findIndex(c => c.name === tx.cuenta)
  if (i < 0) return null
  const delta = (tx.type === 'income' ? tx.amount : -tx.amount) * dir
  const next = [...cuentas]
  next[i] = {
    ...next[i],
    balance: addEuros(next[i].balance, delta),
    updatedAt: localISO(),
  }
  return next
}

// finances_context: resumen compacto para CompAI / el Agente personal (SOLO lo escribe la app). Se recalcula
// tras cada cambio con 2 s de espera y solo se sube si cambió algo más que la hora de generación.
let contextTimer: ReturnType<typeof setTimeout> | null = null
function scheduleContextWrite(getState: () => FinanceStore): void {
  if (contextTimer) clearTimeout(contextTimer)
  contextTimer = setTimeout(() => {
    contextTimer = null
    const ctx = buildFinanceContext(getState(), localISO())
    const withoutTime = (c: unknown) => JSON.stringify({ ...(c as Record<string, unknown>), generatedAt: undefined })
    const prev = loadFromStorage<unknown>('finances_context', null)
    if (prev && withoutTime(prev) === withoutTime(ctx)) return
    saveToStorage('finances_context', ctx)
  }, 2000)
}

// Lo que se suma a las cuentas para el patrimonio neto: cartera de inversión, deudas e inmuebles
// registrados en sus módulos (respetando includeInNw). Lo usan la foto diaria y el hero.
export function netWorthExtras(
  s: { holdings: Holding[]; priceCache: PriceCache; debts: Debt[]; properties: Property[]; pufos?: Pufo[] },
  now = Date.now(),
): { liquid: number; investments: number; debt: number; property: number } {
  const today = localISO(new Date(now))
  // Lo que te deben es tuyo y lo que debes no: los pufos activos ajustan el líquido.
  const active = (s.pufos ?? []).filter(p => !p.settled)
  return {
    liquid: sumEuros(active.map(p => (p.dir === 'me_debe' ? p.amount : -p.amount))),
    investments: portfolio(s.holdings, s.priceCache, now).value,
    debt: sumEuros(s.debts.filter(d => d.includeInNw !== false).map(d => d.balance)),
    property: sumEuros(s.properties.filter(p => p.includeInNw !== false).map(p => currentValue(p, today))),
  }
}

export const useFinanceStore = create<FinanceStore>((set, get) => {
  const initialSnapshots = loadFromStorage('finances_nw_snapshots', [] as NwSnapshot[])

  const inner: FinanceStore = {
    txs: loadFromStorage('finances_tx', []),
    huchas: loadFromStorage('finances_huchas', []),
    pufos: loadFromStorage('finances_pufos', []),
    cuentas: loadFromStorage('finances_cuentas', []),
    presupuestos: loadFromStorage('finances_budgets', []),
    recurrentes: loadFromStorage('finances_recurring', []),
    snapshots: initialSnapshots,
    merchants: loadFromStorage('finances_merchants', [] as Merchant[]),
    imports: loadFromStorage('finances_imports', [] as ImportRecord[]),
    importMaps: loadFromStorage('finances_import_maps', {} as Record<string, CsvMapping>),
    holdings: loadFromStorage('finances_holdings', [] as Holding[]),
    priceCache: loadPriceCache(),
    debts: loadFromStorage('finances_debts', [] as Debt[]),
    properties: loadFromStorage('finances_properties', [] as Property[]),
    recurringDismissed: loadFromStorage('finances_recurring_dismissed', [] as string[]),
    projects: loadFromStorage('finances_projects', [] as ProjectDef[]),
    quotas: loadFromStorage('finances_quotas', [] as Quota[]),

    // ── Catálogo de proyectos (Conta) ─────────────────────────────────────────
    // Las funciones puras de projects.ts no mutan la entrada y devuelven {projects, error} (o
    // {project}). Aquí solo se aplica el resultado al store, se guarda y se reinyecta el
    // catálogo activo para que projectLabel/resolveProjectId/activeProjects lo vean sin
    // recargar la pestaña.
    addProject: (label, color) => {
      const current = get().projects
      const r = addProject(current, label, color)
      if (r.error) return { ok: false, error: r.error }
      saveToStorage('finances_projects', r.projects)
      set({ projects: r.projects })
      setProjectCatalog(r.projects)
      return { ok: true }
    },
    renameProject: (id, label) => {
      const current = get().projects
      const r = renameProject(current, id, label)
      if (r.error) return { ok: false, error: r.error }
      saveToStorage('finances_projects', r.projects)
      set({ projects: r.projects })
      setProjectCatalog(r.projects)
      return { ok: true }
    },
    archiveProject: (id, archived) => {
      const current = get().projects
      const r = setProjectArchived(current, id, archived)
      if (r.error) return { ok: false, error: r.error }
      // No-op: si pidió el estado en el que ya está, no guardamos ni escribimos nada.
      if (r.projects === current) return { ok: true }
      saveToStorage('finances_projects', r.projects)
      set({ projects: r.projects })
      setProjectCatalog(r.projects)
      return { ok: true }
    },

    // ── Cuotas (Conta F7) ───────────────────────────────────────────────────────
    // Las cuotas son PURAS en el motor: addQuota/updateQuota solo aplican las decisiones del
    // usuario (importe, periodicidad, día, desde…) y guardan. La generación de los pufos
    // debidos se hace aparte, en generateDueQuotas, al abrir Finanzas (ver espejo vivo:
    // recargador al final del módulo).
    addQuota: (q) => {
      const id = q.id ?? Date.now()
      const next: Quota = {
        id,
        project: q.project,
        amount: roundEuros(q.amount),
        day: Math.min(31, Math.max(1, q.day)),
        freq: q.freq ?? 'monthly',
        startDate: q.startDate,
        active: q.active,
        ...(q.concept ? { concept: q.concept } : {}),
      }
      const quotas = [...get().quotas, next]
      saveToStorage('finances_quotas', quotas)
      set({ quotas })
      return next
    },

    updateQuota: (id, partial) => {
      const next = get().quotas.map(q => (q.id === id ? { ...q, ...partial, id } : q))
      saveToStorage('finances_quotas', next)
      set({ quotas: next })
    },

    toggleQuotaActive: (id, active) => {
      const current = get().quotas.find(q => q.id === id)
      if (!current || current.active === active) return
      get().updateQuota(id, { active })
    },

    removeQuota: (id) => {
      const next = get().quotas.filter(q => q.id !== id)
      saveToStorage('finances_quotas', next)
      set({ quotas: next })
    },

    // Convierte las ocurrencias pendientes de cada cuota en Pufo me_debe (con su project y
    // quotaId). Mismo patrón que processRecurrentes: una sola escritura por clave afectada,
    // y solo si hay trabajo real (si no, abrir la app 10 veces produce 10 escrituras vacías
    // en el espejo vivo y CompAI lo nota).
    generateDueQuotas: () => {
      const today = localISO()
      const run = dueQuotaPufos(get().quotas, get().pufos, today)
      if (run.pufos.length === 0) {
        // Ni pufos que crear, ni lastRun nuevos: nada que escribir.
        if (Object.keys(run.lastRunByQuota).length === 0) return []
      }
      // ids únicos: mismo truco que en addTx (split) — Date.now() siempre por encima del
      // máximo actual, +1 por cada pufo nuevo para que dos del mismo tick no colisionen.
      let nextPufoId = Math.max(Date.now(), ...get().pufos.map(p => p.id + 1))
      const newPufos: Pufo[] = run.pufos.map(p => ({ ...p, id: nextPufoId++ }))
      const pufosAll = get().pufos.length === 0
        ? [...newPufos]
        : [...newPufos, ...get().pufos]
      // Mantener el orden estable de la lista de Patrimonio: lo más reciente arriba.
      pufosAll.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
      saveToStorage('finances_pufos', pufosAll)
      // Si hay lastRun nuevos, los pisamos sobre los existentes (los demás no se tocan).
      if (Object.keys(run.lastRunByQuota).length > 0) {
        const quotas = get().quotas.map(q => (run.lastRunByQuota[q.id] ? { ...q, lastRun: run.lastRunByQuota[q.id] } : q))
        saveToStorage('finances_quotas', quotas)
        set({ quotas, pufos: pufosAll })
      } else {
        set({ pufos: pufosAll })
      }
      return newPufos
    },

    // ── Deudas ─────────────────────────────────────────────────────────────────
    saveDebt: (d) => {
      const exists = get().debts.some(x => x.id === d.id)
      const debts = exists ? get().debts.map(x => (x.id === d.id ? d : x)) : [...get().debts, d]
      saveToStorage('finances_debts', debts)
      set({ debts })
      get().recordSnapshot()
    },

    removeDebt: (id) => {
      const debts = get().debts.filter(d => d.id !== id)
      saveToStorage('finances_debts', debts)
      set({ debts })
      get().recordSnapshot()
    },

    // Una cuota = dos movimientos enlazados: intereses (gasto real) y capital (kind 'debt_principal':
    // sale de la cuenta y baja la deuda, el patrimonio no cambia).
    payDebt: (id, opts = {}) => {
      const d = get().debts.find(x => x.id === id)
      if (!d) return
      const date = opts.date ?? localISO()
      const split = nextPaymentSplit(d, date)
      if (toCents(split.total) <= 0) return
      const linkId = uid()
      let txs = get().txs
      let cuentas = get().cuentas
      const legs: Tx[] = []
      if (toCents(split.interest) > 0) {
        legs.push({ id: nextTxId(txs), type: 'expense', amount: split.interest, category: 'Intereses', concept: `Intereses ${d.name}`, note: '', cuenta: opts.cuenta, date, debtId: id, linkId })
      }
      if (toCents(split.principal) > 0) {
        legs.push({ id: nextTxId([...legs, ...txs]), type: 'expense', amount: split.principal, category: 'Amortización', concept: `Capital ${d.name}`, note: '', cuenta: opts.cuenta, date, kind: 'debt_principal', debtId: id, linkId })
      }
      for (const t of legs) {
        const c = cuentasConMovimiento(cuentas, t, 1)
        if (c) cuentas = c
      }
      txs = [...legs, ...txs]
      const debts = get().debts.map(x => (x.id === id
        ? { ...x, balance: subEuros(x.balance, split.principal), payments: [...x.payments, { id: uid(), date, total: split.total, interest: split.interest, principal: split.principal, linkId }] }
        : x))
      saveToStorage('finances_tx', txs)
      saveToStorage('finances_cuentas', cuentas)
      saveToStorage('finances_debts', debts)
      set({ txs, cuentas, debts })
      get().recordSnapshot()
    },

    extraAmortization: (id, amount, opts = {}) => {
      const d = get().debts.find(x => x.id === id)
      if (!d) return
      const principal = Math.min(roundEuros(amount), d.balance)
      if (toCents(principal) <= 0) return
      const date = opts.date ?? localISO()
      const linkId = uid()
      // Reducir plazo guarda los meses que se quitan; sin ellos el plazo sigue y baja la cuota.
      const monthsSaved = opts.mode === 'reduce_term' ? simulateExtra(d, principal, 'reduce_term', date).monthsSaved : 0
      const tx: Tx = { id: nextTxId(get().txs), type: 'expense', amount: principal, category: 'Amortización', concept: `Amortización anticipada ${d.name}`, note: '', cuenta: opts.cuenta, date, kind: 'debt_principal', debtId: id, linkId }
      const txs = [tx, ...get().txs]
      const cuentas = cuentasConMovimiento(get().cuentas, tx, 1) ?? get().cuentas
      const payment = { id: uid(), date, total: principal, interest: 0, principal, extra: true, linkId, ...(monthsSaved > 0 ? { monthsSaved } : {}) }
      const debts = get().debts.map(x => (x.id === id
        ? { ...x, balance: subEuros(x.balance, principal), payments: [...x.payments, payment] }
        : x))
      saveToStorage('finances_tx', txs)
      saveToStorage('finances_cuentas', cuentas)
      saveToStorage('finances_debts', debts)
      set({ txs, cuentas, debts })
      get().recordSnapshot()
    },

    // ── Inmuebles ──────────────────────────────────────────────────────────────
    saveProperty: (p) => {
      const exists = get().properties.some(x => x.id === p.id)
      const properties = exists ? get().properties.map(x => (x.id === p.id ? p : x)) : [...get().properties, p]
      saveToStorage('finances_properties', properties)
      set({ properties })
      get().recordSnapshot()
    },

    removeProperty: (id) => {
      const properties = get().properties.filter(p => p.id !== id)
      // Las hipotecas que apuntaban a este inmueble se quedan sin vínculo, no se borran.
      const debts = get().debts.map(d => (d.propertyId === id ? { ...d, propertyId: undefined } : d))
      saveToStorage('finances_properties', properties)
      saveToStorage('finances_debts', debts)
      set({ properties, debts })
      get().recordSnapshot()
    },

    addValuation: (propertyId, v) => {
      const properties = get().properties.map(p => (p.id === propertyId
        ? { ...p, valuations: [...p.valuations.filter(x => x.date !== v.date), v].sort((a, b) => a.date.localeCompare(b.date)) }
        : p))
      saveToStorage('finances_properties', properties)
      set({ properties })
      get().recordSnapshot()
    },

    // ── Inversiones ────────────────────────────────────────────────────────────
    addHolding: (h, cuenta) => {
      const holdings = [...get().holdings, h]
      let txs = get().txs
      let cuentas = get().cuentas
      if (cuenta) {
        for (const l of h.lots) {
          const tx = investmentTx(txs, { type: 'expense', amount: l.quantity * l.unitCost + l.fees, cuenta, date: l.date, concept: `Compra ${h.name}`, holdingId: h.id })
          txs = [tx, ...txs]
          const c = cuentasConMovimiento(cuentas, tx, 1)
          if (c) cuentas = c
        }
        saveToStorage('finances_tx', txs)
        saveToStorage('finances_cuentas', cuentas)
      }
      saveToStorage('finances_holdings', holdings)
      set({ holdings, txs, cuentas })
      get().recordSnapshot()
    },

    updateHolding: (id, partial) => {
      const holdings = get().holdings.map(h => (h.id === id ? { ...h, ...partial, id } : h))
      saveToStorage('finances_holdings', holdings)
      set({ holdings })
      get().recordSnapshot()
    },

    removeHolding: (id) => {
      const holdings = get().holdings.filter(h => h.id !== id)
      saveToStorage('finances_holdings', holdings)
      set({ holdings })
      get().recordSnapshot()
    },

    buyLot: (holdingId, lot, cuenta) => {
      const h = get().holdings.find(x => x.id === holdingId)
      if (!h) return
      const updated: Holding = { ...h, lots: [...h.lots, { ...lot, id: uid() }] }
      const holdings = get().holdings.map(x => (x.id === holdingId ? updated : x))
      let txs = get().txs
      let cuentas = get().cuentas
      // Staking y airdrops no salen de ninguna cuenta.
      const free = lot.source === 'staking' || lot.source === 'airdrop'
      if (cuenta && !free) {
        const tx = investmentTx(txs, { type: 'expense', amount: lot.quantity * lot.unitCost + lot.fees, cuenta, date: lot.date, concept: `Compra ${h.name}`, holdingId })
        txs = [tx, ...txs]
        const c = cuentasConMovimiento(cuentas, tx, 1)
        if (c) cuentas = c
        saveToStorage('finances_tx', txs)
        saveToStorage('finances_cuentas', cuentas)
      }
      saveToStorage('finances_holdings', holdings)
      set({ holdings, txs, cuentas })
      get().recordSnapshot()
    },

    // Lanza (sin guardar nada) si la venta supera lo que había en cartera en esa fecha.
    sell: (holdingId, sale, cuenta) => {
      const h = get().holdings.find(x => x.id === holdingId)
      if (!h) return
      const updated: Holding = { ...h, sales: [...h.sales, { ...sale, id: uid() }] }
      position(updated)
      const holdings = get().holdings.map(x => (x.id === holdingId ? updated : x))
      let txs = get().txs
      let cuentas = get().cuentas
      if (cuenta) {
        const tx = investmentTx(txs, { type: 'income', amount: sale.quantity * sale.unitPrice - sale.fees, cuenta, date: sale.date, concept: `Venta ${h.name}`, holdingId })
        txs = [tx, ...txs]
        const c = cuentasConMovimiento(cuentas, tx, 1)
        if (c) cuentas = c
        saveToStorage('finances_tx', txs)
        saveToStorage('finances_cuentas', cuentas)
      }
      saveToStorage('finances_holdings', holdings)
      set({ holdings, txs, cuentas })
      get().recordSnapshot()
    },

    // Pide precios de todas las cripto en UNA llamada. No escribe la foto diaria: los precios cambian
    // cada minuto y eso llenaría el espejo de escrituras; la foto se actualiza al abrir o al tocar datos.
    refreshPrices: async () => {
      const ids = get().holdings.map(h => h.coingeckoId).filter((x): x is string => !!x)
      if (ids.length === 0) return 0
      const quotes = await fetchCryptoPrices(ids)
      const n = Object.keys(quotes).length
      if (n === 0) return 0
      set({ priceCache: savePriceCache(quotes) })
      return n
    },

    runDueDca: () => {
      const today = localISO()
      const now = Date.now()
      const done: string[] = []
      const skipped: string[] = []
      let txs = get().txs
      let cuentas = get().cuentas
      const holdings = get().holdings.map(h => {
        if (!h.dca || !dcaDue(h, today)) return h
        const { price, source } = resolvePrice(h, get().priceCache, now)
        if (source === 'cost' || !(price > 0)) { skipped.push(h.name); return h }
        const quantity = Math.round((h.dca.amount / price) * 1e8) / 1e8
        const tx = investmentTx(txs, { type: 'expense', amount: h.dca.amount, cuenta: h.dca.cuenta, date: today, concept: `Compra periódica ${h.name}`, holdingId: h.id })
        txs = [tx, ...txs]
        const c = cuentasConMovimiento(cuentas, tx, 1)
        if (c) cuentas = c
        done.push(h.name)
        return {
          ...h,
          lots: [...h.lots, { id: uid(), date: today, quantity, unitCost: price, fees: 0, source: 'dca' as const }],
          dca: { ...h.dca, lastRun: today.slice(0, 7) },
        }
      })
      if (done.length > 0 || skipped.length > 0) {
        if (done.length > 0) {
          saveToStorage('finances_tx', txs)
          saveToStorage('finances_cuentas', cuentas)
          saveToStorage('finances_holdings', holdings)
          set({ holdings, txs, cuentas })
          get().recordSnapshot()
        }
      }
      return { done, skipped }
    },

    // Aplica una importación ya revisada: una sola escritura por clave, saldo movido y registro
    // en el historial para poder deshacerla.
    applyImport: ({ cuenta, filename, format, rows, skipped }) => {
      const importId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `imp-${Date.now()}`
      const baseId = nextTxId(get().txs)
      const newTxs = buildImportTxs(rows, cuenta, importId, baseId)
      const txs = [...newTxs, ...get().txs]
      let cuentas = get().cuentas
      for (const t of newTxs) {
        const c = cuentasConMovimiento(cuentas, t, 1)
        if (c) cuentas = c
      }
      const record: ImportRecord = {
        id: importId, date: localISO(), cuenta, filename, format,
        total: rows.length + skipped, imported: newTxs.length, skipped,
      }
      const imports = [record, ...get().imports]
      saveToStorage('finances_tx', txs)
      saveToStorage('finances_cuentas', cuentas)
      saveToStorage('finances_imports', imports)
      set({ txs, cuentas, imports })
      get().recordSnapshot()
      return record
    },

    undoImport: (importId) => {
      const all = get().txs
      const removed = all.filter(t => t.importId === importId)
      let cuentas = get().cuentas
      for (const t of removed) {
        const c = cuentasConMovimiento(cuentas, t, -1)
        if (c) cuentas = c
      }
      const txs = all.filter(t => t.importId !== importId)
      const imports = get().imports.map(r => (r.id === importId ? { ...r, undone: true } : r))
      saveToStorage('finances_tx', txs)
      saveToStorage('finances_cuentas', cuentas)
      saveToStorage('finances_imports', imports)
      set({ txs, cuentas, imports })
      get().recordSnapshot()
      return removed.length
    },

    saveImportMap: (bank, mapping) => {
      const importMaps = { ...get().importMaps, [bank.trim()]: mapping }
      saveToStorage('finances_import_maps', importMaps)
      set({ importMaps })
    },

    recordSnapshot: () => {
      const { snapshots, cuentas, txs } = get()
      let current = snapshots
      if (current.length === 0 && cuentas.length > 0) {
        current = backfillEstimated(cuentas, txs, localISO(), 12)
      }
      const b = computeNetWorth(cuentas, netWorthExtras(get()))
      const r = upsertTodaySnapshot(current, localISO(), b)
      if (r.changed) {
        saveToStorage('finances_nw_snapshots', r.snaps)
        set({ snapshots: r.snaps })
      }
      scheduleContextWrite(get)
    },

    addTx: (tx) => {
      const baseStamped: Tx = { ...tx, id: nextTxId(get().txs) }
      const m = matchMerchant(baseStamped.concept, allMerchants(get().merchants))
      const stamped: Tx = m ? { ...baseStamped, merchantId: m.id } : baseStamped
      const txs = [stamped, ...get().txs]
      saveToStorage('finances_tx', txs)
      const cuentas = cuentasConMovimiento(get().cuentas, stamped, 1)
      if (cuentas) saveToStorage('finances_cuentas', cuentas)
      set(cuentas ? { txs, cuentas } : { txs })
      // Gasto compartido: la parte de cada persona queda como pufo "me debe" ligado al movimiento.
      if (stamped.split && stamped.type === 'expense') {
        let nextPufoId = Math.max(Date.now(), ...get().pufos.map(p => p.id + 1))
        const newPufos: Pufo[] = stamped.split.people
          .filter(p => toCents(p.share) > 0)
          .map(p => ({
            id: nextPufoId++, who: p.name, person: p.name, amount: p.share, dir: 'me_debe' as const,
            reason: `Parte de ${stamped.concept}`, concept: stamped.concept, date: stamped.date, settled: false, txId: stamped.id,
          }))
        if (newPufos.length > 0) {
          const pufos = [...get().pufos, ...newPufos]
          saveToStorage('finances_pufos', pufos)
          set({ pufos })
        }
      }
      get().recordSnapshot()
    },

    removeTx: (idx, opts) => {
      const txsAll = get().txs
      const borrada = txsAll[idx]
      if (!borrada) return
      let txs = txsAll
      let cuentas = get().cuentas
      if (borrada.linkId) {
        const linkId = borrada.linkId
        const patas = txsAll.filter(t => t.linkId === linkId)
        txs = txsAll.filter(t => t.linkId !== linkId)
        for (const p of patas) {
          const c = cuentasConMovimiento(cuentas, p, -1)
          if (c) cuentas = c
        }
      } else {
        txs = txsAll.filter((_, i) => i !== idx)
        const c = cuentasConMovimiento(cuentas, borrada, -1)
        if (c) cuentas = c
      }
      if (opts?.removeSplitPufos && borrada.split) {
        const pufos = get().pufos.filter(p => !(p.txId === borrada.id && !p.settled))
        saveToStorage('finances_pufos', pufos)
        set({ pufos })
      }
      // Si se borra el apunte de una cuota o amortización, la deuda recupera ese capital y el pago
      // desaparece del historial: si no, la deuda quedaría rebajada sin que salga dinero de ninguna cuenta.
      const removed = borrada.linkId ? txsAll.filter(t => t.linkId === borrada.linkId) : [borrada]
      const principalLegs = removed.filter(t => t.kind === 'debt_principal' && t.debtId)
      if (principalLegs.length > 0) {
        const debts = get().debts.map(d => {
          const legs = principalLegs.filter(t => t.debtId === d.id)
          if (legs.length === 0) return d
          const links = new Set(legs.map(t => t.linkId).filter(Boolean))
          return {
            ...d,
            balance: addEuros(d.balance, ...legs.map(t => t.amount)),
            payments: d.payments.filter(p => !(p.linkId && links.has(p.linkId))),
          }
        })
        saveToStorage('finances_debts', debts)
        set({ debts })
      }
      saveToStorage('finances_tx', txs)
      saveToStorage('finances_cuentas', cuentas)
      set({ txs, cuentas })
      get().recordSnapshot()
    },

    updateTx: (idx, partial) => {
      const txs = [...get().txs]
      const antes = txs[idx]
      txs[idx] = { ...txs[idx], ...partial }
      saveToStorage('finances_tx', txs)
      let cuentas = get().cuentas
      const c1 = antes ? cuentasConMovimiento(cuentas, antes, -1) : null
      if (c1) cuentas = c1
      const c2 = cuentasConMovimiento(cuentas, txs[idx], 1)
      if (c2) cuentas = c2
      if (c1 || c2) { saveToStorage('finances_cuentas', cuentas); set({ txs, cuentas }) }
      else set({ txs })
      get().recordSnapshot()
    },

    updateTxFull: (idx, partial) => {
      const txsAll = get().txs
      const target = txsAll[idx]
      if (!target) return
      const isTransfer = !!target.linkId
      const linkId = target.linkId

      if (!isTransfer) {
        get().updateTx(idx, partial)
        const after = get().txs[idx]
        let merchants = get().merchants
        if (after.category && partial.category !== undefined) {
          const m = matchMerchant(after.concept, allMerchants(merchants))
          if (m) {
            merchants = learnMerchant(merchants, {
              name: m.name,
              concept: after.concept,
              category: after.category,
              domain: m.domain,
            })
            saveToStorage('finances_merchants', merchants)
            set({ merchants })
          }
        }
        return
      }

      const patas = txsAll.filter(t => t.linkId === linkId)
      const basePata = target

      const newAmount = partial.amount !== undefined ? partial.amount : basePata.amount
      const newDate = partial.date !== undefined ? partial.date : basePata.date
      const newConcept = partial.concept !== undefined ? partial.concept : basePata.concept

      let cuentas = get().cuentas
      for (const p of patas) {
        const c = cuentasConMovimiento(cuentas, p, -1)
        if (c) cuentas = c
      }

      let txs = [...txsAll]
      const txsAfter: Tx[] = []
      for (const p of patas) {
        const updated: Tx = {
          ...p,
          amount: newAmount,
          date: newDate,
          concept: newConcept,
        }
        txsAfter.push(updated)
        const c = cuentasConMovimiento(cuentas, updated, 1)
        if (c) cuentas = c
      }
      const map = new Map(txsAfter.map(t => [t.id, t]))
      txs = txs.map(t => map.get(t.id) ?? t)
      saveToStorage('finances_tx', txs)
      saveToStorage('finances_cuentas', cuentas)
      set({ txs, cuentas })
      get().recordSnapshot()
    },

    addHucha: (h) => {
      const huchas = [...get().huchas, h]
      saveToStorage('finances_huchas', huchas)
      set({ huchas })
    },
    aportarHucha: (i, amount) => {
      const huchas = [...get().huchas]
      huchas[i] = { ...huchas[i], current: Math.min(huchas[i].current + amount, huchas[i].goal * 10) }
      saveToStorage('finances_huchas', huchas)
      set({ huchas })
    },
    removeHucha: (i) => {
      const huchas = get().huchas.filter((_, idx) => idx !== i)
      saveToStorage('finances_huchas', huchas)
      set({ huchas })
    },

    addPufo: (p) => {
      const pufos = [...get().pufos, p]
      saveToStorage('finances_pufos', pufos)
      set({ pufos })
    },
    settlePufo: (idx) => {
      const pufos = [...get().pufos]
      pufos[idx] = { ...pufos[idx], settled: true, settledDate: localISO() }
      saveToStorage('finances_pufos', pufos)
      set({ pufos })
    },
    // F4 de Contabilidad por proyecto. Cierra el ciclo del cobro: el pendiente se liquida
    // (settled + settledDate con la fecha que eligió Josema) Y se crea el ingreso real,
    // con esa misma fecha, en la misma acción. Si el borrador no vale, no se toca nada
    // (ni el pufo ni las cuentas): nada a medias llega al estado. Reusa `addTx` para que el
    // ingreso reciba id, mueva la cuenta con cuentasConMovimiento, persista finances_cuentas
    // y dispare recordSnapshot — no replicamos nada de eso a mano.
    cobrarPufo: (idx, opts) => {
      const pufosAll = get().pufos
      const pufo = pufosAll[idx]
      if (!pufo) return
      const settlement = buildSettlement({ pufo, date: opts.date, cuenta: opts.cuenta ?? '' })
      if (!settlement) return
      const pufos = pufosAll.map((p, i) => (i === idx ? { ...p, ...settlement.pufoPatch } : p))
      saveToStorage('finances_pufos', pufos)
      set({ pufos })
      // El id del tx lo pone addTx; aquí solo se pasa el resto.
      get().addTx(settlement.tx)
    },
    removePufo: (idx) => {
      const pufos = get().pufos.filter((_, i) => i !== idx)
      saveToStorage('finances_pufos', pufos)
      set({ pufos })
    },

    saveCuenta: (c, editIdx) => {
      const prevCuentas = get().cuentas
      const id = c.id ?? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()))
      const stamped: Cuenta = { ...c, id, updatedAt: localISO() }
      const cuentas = [...prevCuentas]
      let oldName: string | null = null
      if (editIdx != null) {
        oldName = cuentas[editIdx]?.name ?? null
        cuentas[editIdx] = stamped
      } else {
        cuentas.push(stamped)
      }
      saveToStorage('finances_cuentas', cuentas)
      let txs = get().txs
      if (oldName && oldName !== stamped.name) {
        txs = txs.map(t => (t.cuenta === oldName ? { ...t, cuenta: stamped.name } : t))
        saveToStorage('finances_tx', txs)
      }
      set({ cuentas, ...(oldName && oldName !== stamped.name ? { txs } : {}) })
      get().recordSnapshot()
    },

    removeCuenta: (idx) => {
      const cuentas = get().cuentas.filter((_, i) => i !== idx)
      saveToStorage('finances_cuentas', cuentas)
      set({ cuentas })
      get().recordSnapshot()
    },

    setPresupuesto: (cat, limit, rollover) => {
      const prev = get().presupuestos.find(p => p.category === cat)
      const keepRollover = rollover ?? prev?.rollover ?? false
      const next: Presupuesto = {
        category: cat,
        limit,
        ...(keepRollover ? { rollover: true } : {}),
        since: prev?.since ?? localISO().slice(0, 7),
      }
      const presupuestos = [...get().presupuestos.filter(p => p.category !== cat), next]
      saveToStorage('finances_budgets', presupuestos)
      set({ presupuestos })
    },
    removePresupuesto: (cat) => {
      const presupuestos = get().presupuestos.filter(p => p.category !== cat)
      saveToStorage('finances_budgets', presupuestos)
      set({ presupuestos })
    },

    addRecurrente: (r) => {
      const recurrentes = [...get().recurrentes, r]
      saveToStorage('finances_recurring', recurrentes)
      set({ recurrentes })
    },
    removeRecurrente: (id) => {
      const recurrentes = get().recurrentes.filter(r => r.id !== id)
      saveToStorage('finances_recurring', recurrentes)
      set({ recurrentes })
    },
    updateRecurrente: (id, partial) => {
      const recurrentes = get().recurrentes.map(r => (r.id === id ? { ...r, ...partial, id } : r))
      saveToStorage('finances_recurring', recurrentes)
      set({ recurrentes })
    },
    dismissSuggestion: (key) => {
      if (get().recurringDismissed.includes(key)) return
      const recurringDismissed = [...get().recurringDismissed, key]
      saveToStorage('finances_recurring_dismissed', recurringDismissed)
      set({ recurringDismissed })
    },

    // Genera los movimientos de los recurrentes que tocan hasta hoy, con la fecha real de cada
    // ocurrencia y moviendo la cuenta. Con lastRun: todas las pendientes. Los antiguos (sin lastRun):
    // solo el mes actual y con la guarda de siempre (mismo concepto/categoría/tipo ya apuntado este mes).
    processRecurrentes: () => {
      const todayStr = localISO()
      const monthNow = todayStr.slice(0, 7)
      let txs = get().txs
      let cuentas = get().cuentas
      const newTxs: Tx[] = []
      let changed = false
      const recurrentes = get().recurrentes.map(r => {
        const due = dueOccurrences(r, todayStr)
        if (due.length === 0) return r
        const alreadyThisMonth = !r.lastRun && txs.some(t =>
          t.date.startsWith(monthNow) && t.concept === r.concept && t.category === r.category && t.type === r.type)
        if (!alreadyThisMonth) {
          for (const date of due) {
            const tx: Tx = {
              id: nextTxId([...newTxs, ...txs]), concept: r.concept, amount: r.amount, type: r.type,
              category: r.category, date, note: '(recurrente)', recurringId: r.id, ...(r.cuenta ? { cuenta: r.cuenta } : {}),
            }
            newTxs.push(tx)
            const c = cuentasConMovimiento(cuentas, tx, 1)
            if (c) cuentas = c
          }
        }
        changed = true
        return { ...r, lastRun: due[due.length - 1] }
      })
      if (changed) {
        saveToStorage('finances_recurring', recurrentes)
        set({ recurrentes })
      }
      if (newTxs.length > 0) {
        txs = [...newTxs, ...txs]
        saveToStorage('finances_tx', txs)
        saveToStorage('finances_cuentas', cuentas)
        set({ txs, cuentas })
        get().recordSnapshot()
      }
      return newTxs
    },

    adjustBalance: (cuentaName, newBalance, date, importId) => {
      const cuenta = get().cuentas.find(c => c.name === cuentaName)
      if (!cuenta) return
      const tx = buildAdjustment(cuenta, newBalance, date ?? localISO(), importId)
      if (!tx) return
      get().addTx(tx)
    },

    addTransfer: (from, to, amount, date, concept) => {
      const [fromTx, toTx] = buildTransfer(from, to, amount, date, concept)
      const idFrom = nextTxId(get().txs)
      const stampedFrom: Tx = { ...fromTx, id: idFrom }
      const stampedTo: Tx = { ...toTx, id: idFrom + 1 }
      const txs = [stampedFrom, stampedTo, ...get().txs]
      saveToStorage('finances_tx', txs)
      let cuentas = get().cuentas
      const c1 = cuentasConMovimiento(cuentas, stampedFrom, 1)
      if (c1) cuentas = c1
      const c2 = cuentasConMovimiento(cuentas, stampedTo, 1)
      if (c2) cuentas = c2
      saveToStorage('finances_cuentas', cuentas)
      set({ txs, cuentas })
      get().recordSnapshot()
    },
  }
  // Catálogo activo: si Josema no tiene nada guardado, usamos la semilla (los 5 clientes + 3D
  // + Otros). Así los selectores pueden pintar antes de que el store termine de hidratar y
  // sin tener que escribir la clave en localStorage en cada dispositivo nuevo.
  setProjectCatalog(inner.projects.length > 0 ? inner.projects : DEFAULT_PROJECTS)
  return inner
})

// Espejo vivo: recarga desde localStorage la clave que cambió en la nube.
onRemoteChange({
  finances_tx: () => useFinanceStore.setState({ txs: loadFromStorage('finances_tx', []) }),
  finances_huchas: () => useFinanceStore.setState({ huchas: loadFromStorage('finances_huchas', []) }),
  finances_pufos: () => useFinanceStore.setState({ pufos: loadFromStorage('finances_pufos', []) }),
  finances_cuentas: () => useFinanceStore.setState({ cuentas: loadFromStorage('finances_cuentas', []) }),
  finances_budgets: () => useFinanceStore.setState({ presupuestos: loadFromStorage('finances_budgets', []) }),
  finances_recurring: () => useFinanceStore.setState({ recurrentes: loadFromStorage('finances_recurring', []) }),
  finances_nw_snapshots: () => useFinanceStore.setState({ snapshots: loadFromStorage('finances_nw_snapshots', []) }),
  finances_merchants: () => useFinanceStore.setState({ merchants: loadFromStorage('finances_merchants', []) }),
  finances_imports: () => useFinanceStore.setState({ imports: loadFromStorage('finances_imports', []) }),
  finances_import_maps: () => useFinanceStore.setState({ importMaps: loadFromStorage('finances_import_maps', {}) }),
  finances_holdings: () => useFinanceStore.setState({ holdings: loadFromStorage('finances_holdings', []) }),
  finances_debts: () => useFinanceStore.setState({ debts: loadFromStorage('finances_debts', []) }),
  finances_recurring_dismissed: () => useFinanceStore.setState({ recurringDismissed: loadFromStorage('finances_recurring_dismissed', []) }),
  // Solo lo escribe la app (lo lee CompAI): no hay estado que recargar, se registra para cumplir el invariante.
  finances_context: () => {},
  finances_properties: () => useFinanceStore.setState({ properties: loadFromStorage('finances_properties', []) }),
  // El catálogo de proyectos lo inyecta el store al arrancar; cada recarga del espejo vivo
  // tiene que reinyectarlo también, si no los selectores no ven lo que CompAI acaba de crear.
  finances_projects: () => {
    const projects = loadFromStorage('finances_projects', [] as ProjectDef[])
    const next = projects.length > 0 ? projects : DEFAULT_PROJECTS
    useFinanceStore.setState({ projects: [...next] })
    setProjectCatalog(next)
  },
  // Cuotas: clave nueva ⇒ recargador obligatorio. Sin esto, si CompAI toca una cuota en la
  // nube (alta, edición, pause, baja), la app abierta no lo vería hasta recargar.
  finances_quotas: () => useFinanceStore.setState({ quotas: loadFromStorage('finances_quotas', [] as Quota[]) }),
})
