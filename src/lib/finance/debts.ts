// Deudas con cuota francesa (la de las hipotecas y préstamos españoles). Todo en céntimos.
// Al pagar una cuota solo los intereses son gasto; el capital baja la deuda y el patrimonio no cambia.
import { toCents, fromCents } from './money.ts'
import { addMonthsISO } from './dates.ts'

export type DebtKind = 'mortgage' | 'loan' | 'card' | 'personal'

export interface DebtPayment {
  id: string
  date: string
  total: number
  interest: number
  principal: number
  extra?: boolean
  monthsSaved?: number // amortización anticipada en modo "reducir plazo": meses que quita al plazo
  linkId?: string // une el pago con sus movimientos: borrar el movimiento deshace el pago
}

export interface Debt {
  id: string
  name: string
  kind: DebtKind
  principal: number // importe original (euros, positivo)
  balance: number // pendiente HOY
  annualRate: number // 0.0325 = 3,25 % TIN
  rateType: 'fixed' | 'variable'
  euribor?: number
  spread?: number
  reviewMonth?: number
  termMonths: number
  startDate: string
  paymentDay: number
  cuenta?: string
  propertyId?: string
  includeInNw?: boolean
  payments: DebtPayment[]
}

export function effectiveRate(d: Pick<Debt, 'rateType' | 'annualRate' | 'euribor' | 'spread'>): number {
  return d.rateType === 'variable' ? (d.euribor ?? 0) + (d.spread ?? 0) : d.annualRate
}

// Cuota = P·i / (1 − (1+i)^−n), i = TIN/12. Sin interés, P/n.
export function monthlyPayment(principal: number, annualRate: number, months: number): number {
  const pc = toCents(principal)
  if (months <= 0 || pc <= 0) return fromCents(Math.max(pc, 0))
  const i = annualRate / 12
  if (i === 0) return fromCents(Math.round(pc / months))
  return fromCents(Math.round((pc * i) / (1 - Math.pow(1 + i, -months))))
}

export interface ScheduleRow {
  n: number
  date: string
  payment: number
  interest: number
  principal: number
  balance: number
}

// Cuadro de amortización. La última cuota se ajusta para dejar el saldo exactamente a 0.
export function schedule(principal: number, annualRate: number, months: number, startDate: string, paymentDay?: number): ScheduleRow[] {
  const rows: ScheduleRow[] = []
  let bal = toCents(principal)
  if (months <= 0 || bal <= 0) return rows
  const payC = toCents(monthlyPayment(principal, annualRate, months))
  const i = annualRate / 12
  const base = paymentDay ? `${startDate.slice(0, 8)}${String(Math.min(paymentDay, 31)).padStart(2, '0')}` : startDate
  for (let k = 1; k <= months && bal > 0; k++) {
    const interestC = Math.round(bal * i)
    let principalC = payC - interestC
    if (k === months || principalC > bal) principalC = bal
    if (principalC < 0) principalC = 0
    bal -= principalC
    rows.push({
      n: k,
      date: addMonthsISO(base, k),
      payment: fromCents(principalC + interestC),
      interest: fromCents(interestC),
      principal: fromCents(principalC),
      balance: fromCents(bal),
    })
  }
  return rows
}

export function remainingMonths(
  d: Pick<Debt, 'startDate' | 'termMonths' | 'balance'> & { payments?: DebtPayment[] },
  todayISO: string,
): number {
  const [sy, sm, sd] = d.startDate.split('-').map(Number)
  const [ty, tm, td] = todayISO.split('-').map(Number)
  let elapsed = (ty - sy) * 12 + (tm - sm)
  if (td < sd) elapsed -= 1
  // Las cuotas pagadas consumen plazo aunque se paguen antes de su fecha (las amortizaciones
  // anticipadas no): si no, pagar la cuota del mes recalcularía sobre el plazo entero y bajaría cada vez.
  const paid = (d.payments ?? []).filter(p => !p.extra).length
  // "Reducir plazo" acorta el plazo y la cuota se mantiene; sin monthsSaved la amortización reduce la cuota.
  const saved = (d.payments ?? []).reduce((s, p) => s + (p.extra && p.monthsSaved ? p.monthsSaved : 0), 0)
  const remaining = d.termMonths - Math.max(0, elapsed, paid) - saved
  return toCents(d.balance) > 0 ? Math.max(1, remaining) : Math.max(0, remaining)
}

export interface PaymentSplit {
  total: number
  interest: number
  principal: number
}

export function nextPaymentSplit(d: Debt, todayISO: string): PaymentSplit {
  const balC = toCents(d.balance)
  if (balC <= 0) return { total: 0, interest: 0, principal: 0 }
  const rate = effectiveRate(d)
  const n = remainingMonths(d, todayISO)
  const payC = toCents(monthlyPayment(d.balance, rate, n))
  const interestC = Math.round(balC * (rate / 12))
  let principalC = payC - interestC
  if (n <= 1 || principalC > balC) principalC = balC
  if (principalC < 0) principalC = 0
  return { total: fromCents(principalC + interestC), interest: fromCents(interestC), principal: fromCents(principalC) }
}

export interface ExtraSimulation {
  newPayment: number
  newMonths: number
  interestSaved: number
  monthsSaved: number
}

function totalInterestC(rows: ScheduleRow[]): number {
  return rows.reduce((s, r) => s + toCents(r.interest), 0)
}

// Amortización anticipada: reducir plazo (misma cuota, menos meses) o reducir cuota (mismo plazo).
export function simulateExtra(d: Debt, amount: number, mode: 'reduce_term' | 'reduce_payment', todayISO: string): ExtraSimulation {
  const rate = effectiveRate(d)
  const n = remainingMonths(d, todayISO)
  const baseRows = schedule(d.balance, rate, n, todayISO)
  const baseInterestC = totalInterestC(baseRows)
  const basePayC = toCents(monthlyPayment(d.balance, rate, n))
  const newBalC = Math.max(0, toCents(d.balance) - toCents(amount))
  if (newBalC === 0) {
    return { newPayment: 0, newMonths: 0, interestSaved: fromCents(baseInterestC), monthsSaved: n }
  }
  if (mode === 'reduce_payment') {
    const rows = schedule(fromCents(newBalC), rate, n, todayISO)
    return {
      newPayment: monthlyPayment(fromCents(newBalC), rate, n),
      newMonths: n,
      interestSaved: fromCents(baseInterestC - totalInterestC(rows)),
      monthsSaved: 0,
    }
  }
  const i = rate / 12
  let bal = newBalC
  let months = 0
  let interestC = 0
  while (bal > 0 && months < n) {
    const intC = Math.round(bal * i)
    let princC = basePayC - intC
    if (princC <= 0) break
    if (princC > bal) princC = bal
    bal -= princC
    interestC += intC
    months += 1
  }
  return {
    newPayment: fromCents(basePayC),
    newMonths: months,
    interestSaved: fromCents(baseInterestC - interestC),
    monthsSaved: n - months,
  }
}
