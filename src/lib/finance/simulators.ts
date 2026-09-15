// Simuladores: puramente locales, útiles sin haber metido ni un dato.
import { monthlyPayment, schedule, type ScheduleRow } from './debts.ts'
import { toCents, fromCents } from './money.ts'

export const DISCLAIMER = 'Herramienta orientativa basada en tus datos. No es asesoramiento financiero ni garantía de aprobación bancaria.'

export interface LoanSimulation {
  payment: number
  totalInterest: number
  openingFee: number
  totalCost: number // capital + intereses + comisión de apertura
  schedule: ScheduleRow[]
}

export function simulateLoan(p: { amount: number; years: number; tin: number; openingFeePct?: number; startDate?: string }): LoanSimulation {
  const n = Math.max(0, Math.round(p.years * 12))
  const rows = schedule(p.amount, p.tin, n, p.startDate ?? '2026-01-01')
  const interestC = rows.reduce((s, r) => s + toCents(r.interest), 0)
  const feeC = Math.round(toCents(p.amount) * (p.openingFeePct ?? 0))
  return {
    payment: monthlyPayment(p.amount, p.tin, n),
    totalInterest: fromCents(interestC),
    openingFee: fromCents(feeC),
    totalCost: fromCents(toCents(p.amount) + interestC + feeC),
    schedule: rows,
  }
}

export interface MortgageSimulation {
  loan: number
  payment: number
  purchaseCosts: number
  upfrontCash: number // entrada + gastos de compra
  totalInterest: number
  nwBefore: number
  nwAfter: number
  debtToAssetsBefore: number | null
  debtToAssetsAfter: number | null
  paymentToIncome: number | null
  liquidAfter: number
  canAfford: boolean
}

// Lo que diferencia esto de una calculadora: el impacto en TU patrimonio. La entrada y el préstamo solo
// cambian de forma (dinero → casa, casa ↔ deuda); lo que se pierde de verdad son los gastos de compra.
export function simulateMortgage(p: {
  price: number
  downPayment: number
  years: number
  tin: number
  purchaseCostsPct?: number
  netWorth: number
  liquid: number
  totalAssets: number
  totalDebt: number
  monthlyIncome?: number
}): MortgageSimulation {
  const priceC = toCents(p.price)
  const downC = Math.min(toCents(p.downPayment), priceC)
  const loanC = priceC - downC
  const n = Math.max(0, Math.round(p.years * 12))
  const loan = fromCents(loanC)
  const rows = schedule(loan, p.tin, n, '2026-01-01')
  const payment = monthlyPayment(loan, p.tin, n)
  const costsC = Math.round(priceC * (p.purchaseCostsPct ?? 0.1))
  const upfrontC = downC + costsC
  const assetsBeforeC = toCents(p.totalAssets)
  const debtBeforeC = toCents(p.totalDebt)
  const assetsAfterC = assetsBeforeC - upfrontC + priceC
  const debtAfterC = debtBeforeC + loanC
  const paymentToIncome = p.monthlyIncome && p.monthlyIncome > 0 ? payment / p.monthlyIncome : null
  const liquidAfter = fromCents(toCents(p.liquid) - upfrontC)
  return {
    loan,
    payment,
    purchaseCosts: fromCents(costsC),
    upfrontCash: fromCents(upfrontC),
    totalInterest: fromCents(rows.reduce((s, r) => s + toCents(r.interest), 0)),
    nwBefore: p.netWorth,
    nwAfter: fromCents(toCents(p.netWorth) - costsC),
    debtToAssetsBefore: assetsBeforeC > 0 ? debtBeforeC / assetsBeforeC : null,
    debtToAssetsAfter: assetsAfterC > 0 ? debtAfterC / assetsAfterC : null,
    paymentToIncome,
    liquidAfter,
    canAfford: liquidAfter >= 0 && (paymentToIncome === null || paymentToIncome <= 0.35),
  }
}

export interface SavingsPoint {
  year: number
  contributed: number
  value: number
  realValue: number // descontando la inflación
}

// Capitalización mensual (igual que el cálculo histórico de Análisis).
export function simulateSavings(p: { initial: number; monthly: number; annualReturn: number; years: number; inflation?: number }): SavingsPoint[] {
  const r = p.annualReturn / 12
  const inflation = p.inflation ?? 0
  let total = p.initial
  let contributed = p.initial
  const points: SavingsPoint[] = [{ year: 0, contributed: p.initial, value: p.initial, realValue: p.initial }]
  const years = Math.max(0, Math.round(p.years))
  for (let month = 1; month <= years * 12; month++) {
    total = total * (1 + r) + p.monthly
    contributed += p.monthly
    if (month % 12 === 0) {
      const year = month / 12
      points.push({
        year,
        contributed: fromCents(toCents(contributed)),
        value: fromCents(Math.round(total * 100)),
        realValue: fromCents(Math.round((total / Math.pow(1 + inflation, year)) * 100)),
      })
    }
  }
  return points
}
