import { create } from 'zustand'

function load<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback } catch { return fallback }
}
function save(key: string, val: unknown) { localStorage.setItem(key, JSON.stringify(val)) }

export interface Tx { id?: number; date: string; amount: number; type: 'income' | 'expense'; category: string; description: string }
export interface Hucha { name: string; target: number; current: number; color: string }
export interface Pufo { name: string; total: number; paid: number; creditor: string }

interface FinanceStore {
  txs: Tx[]
  huchas: Hucha[]
  pufos: Pufo[]
  addTx: (tx: Tx) => void
  removeTx: (idx: number) => void
  addHucha: (h: Hucha) => void
  updateHucha: (name: string, amount: number) => void
  removeHucha: (idx: number) => void
  addPufo: (p: Pufo) => void
  updatePufo: (name: string, amount: number) => void
  removePufo: (idx: number) => void
}

export const useFinanceStore = create<FinanceStore>((set) => ({
  txs: load('finances_tx', []),
  huchas: load('finances_huchas', []),
  pufos: load('finances_pufos', []),

  addTx: (tx) => set(state => {
    const txs = [{ ...tx, id: Date.now() }, ...state.txs]
    save('finances_tx', txs)
    return { txs }
  }),

  removeTx: (idx) => set(state => {
    const txs = state.txs.filter((_, i) => i !== idx)
    save('finances_tx', txs)
    return { txs }
  }),

  addHucha: (h) => set(state => {
    const huchas = [...state.huchas, h]
    save('finances_huchas', huchas)
    return { huchas }
  }),

  updateHucha: (name, amount) => set(state => {
    const huchas = state.huchas.map(h => h.name === name ? { ...h, current: h.current + amount } : h)
    save('finances_huchas', huchas)
    return { huchas }
  }),

  removeHucha: (idx) => set(state => {
    const huchas = state.huchas.filter((_, i) => i !== idx)
    save('finances_huchas', huchas)
    return { huchas }
  }),

  addPufo: (p) => set(state => {
    const pufos = [...state.pufos, p]
    save('finances_pufos', pufos)
    return { pufos }
  }),

  updatePufo: (name, amount) => set(state => {
    const pufos = state.pufos.map(p => p.name === name ? { ...p, paid: p.paid + amount } : p)
    save('finances_pufos', pufos)
    return { pufos }
  }),

  removePufo: (idx) => set(state => {
    const pufos = state.pufos.filter((_, i) => i !== idx)
    save('finances_pufos', pufos)
    return { pufos }
  }),
}))
