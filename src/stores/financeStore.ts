import { create } from 'zustand'

function load<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback } catch { return fallback }
}
function save(key: string, val: unknown) { localStorage.setItem(key, JSON.stringify(val)) }

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

export const CAT_META: Record<string, { icon: string; color: string; type: string }> = {
  'Nómina':          { icon:'💼', color:'#52b788', type:'income' },
  'Freelance':       { icon:'💻', color:'#52b788', type:'income' },
  'Otros ingresos':  { icon:'📥', color:'#52b788', type:'income' },
  'Vivienda':        { icon:'🏠', color:'#5b8af0', type:'expense' },
  'Alimentación':    { icon:'🛒', color:'#c9a84c', type:'expense' },
  'Transporte':      { icon:'🚗', color:'#9b7fe0', type:'expense' },
  'Salud':           { icon:'💊', color:'#52b788', type:'expense' },
  'Ocio':            { icon:'🎬', color:'#e07a5f', type:'expense' },
  'Ropa':            { icon:'👕', color:'#c9a84c', type:'expense' },
  'Suscripciones':   { icon:'📱', color:'#9b7fe0', type:'expense' },
  'Deporte':         { icon:'🏋️', color:'#e07a5f', type:'expense' },
  'Restaurantes':    { icon:'🍽️', color:'#e07a5f', type:'expense' },
  'Viajes':          { icon:'✈️', color:'#5b8af0', type:'expense' },
  'Educación':       { icon:'📚', color:'#5b8af0', type:'expense' },
  'Ahorro':          { icon:'🏦', color:'#c9a84c', type:'expense' },
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
  addTx: (tx: Tx) => void
  removeTx: (idx: number) => void
  addHucha: (h: Hucha) => void
  aportarHucha: (i: number, amount: number) => void
  removeHucha: (i: number) => void
  addPufo: (p: Pufo) => void
  settlePufo: (idx: number) => void
  removePufo: (idx: number) => void
  saveCuenta: (c: Cuenta, editIdx?: number | null) => void
  removeCuenta: (idx: number) => void
}

export const useFinanceStore = create<FinanceStore>((set, get) => ({
  txs: load('finances_tx', []),
  huchas: load('finances_huchas', []),
  pufos: load('finances_pufos', []),
  cuentas: load('finances_cuentas', []),

  addTx: (tx) => {
    const txs = [{ ...tx, id: Date.now() }, ...get().txs]
    save('finances_tx', txs)
    set({ txs })
  },
  removeTx: (idx) => {
    const txs = get().txs.filter((_, i) => i !== idx)
    save('finances_tx', txs)
    set({ txs })
  },
  addHucha: (h) => {
    const huchas = [...get().huchas, h]
    save('finances_huchas', huchas)
    set({ huchas })
  },
  aportarHucha: (i, amount) => {
    const huchas = [...get().huchas]
    huchas[i] = { ...huchas[i], current: Math.min(huchas[i].current + amount, huchas[i].goal * 10) }
    save('finances_huchas', huchas)
    set({ huchas })
  },
  removeHucha: (i) => {
    const huchas = get().huchas.filter((_, idx) => idx !== i)
    save('finances_huchas', huchas)
    set({ huchas })
  },
  addPufo: (p) => {
    const pufos = [...get().pufos, p]
    save('finances_pufos', pufos)
    set({ pufos })
  },
  settlePufo: (idx) => {
    const pufos = [...get().pufos]
    pufos[idx] = { ...pufos[idx], settled: true, settledDate: new Date().toISOString().slice(0, 10) }
    save('finances_pufos', pufos)
    set({ pufos })
  },
  removePufo: (idx) => {
    const pufos = get().pufos.filter((_, i) => i !== idx)
    save('finances_pufos', pufos)
    set({ pufos })
  },
  saveCuenta: (c, editIdx) => {
    const cuentas = [...get().cuentas]
    if (editIdx != null) cuentas[editIdx] = c
    else cuentas.push(c)
    save('finances_cuentas', cuentas)
    set({ cuentas })
  },
  removeCuenta: (idx) => {
    const cuentas = get().cuentas.filter((_, i) => i !== idx)
    save('finances_cuentas', cuentas)
    set({ cuentas })
  },
}))
