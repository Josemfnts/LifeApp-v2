// Cuotas mensuales de proyecto (Contabilidad por proyecto, F7): lo que cada cliente le TIENE
// que pagar a Josema. Una cuota NO se apunta sola como ingreso (haría creer al patrimonio
// que entró dinero que no ha llegado): genera un PENDIENTE de cobro (Pufo me_debe con su
// project) y el botón "Cobrar" de F4 lo convierte en ingreso real cuando entra.
//
// Este módulo es PURO: decide qué pendientes faltan, no escribe. El id del pufo y los
// `lastRun` los actualiza el store. El calendario reutiliza `occurrences()` de `recurring.ts`
// (ya probada: día recortado a fin de mes, mensual/anual, nunca antes de `startDate`).

import type { Pufo, Recurrente } from './types.ts'
import { projectLabel } from './projects.ts'
import { occurrences } from './recurring.ts'
import { fromCents, toCents } from './money.ts'

export interface Quota {
  id: number
  project: string                   // ProjectId (string suelto: el catálogo es vivo)
  amount: number                    // euros
  day: number                       // día del mes (1-31, recortado a fin de mes)
  freq?: 'monthly' | 'yearly'       // sin freq = mensual
  startDate: string                 // YYYY-MM-DD: desde cuándo se cobra
  active: boolean
  concept?: string                  // por defecto "Cuota <Proyecto>"
  lastRun?: string                  // última ocurrencia ya generada (YYYY-MM-DD)
}

export interface QuotaRun {
  // Pufos que faltan, en orden de fecha. SIN id (lo pone el store con el mismo patrón que
  // nextTxId / nextPufoId). El resto de campos van listos para que `addPufo` los acepte tal cual.
  pufos: Omit<Pufo, 'id'>[]
  // Mapa id-cuota → fecha de la última ocurrencia generada. Vacío si no se ha generado nada
  // (así abrir la app 10 veces con todo al día no produce escrituras en `finances_quotas` ni
  // ruido en el espejo vivo).
  lastRunByQuota: Record<number, string>
}

// Tope de seguridad por cuota y pasada: una fecha de inicio antigua no puede inundar la app de
// pendientes. Cuando hay más de MAX_OCCURRENCES fechas candidatas, nos quedamos con las últimas.
const MAX_OCCURRENCES = 24

// Mes en formato YYYY-MM a partir de un YYYY-MM-DD.
function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

// Adapta una Quota al shape mínimo de Recurrente que necesita `occurrences()`. Es solo un
// vehículo para reutilizar el calendario ya probado; no se ejecuta ninguna lógica de recurrentes.
function asRecurrenteLike(q: Quota): Recurrente {
  return {
    id: q.id,
    concept: q.concept ?? '',
    amount: q.amount,
    type: 'income',
    category: '',
    day: q.day,
    active: q.active,
    freq: q.freq ?? 'monthly',
    startDate: q.startDate,
  }
}

export function dueQuotaPufos(quotas: readonly Quota[], pufos: readonly Pufo[], todayISO: string): QuotaRun {
  const out: Omit<Pufo, 'id'>[] = []
  const lastRunByQuota: Record<number, string> = {}

  for (const q of quotas) {
    if (!q.active) continue

    // De qué meses YA hay pendiente de ESTA cuota (cinturón contra duplicados). Un pufo sin
    // quotaId (anotado a mano) NO bloquea: solo cuentan los de esta cuota, estén cobrados o no.
    const blockedMonths = new Set<string>()
    for (const p of pufos) {
      if (p.quotaId === q.id) blockedMonths.add(monthKey(p.date))
    }

    // Rango a generar: si hay lastRun, desde el día siguiente; si no, desde startDate. Nunca
    // del futuro (recortamos a todayISO).
    const fromISO = q.lastRun ? addOneDay(q.lastRun) : q.startDate
    if (fromISO > todayISO) continue

    const candidate = occurrences(asRecurrenteLike(q), fromISO, todayISO)
    // Tope de 24: si hay más, nos quedamos con las últimas.
    const kept = candidate.length > MAX_OCCURRENCES ? candidate.slice(-MAX_OCCURRENCES) : candidate

    const projectLbl = projectLabel(q.project)
    const fallbackConcept = `Cuota ${projectLbl}`.trim() || 'Cuota'

    const generated: Omit<Pufo, 'id'>[] = []
    for (const d of kept) {
      if (blockedMonths.has(monthKey(d))) continue
      generated.push({
        who: projectLbl,
        person: projectLbl,
        amount: q.amount,
        dir: 'me_debe',
        reason: '',
        concept: q.concept ?? fallbackConcept,
        date: d,
        settled: false,
        quotaId: q.id,
        project: q.project,
      })
    }

    if (generated.length > 0) {
      out.push(...generated)
      // lastRun = la última fecha efectivamente generada (no la candidata si el cinturón la filtró)
      lastRunByQuota[q.id] = generated[generated.length - 1].date
    }
  }

  return { pufos: out, lastRunByQuota }
}

// Suma un día a una fecha YYYY-MM-DD, devolviendo YYYY-MM-DD. Usa el mismo truco UTC que
// `addDaysISO` de recurring.ts (el mes se ajusta solo: 31 + 1 → mes siguiente día 1).
function addOneDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + 1))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}

// Total mensual previsto: suma de cuotas activas, con las anuales repartidas entre 12. Se hace
// en céntimos para evitar arrastre de coma flotante: si en el futuro hay cuotas con importes
// no divisibles entre 12, el redondeo se hace UNA vez al final (sobre el total, no cuota a
// cuota), que es el comportamiento que el usuario espera ver.
export function quotaMonthlyTotal(quotas: readonly Quota[]): number {
  let totalC = 0
  for (const q of quotas) {
    if (!q.active) continue
    const cents = toCents(q.amount)
    const monthlyC = q.freq === 'yearly' ? Math.round(cents / 12) : cents
    totalC += monthlyC
  }
  return fromCents(totalC)
}