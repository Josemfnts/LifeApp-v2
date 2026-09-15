// Precios de cripto en vivo con CoinGecko (sin clave, precios en EUR nativos) + caché solo local.
// Bolsa, ETF y fondos van con precio manual (ver .mapa/finanzas-margen/05-precios.md).
// Nada de aquí lanza a la UI: si la red, CORS o el límite de peticiones fallan, se devuelve vacío.
import { LOCAL_ONLY_KEYS } from '../storageKeys.ts'
import type { PriceCache } from './investments.ts'

export type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

export interface CoinHit {
  id: string
  name: string
  symbol: string
  thumb?: string
}

const BASE = 'https://api.coingecko.com/api/v3'
const TIMEOUT_MS = 8000
const CACHE_KEY = LOCAL_ONLY_KEYS.finances_price_cache

const defaultFetch: FetchLike = (url, init) => fetch(url, init)

async function getJson(url: string, fetchImpl: FetchLike, timeoutMs: number): Promise<unknown | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetchImpl(url, { signal: ctrl.signal })
    if (!res.ok) {
      console.warn(`[precios] ${url} → HTTP ${res.status}`)
      return null
    }
    return await res.json()
  } catch (e) {
    console.warn(`[precios] ${url} → ${e instanceof Error ? e.message : String(e)}`)
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchCryptoPrices(ids: string[], fetchImpl: FetchLike = defaultFetch, timeoutMs = TIMEOUT_MS): Promise<PriceCache> {
  const unique = [...new Set(ids.map(i => i.trim()).filter(Boolean))]
  if (unique.length === 0) return {}
  const url = `${BASE}/simple/price?ids=${unique.map(encodeURIComponent).join(',')}&vs_currencies=eur&include_24hr_change=true`
  const data = await getJson(url, fetchImpl, timeoutMs)
  if (!data || typeof data !== 'object') return {}
  const at = Date.now()
  const out: PriceCache = {}
  for (const [id, raw] of Object.entries(data as Record<string, { eur?: unknown; eur_24h_change?: unknown }>)) {
    if (typeof raw?.eur !== 'number' || !Number.isFinite(raw.eur)) continue
    out[id] = { eur: raw.eur, at, ...(typeof raw.eur_24h_change === 'number' ? { change24h: raw.eur_24h_change } : {}) }
  }
  return out
}

export async function searchCoins(q: string, fetchImpl: FetchLike = defaultFetch, timeoutMs = TIMEOUT_MS): Promise<CoinHit[]> {
  const query = q.trim()
  if (query.length < 2) return []
  const data = await getJson(`${BASE}/search?query=${encodeURIComponent(query)}`, fetchImpl, timeoutMs)
  const coins = (data as { coins?: unknown } | null)?.coins
  if (!Array.isArray(coins)) return []
  return coins
    .filter((c): c is { id: string; name: string; symbol: string; thumb?: unknown } =>
      !!c && typeof c.id === 'string' && typeof c.name === 'string' && typeof c.symbol === 'string')
    .slice(0, 8)
    .map(c => ({ id: c.id, name: c.name, symbol: c.symbol.toUpperCase(), ...(typeof c.thumb === 'string' ? { thumb: c.thumb } : {}) }))
}

export function loadPriceCache(): PriceCache {
  try {
    const raw = globalThis.localStorage?.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as PriceCache) : {}
  } catch {
    return {}
  }
}

// Fusiona precios nuevos con los guardados y los escribe SOLO en este dispositivo.
export function savePriceCache(update: PriceCache): PriceCache {
  const merged = { ...loadPriceCache(), ...update }
  try {
    globalThis.localStorage?.setItem(CACHE_KEY, JSON.stringify(merged))
  } catch {
    // Cuota llena o modo privado: la caché es prescindible, los precios se volverán a pedir.
  }
  return merged
}
