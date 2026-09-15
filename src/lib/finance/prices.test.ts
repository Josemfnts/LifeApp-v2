import test, { mock } from 'node:test'
import assert from 'node:assert/strict'
import { fetchCryptoPrices, searchCoins, loadPriceCache, savePriceCache, type FetchLike } from './prices.ts'

mock.method(console, 'warn', () => {})

const okJson = (body: unknown): FetchLike => async () => ({ ok: true, status: 200, json: async () => body })

test('fetchCryptoPrices: una sola llamada en lote, precios en EUR y variación 24h', async () => {
  const urls: string[] = []
  const fake: FetchLike = async (url) => {
    urls.push(url)
    return { ok: true, status: 200, json: async () => ({ bitcoin: { eur: 55000.5, eur_24h_change: -1.2 }, ethereum: { eur: 2400 }, rota: { usd: 1 } }) }
  }
  const r = await fetchCryptoPrices(['bitcoin', 'ethereum', 'bitcoin', ' ', 'rota'], fake)
  assert.equal(urls.length, 1)
  assert.match(urls[0], /ids=bitcoin,ethereum,rota&vs_currencies=eur/)
  assert.equal(r.bitcoin.eur, 55000.5)
  assert.equal(r.bitcoin.change24h, -1.2)
  assert.equal(r.ethereum.eur, 2400)
  assert.equal('change24h' in r.ethereum, false)
  assert.equal(r.rota, undefined)
})

test('fetchCryptoPrices: sin ids no llama a la red', async () => {
  let called = false
  assert.deepEqual(await fetchCryptoPrices([], async () => { called = true; throw new Error('no') }), {})
  assert.equal(called, false)
})

test('fetchCryptoPrices: 429, excepción de red y timeout devuelven vacío sin lanzar', async () => {
  assert.deepEqual(await fetchCryptoPrices(['bitcoin'], async () => ({ ok: false, status: 429, json: async () => ({}) })), {})
  assert.deepEqual(await fetchCryptoPrices(['bitcoin'], async () => { throw new TypeError('Failed to fetch') }), {})
  const hangs: FetchLike = (_url, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
  })
  const t0 = Date.now()
  assert.deepEqual(await fetchCryptoPrices(['bitcoin'], hangs, 20), {})
  assert.ok(Date.now() - t0 < 2000)
})

test('searchCoins: máximo 8, símbolo en mayúsculas, ignora entradas malformadas', async () => {
  const coins = Array.from({ length: 10 }, (_, i) => ({ id: `c${i}`, name: `Coin ${i}`, symbol: `c${i}`, thumb: `https://x/${i}.png` }))
  const r = await searchCoins('coin', okJson({ coins: [{ id: 1 }, ...coins] }))
  assert.equal(r.length, 8)
  assert.deepEqual(r[0], { id: 'c0', name: 'Coin 0', symbol: 'C0', thumb: 'https://x/0.png' })
})

test('searchCoins: consulta corta no llama a la red y un error da []', async () => {
  let called = false
  assert.deepEqual(await searchCoins('b', async () => { called = true; throw new Error('no') }), [])
  assert.equal(called, false)
  assert.deepEqual(await searchCoins('bitcoin', async () => { throw new Error('offline') }), [])
})

test('caché de precios: fusiona y persiste en localStorage; sin localStorage no rompe', () => {
  const store = new Map<string, string>()
  const fakeStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v) } }
  Object.defineProperty(globalThis, 'localStorage', { value: fakeStorage, configurable: true, writable: true })
  savePriceCache({ bitcoin: { eur: 1, at: 1 } })
  const merged = savePriceCache({ ethereum: { eur: 2, at: 2 } })
  assert.deepEqual(Object.keys(merged).sort(), ['bitcoin', 'ethereum'])
  assert.deepEqual(loadPriceCache(), merged)
  assert.ok(store.has('finances_price_cache'))

  Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true, writable: true })
  assert.deepEqual(loadPriceCache(), {})
  assert.deepEqual(savePriceCache({ x: { eur: 3, at: 3 } }), { x: { eur: 3, at: 3 } })
})
