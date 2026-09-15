export function toCents(eur: number): number {
  if (!Number.isFinite(eur)) return 0
  const sign = eur < 0 ? -1 : 1
  // toFixed(10) y no toString(): toString usa notación exponencial para residuos de coma
  // flotante (0.1 + 0.2 - 0.3 = 5.55e-17 → "5.55…e-17") y los convertiría en 5,56 €.
  const absStr = Math.abs(eur).toFixed(10)
  const dotIdx = absStr.indexOf('.')
  const intPart = dotIdx < 0 ? absStr : absStr.slice(0, dotIdx)
  const decPartRaw = dotIdx < 0 ? '' : absStr.slice(dotIdx + 1)
  const decPart = (decPartRaw + '000').slice(0, 3)
  const digit3 = Number(decPart.charAt(2) || '0')
  let cents = Number(intPart) * 100 + Number(decPart.slice(0, 2))
  if (digit3 >= 5) cents += 1
  return cents === 0 ? 0 : sign * cents
}

// Importe en formato español o inglés: "12,5", "1.234,56", "1,234.56", "1234.56", "1.234.567",
// "12,00 €", "12,00 EUR", y negativos como "-12,30", "(12,00)" o "12,00-". Si aparecen punto y coma,
// el último que aparece es el decimal. Devuelve NaN si no es un número.
export function parseEuroInput(s: string): number {
  let t = (s ?? '').replace(/€|EUR|\s/gi, '')
  if (!t) return NaN
  let negative = false
  if (t.startsWith('(') && t.endsWith(')')) {
    negative = true
    t = t.slice(1, -1)
  } else if (t.length > 1 && t.endsWith('-')) {
    negative = true
    t = t.slice(0, -1)
  }
  const lastComma = t.lastIndexOf(',')
  const lastDot = t.lastIndexOf('.')
  if (lastComma >= 0 && lastDot >= 0) {
    t = lastComma > lastDot ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '')
  } else if (lastComma >= 0) {
    t = t.replace(',', '.')
  } else if (/^[+-]?\d{1,3}(\.\d{3}){2,}$/.test(t)) {
    t = t.replace(/\./g, '')
  }
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(t)) return NaN
  const n = Number(t)
  if (!Number.isFinite(n)) return NaN
  return negative ? -Math.abs(n) : n
}

export function fromCents(c: number): number {
  return Math.round(c) / 100
}

export function roundEuros(n: number): number {
  return fromCents(toCents(n))
}

export function addEuros(...ns: number[]): number {
  let total = 0
  for (const n of ns) total += toCents(n)
  return fromCents(total)
}

export function subEuros(a: number, b: number): number {
  return fromCents(toCents(a) - toCents(b))
}

export function sumEuros(ns: number[]): number {
  return addEuros(...ns)
}

export function splitCents(totalCents: number, weights: number[]): number[] {
  if (weights.length === 0) return []
  const totalWeight = weights.reduce((s, w) => s + w, 0)
  if (totalWeight <= 0) {
    return weights.map(() => 0)
  }
  const raw = weights.map(w => (totalCents * w) / totalWeight)
  const floored = raw.map(r => Math.trunc(r))
  let remainder = totalCents - floored.reduce((s, v) => s + v, 0)
  const result = [...floored]
  for (let i = 0; i < result.length && remainder !== 0; i++) {
    if (remainder > 0) {
      result[i] += 1
      remainder -= 1
    } else {
      result[i] -= 1
      remainder += 1
    }
  }
  return result
}
