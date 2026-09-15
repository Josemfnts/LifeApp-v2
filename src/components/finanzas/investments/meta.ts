import type { Holding, HoldingKind, ResolvedPrice } from '@/lib/finance/investments'

export const KIND_META: Record<HoldingKind, { label: string; icon: string }> = {
  stock: { label: 'Acción', icon: '📊' },
  etf: { label: 'ETF', icon: '🧺' },
  fund: { label: 'Fondo', icon: '🏛️' },
  crypto: { label: 'Cripto', icon: '🪙' },
  bond: { label: 'Bono', icon: '📜' },
  other: { label: 'Otro', icon: '💼' },
}

const SHORT_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function shortDay(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  return Number.isNaN(d.getTime()) ? '' : `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`
}

// Marca de frescura del precio: nunca se oculta de dónde sale el número.
export function freshnessLabel(p: ResolvedPrice): { text: string; tone: 'ok' | 'warn' | 'dim' } {
  if (p.source === 'live') return p.stale ? { text: `último en vivo · ${shortDay(p.asOf)}`, tone: 'warn' } : { text: '● en vivo', tone: 'ok' }
  if (p.source === 'manual') return { text: `manual · ${shortDay(p.asOf) || 'sin fecha'}${p.stale ? ' · antiguo' : ''}`, tone: p.stale ? 'warn' : 'dim' }
  return { text: 'sin precio · a coste', tone: 'dim' }
}

export function toneColor(tone: 'ok' | 'warn' | 'dim'): string {
  return tone === 'ok' ? 'var(--color-acc-green)' : tone === 'warn' ? 'var(--color-acc-gold)' : 'var(--color-dim)'
}

export function holdingIcon(h: Holding): string {
  return KIND_META[h.kind]?.icon ?? '💼'
}
