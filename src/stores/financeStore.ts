import { saveToStorage, loadFromStorage } from '@/lib/storage'
import { create } from 'zustand'

export interface Tx {
  id?: number
  date: string
  amount: number
  type: 'income' | 'expense'
  category: string
  concept: string
  note: string
}
export interface Hucha {
  name: string
  goal: number
  current: number
  emoji: string
  deadline: string
  color: string
}
export interface Pufo {
  id: number
  who: string
  person: string
  amount: number
  dir: 'me_debe' | 'le_debo'
  reason: string
  concept: string
  date: string
  settled: boolean
  settledDate?: string
}
export interface Cuenta {
  name: string
  type: string
  balance: number
  color: string
  note: string
  updatedAt: string
}

export interface Presupuesto {
  category: string
  limit: number
}

export interface Recurrente {
  id: number
  concept: string
  amount: number
  type: 'income' | 'expense'
  category: string
  day: number
  active: boolean
}

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
}

export const useFinanceStore = create<FinanceStore>((set, get) => ({
  txs: loadFromStorage('finances_tx', []),
  huchas: loadFromStorage('finances_huchas', []),
  pufos: loadFromStorage('finances_pufos', []),
  cuentas: loadFromStorage('finances_cuentas', []),
  presupuestos: loadFromStorage('finances_budgets', []),
  recurrentes: loadFromStorage('finances_recurring', []),

  addTx: (tx) => {
    const txs = [{ ...tx, id: Date.now() }, ...get().txs]
    saveToStorage('finances_tx', txs)
    set({ txs })
  },
  removeTx: (idx) => {
    const txs = get().txs.filter((_, i) => i !== idx)
    saveToStorage('finances_tx', txs)
    set({ txs })
  },
  updateTx: (idx, partial) => {
    const txs = [...get().txs]
    txs[idx] = { ...txs[idx], ...partial }
    saveToStorage('finances_tx', txs)
    set({ txs })
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
    pufos[idx] = { ...pufos[idx], settled: true, settledDate: new Date().toISOString().slice(0, 10) }
    saveToStorage('finances_pufos', pufos)
    set({ pufos })
  },
  removePufo: (idx) => {
    const pufos = get().pufos.filter((_, i) => i !== idx)
    saveToStorage('finances_pufos', pufos)
    set({ pufos })
  },
  saveCuenta: (c, editIdx) => {
    const cuentas = [...get().cuentas]
    if (editIdx != null) cuentas[editIdx] = c
    else cuentas.push(c)
    saveToStorage('finances_cuentas', cuentas)
    set({ cuentas })
  },
  removeCuenta: (idx) => {
    const cuentas = get().cuentas.filter((_, i) => i !== idx)
    saveToStorage('finances_cuentas', cuentas)
    set({ cuentas })
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
    const todayStr = new Date().toISOString().slice(0, 10)
    const newTxs: Tx[] = []

    recurrentes.filter(r => r.active).forEach(r => {
      // Check if this recurring tx was already added this month
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
          note: '(recurrente)'
        })
      }
    })

    if (newTxs.length > 0) {
      const updated = [...newTxs, ...txs]
      saveToStorage('finances_tx', updated)
      set({ txs: updated })
    }
    return newTxs
  },
}))
