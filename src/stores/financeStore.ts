import { saveToStorage, loadFromStorage } from '@/lib/storage'
import { create } from 'zustand'
import { onRemoteChange } from '@/lib/mirror'
import { addEuros } from '@/lib/finance/money'
import { localISO } from '@/lib/finance/dates'
import { computeNetWorth } from '@/lib/finance/networth'
import { upsertTodaySnapshot, backfillEstimated, type NwSnapshot } from '@/lib/finance/snapshots'
import { buildAdjustment, buildTransfer } from '@/lib/finance/ops'

export type { Tx, TxKind, Hucha, Pufo, Cuenta, Presupuesto, Recurrente } from '@/lib/finance/types'
import type { Tx, Hucha, Pufo, Cuenta, Presupuesto, Recurrente } from '@/lib/finance/types'

export const CAT_META: Record<string, { icon: string; color: string; type: string }> = {
  'Nómina':          { icon:'💼', color:'var(--color-acc-green)', type:'income' },
  'Freelance':       { icon:'💻', color:'var(--color-acc-green)', type:'income' },
  'Otros ingresos':  { icon:'📥', color:'var(--color-acc-green)', type:'income' },
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
  addTx: (tx: Tx) => void
  removeTx: (idx: number) => void
  updateTx: (idx: number, tx: Partial<Tx>) => void
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
  adjustBalance: (cuentaName: string, newBalance: number, date?: string) => void
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

    recordSnapshot: () => {
      const { snapshots, cuentas, txs } = get()
      let current = snapshots
      if (current.length === 0 && cuentas.length > 0) {
        current = backfillEstimated(cuentas, txs, localISO(), 12)
      }
      const b = computeNetWorth(cuentas)
      const r = upsertTodaySnapshot(current, localISO(), b)
      if (r.changed) {
        saveToStorage('finances_nw_snapshots', r.snaps)
        set({ snapshots: r.snaps })
      }
    },

    addTx: (tx) => {
      const stamped: Tx = { ...tx, id: Date.now() }
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
            id: Date.now() + Math.random(),
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

    adjustBalance: (cuentaName, newBalance, date) => {
      const cuenta = get().cuentas.find(c => c.name === cuentaName)
      if (!cuenta) return
      const tx = buildAdjustment(cuenta, newBalance, date ?? localISO())
      if (!tx) return
      get().addTx(tx)
    },

    addTransfer: (from, to, amount, date, concept) => {
      const [fromTx, toTx] = buildTransfer(from, to, amount, date, concept)
      const stampedFrom: Tx = { ...fromTx, id: Date.now() }
      const stampedTo: Tx = { ...toTx, id: Date.now() + 1 }
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
})
