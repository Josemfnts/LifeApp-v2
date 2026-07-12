// Importación de actividades desde fichero GPX/TCX (Físico > Running).
// Parseo 100% en cliente con DOMParser (sin dependencias). El corazón del
// parser (extractActivity) trabaja sobre un Document ya parseado para poder
// probarse de forma aislada; parseActivity es la puerta de entrada que usa el
// navegador. Mapea a RunRecord (clave localStorage `fisico_runs`).
import type { RunRecord } from '@/stores/fisicoStore'

export interface ParsedActivity {
  date: string // YYYY-MM-DD (primer punto/tiempo)
  distanceKm: number // distancia total en km
  timeSeconds: number // duración en segundos
  hr?: number // FC media (bpm)
  elevation?: number // desnivel positivo acumulado (m)
  points: number // nº de puntos/muestras leídos
}

const EARTH_M = 6371000

function toRad(d: number): number {
  return (d * Math.PI) / 180
}

// Distancia entre dos coordenadas (metros) — fórmula del haversine.
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(a)))
}

// Elementos descendientes por nombre local, ignorando el prefijo/namespace
// (los GPX/TCX usan namespaces por defecto y prefijos como `gpxtpx:`).
function tags(root: Element | Document, name: string): Element[] {
  const ns = (root as Element).getElementsByTagNameNS?.('*', name)
  if (ns && ns.length) return Array.from(ns)
  return Array.from(root.getElementsByTagName(name))
}

// Primer hijo DIRECTO por nombre local (evita capturar descendientes: p.ej. un
// Lap tiene su propio DistanceMeters pero también los de cada Trackpoint).
function directChild(el: Element, name: string): Element | null {
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType !== 1) continue
    const child = node as Element
    if (child.localName === name || child.tagName === name || child.nodeName === name) return child
  }
  return null
}

function num(el: Element | null | undefined): number | null {
  if (!el) return null
  const v = parseFloat((el.textContent || '').trim())
  return Number.isFinite(v) ? v : null
}

function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null
  const t = Date.parse(raw)
  if (Number.isNaN(t)) return null
  return new Date(t).toISOString().slice(0, 10)
}

// Suma de subidas de una serie de altitudes (desnivel positivo).
function positiveGain(values: number[]): number {
  let gain = 0
  for (let i = 1; i < values.length; i++) {
    const d = values[i] - values[i - 1]
    if (d > 0) gain += d
  }
  return gain
}

function average(values: number[]): number | undefined {
  if (!values.length) return undefined
  return values.reduce((s, v) => s + v, 0) / values.length
}

function extractGpx(doc: Document): ParsedActivity | null {
  const pts = tags(doc, 'trkpt')
  if (!pts.length) return null

  let distance = 0
  let prev: { lat: number; lon: number } | null = null
  const eles: number[] = []
  const hrs: number[] = []
  const times: number[] = []

  for (const pt of pts) {
    const lat = parseFloat(pt.getAttribute('lat') || '')
    const lon = parseFloat(pt.getAttribute('lon') || '')
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      if (prev) distance += haversine(prev.lat, prev.lon, lat, lon)
      prev = { lat, lon }
    }
    const ele = num(directChild(pt, 'ele'))
    if (ele !== null) eles.push(ele)
    const timeEl = directChild(pt, 'time')
    const t = timeEl ? Date.parse(timeEl.textContent || '') : NaN
    if (!Number.isNaN(t)) times.push(t)
    // FC en extensions: <gpxtpx:hr> o <hr>
    const hr = num(tags(pt, 'hr')[0])
    if (hr !== null) hrs.push(hr)
  }

  const timeSeconds = times.length >= 2 ? Math.round((Math.max(...times) - Math.min(...times)) / 1000) : 0
  const date = isoDate(directChild(pts[0], 'time')?.textContent) ?? new Date().toISOString().slice(0, 10)
  const hrAvg = average(hrs)
  const gain = positiveGain(eles)

  return {
    date,
    distanceKm: distance / 1000,
    timeSeconds,
    hr: hrAvg !== undefined ? Math.round(hrAvg) : undefined,
    elevation: gain > 0 ? Math.round(gain) : undefined,
    points: pts.length,
  }
}

