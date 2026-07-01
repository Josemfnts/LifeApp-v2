import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { getItem, setItem } from '@/lib/storage'
import type { XPArea, AreaStat, XPEntry } from '@/types'

interface XPState {
  xp: Record<AreaStat, XPArea>
  awardXP: (stat: AreaStat, amount: number, concept: string, date: string) => void
  getAreaXP: (stat: AreaStat) => XPArea
}

const defaultXP: Record<AreaStat, XPArea> = {
  disc: { total: 0, log: [] },
  fuerza: { total: 0, log: [] },
  intel: { total: 0, log: [] },
  riqueza: { total: 0, log: [] },
}

const XPContext = createContext<XPState | null>(null)

export function XPProvider({ children }: { children: ReactNode }) {
  const [xp, setXp] = useState<Record<AreaStat, XPArea>>(() =>
    getItem('xp', defaultXP)
  )

  const awardXP = useCallback((stat: AreaStat, amount: number, concept: string, date: string) => {
    setXp(prev => {
      const area = { ...prev[stat], total: prev[stat].total + amount }
      const entry: XPEntry = { amount, concept, date }
      area.log = [entry, ...area.log].slice(0, 50)
      const next = { ...prev, [stat]: area }
      setItem('xp', next)
      return next
    })
  }, [])

  const getAreaXP = useCallback((stat: AreaStat) => {
    return xp[stat]
  }, [xp])

  return (
    <XPContext.Provider value={{ xp, awardXP, getAreaXP }}>
      {children}
    </XPContext.Provider>
  )
}

export function useXP() {
  const ctx = useContext(XPContext)
  if (!ctx) throw new Error('useXP must be used within XPProvider')
  return ctx
}
