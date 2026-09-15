import { saveToStorage, loadFromStorage } from '@/lib/storage'
import { create } from 'zustand'
import { onRemoteChange } from '@/lib/mirror'
import { addEuros, roundEuros, subEuros, sumEuros, toCents } from '@/lib/finance/money'
import { nextPaymentSplit, type Debt } from '@/lib/finance/debts'
import { currentValue, type Property, type Valuation } from '@/lib/finance/properties'
import { position, portfolio, resolvePrice, dcaDue, type Holding, type Lot, type Sale, type PriceCache } from '@/lib/finance/investments'
import { fetchCryptoPrices, loadPriceCache, savePriceCache } from '@/lib/finance/prices'
import { localISO } from '@/lib/finance/dates'
import { computeNetWorth } from '@/lib/finance/networth'
import { upsertTodaySnapshot, backfillEstimated, type NwSnapshot } from '@/lib/finance/snapshots'
import { buildAdjustment, buildTransfer, nextTxId } from '@/lib/finance/ops'
import { matchMerchant, learnMerchant, SEED_MERCHANTS, type Merchant } from '@/lib/finance/merchants'
import { buildImportTxs, type ImportRecord, type ReviewedRow } from '@/lib/finance/import/apply'
import type { CsvMapping } from '@/lib/finance/import/csv'

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
  saveDebt: (d: Debt) => void
  removeDebt: (id: string) => void
  payDebt: (id: string, opts?: { date?: string; cuenta?: string }) => void
  extraAmortization: (id: string, amount: number, opts?: { date?: string; cuenta?: string }) => void
  saveProperty: (p: Property) => void
  removeProperty: (id: string) => void
  addValuation: (propertyId: string, v: Valuation) => void
  applyImport: (p: { cuenta: string; filename: string; format: 'n43' | 'csv'; rows: ReviewedRow[]; skipped: number }) => ImportRecord
  undoImport: (importId: string) => number
  saveImportMap: (bank: string, mapping: CsvMapping) => void
  addTx: (tx: Tx) => void
  removeTx: (idx: number) => void
  updateTx: (idx: number, tx: Partial<Tx>) => void
  updateTxFull: (idx: number, tx: Partial<Tx>) => void
  addHucha: (h: Hucha) => void
  aportarHucha: (i: number, amount: number) => void
  removeHucha: (i: number) => void
  addPufo: (p: Pufo) => void
  settlePufo: (idx: number) => void
  removePufo: (idx: number) => void
  saveCuenta: (c: Cuenta, editIdx?: number | null) => void
  removeCuenta: (idx: number) => void
  setPresupuesto: (cat: string, limit: number) => void
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

// Lo que se suma a las cuentas para el patrimonio neto: cartera de inversión, deudas e inmuebles
// registrados en sus módulos (respetando includeInNw). Lo usan la foto diaria y el hero.
export function netWorthExtras(
  s: { holdings: Holding[]; priceCache: PriceCache; debts: Debt[]; properties: Property[] },
  now = Date.now(),
): { investments: number; debt: number; property: number } {
  const today = localISO(new Date(now))
  return {
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
      const tx: Tx = { id: nextTxId(get().txs), type: 'expense', amount: principal, category: 'Amortización', concept: `Amortización anticipada ${d.name}`, note: '', cuenta: opts.cuenta, date, kind: 'debt_principal', debtId: id, linkId }
      const txs = [tx, ...get().txs]
      const cuentas = cuentasConMovimiento(get().cuentas, tx, 1) ?? get().cuentas
      const debts = get().debts.map(x => (x.id === id
        ? { ...x, balance: subEuros(x.balance, principal), payments: [...x.payments, { id: uid(), date, total: principal, interest: 0, principal, extra: true, linkId }] }
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
      get().recordSnapshot()
    },

    removeTx: (idx) => {
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

    setPresupuesto: (cat, limit) => {
      const presupuestos = [...get().presupuestos.filter(p => p.category !== cat), { category: cat, limit }]
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

    processRecurrentes: () => {
      const { recurrentes, txs } = get()
      const today = new Date()
      const todayD = today.getDate()
      const todayStr = localISO(today)
      const newTxs: Tx[] = []

      recurrentes.filter(r => r.active).forEach(r => {
        const keyM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
        const alreadyAdded = txs.some(t =>
          t.date.startsWith(keyM) &&
          t.concept === r.concept &&
          t.category === r.category &&
          t.type === r.type
        )
        if (r.day <= todayD && !alreadyAdded) {
          newTxs.push({
            id: nextTxId([...newTxs, ...txs]),
            concept: r.concept,
            amount: r.amount,
            type: r.type,
            category: r.category,
            date: todayStr,
            note: '(recurrente)',
          })
        }
      })

      if (newTxs.length > 0) {
        const updated = [...newTxs, ...txs]
        saveToStorage('finances_tx', updated)
        set({ txs: updated })
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
  finances_properties: () => useFinanceStore.setState({ properties: loadFromStorage('finances_properties', []) }),
})