function extractTcx(doc: Document): ParsedActivity | null {
  const laps = tags(doc, 'Lap')
  const trackpoints = tags(doc, 'Trackpoint')
  if (!laps.length && !trackpoints.length) return null

  let timeSeconds = 0
  let lapDistance = 0
  for (const lap of laps) {
    const secs = num(directChild(lap, 'TotalTimeSeconds'))
    if (secs !== null) timeSeconds += secs
    const dist = num(directChild(lap, 'DistanceMeters'))
    if (dist !== null) lapDistance += dist
  }

  const hrs: number[] = []
  const eles: number[] = []
  const cumulativeDist: number[] = []
  for (const tp of trackpoints) {
    const hrBpm = tags(tp, 'HeartRateBpm')[0]
    const hr = hrBpm ? num(directChild(hrBpm, 'Value')) : null
    if (hr !== null) hrs.push(hr)
    const alt = num(directChild(tp, 'AltitudeMeters'))
    if (alt !== null) eles.push(alt)
    const d = num(directChild(tp, 'DistanceMeters'))
    if (d !== null) cumulativeDist.push(d)
  }

  // Distancia: preferir la suma de los Lap; si no hay, usar la última
  // (mayor) DistanceMeters acumulada de los Trackpoint.
  const distanceMeters = lapDistance > 0 ? lapDistance : (cumulativeDist.length ? Math.max(...cumulativeDist) : 0)

  const firstTime = tags(doc, 'Time')[0]
  const date = isoDate(firstTime?.textContent) ?? new Date().toISOString().slice(0, 10)
  const hrAvg = average(hrs)
  const gain = positiveGain(eles)

  return {
    date,
    distanceKm: distanceMeters / 1000,
    timeSeconds: Math.round(timeSeconds),
    hr: hrAvg !== undefined ? Math.round(hrAvg) : undefined,
    elevation: gain > 0 ? Math.round(gain) : undefined,
    points: trackpoints.length,
  }
}

// Núcleo del parser: decide formato a partir del Document y extrae la actividad.
export function extractActivity(doc: Document): ParsedActivity | null {
  if (doc.getElementsByTagName('parsererror').length > 0) return null
  const root = doc.documentElement
  if (!root) return null
  const rootName = root.localName || root.nodeName
  if (rootName === 'gpx') return extractGpx(doc)
  if (rootName === 'TrainingCenterDatabase') return extractTcx(doc)
  // Fallback por contenido (algunos exportadores omiten el namespace raíz).
  if (tags(doc, 'trkpt').length) return extractGpx(doc)
  if (tags(doc, 'Trackpoint').length || tags(doc, 'Lap').length) return extractTcx(doc)
  return null
}

// Puerta de entrada del navegador: texto → Document → actividad.
export function parseActivity(text: string): ParsedActivity | null {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const parsed = extractActivity(doc)
  if (!parsed || (parsed.distanceKm <= 0 && parsed.timeSeconds <= 0)) return null
  return parsed
}

// Mapea la actividad parseada a un RunRecord listo para el store.
export function toRunRecord(a: ParsedActivity): RunRecord {
  return {
    date: a.date,
    distance: Math.round(a.distanceKm * 10) / 10,
    timeSeconds: a.timeSeconds,
    hr: a.hr,
    elevation: a.elevation,
    type: 'easy',
    notes: 'Importado (fichero)',
  }
}

// ¿Ya existe una carrera con la misma fecha y distancia (±0.1 km)?
export function isDuplicateRun(runs: RunRecord[], candidate: RunRecord): boolean {
  return runs.some(r => r.date === candidate.date && Math.abs(r.distance - candidate.distance) <= 0.1)
}
