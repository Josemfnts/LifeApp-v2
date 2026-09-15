# Encargo F3 — Inversiones: posiciones, lotes, P&L, precios y DCA

Calidad: final. Requiere F0-F2 hechos.

LEE PRIMERO: AGENTS.md, .mapa/finanzas-margen/mapa.md, plan.md, 02, 03, 05-precios.md, y §4.4, §5.4,
§5.9, §9 (trampas 2, 4, 7, 8, 11, 12) del teardown en `Pendiente implementar/FInanzas pro/`.

## A — Motor puro `src/lib/finance/investments.ts` (+ tests)
```ts
export type HoldingKind = 'stock' | 'etf' | 'fund' | 'crypto' | 'bond' | 'other'
export interface Lot { id: string; date: string; quantity: number; unitCost: number /* EUR */; fees: number; source?: 'buy' | 'dca' | 'staking' | 'airdrop' | 'split' }
export interface Sale { id: string; date: string; quantity: number; unitPrice: number; fees: number }
export interface DcaPlan { amount: number; day: number /* 1-28 */; cuenta: string; active: boolean; lastRun?: string /* YYYY-MM */ }
export interface Holding {
  id: string; kind: HoldingKind; name: string; symbol?: string; isin?: string
  coingeckoId?: string; image?: string
  manualPrice?: number; priceAt?: string       // precio manual en EUR y su fecha
  cuenta?: string                               // broker/cuenta asociada (nombre)
  includeInNw?: boolean
  lots: Lot[]; sales: Sale[]; dca?: DcaPlan
}
```
- `position(h)`: aplica ventas FIFO sobre lotes ordenados por fecha → `{ quantity, costBasis, avgCost, realized }`
  (`realized` = Σ (precio venta × qty − fees venta) − coste FIFO consumido − fees proporcionales de los lotes).
  Lotes `staking`/`airdrop` = coste 0. Vender más de lo que hay → Error.
- `resolvePrice(h, cache, now)`: `{ price, source: 'live' | 'manual' | 'cost', asOf, stale }` — live si
  hay precio en caché de <15 min para `coingeckoId`; si no manual; si no, `avgCost` (nunca 0).
  `stale` = live >15 min, o manual con más de 7 días (fondos: más de 3 días).
- `valuation(h, price)`: `{ value, unrealized, unrealizedPct | null }`.
- `portfolio(holdings, cache, now)`: totales `{ value, cost, unrealized, realized, byKind }` excluyendo `includeInNw === false`.
- `applySplit(h, ratio)`: multiplica cantidades de lotes y ventas por ratio y divide precios (coste total intacto).
- `dcaDue(h, todayISO)`: true si `dca.active`, `day <= día de hoy` y `lastRun !== mes actual`.
- Tests: FIFO con 3 lotes y 2 ventas (caso numérico a mano), staking a coste 0, venta excesiva,
  resolvePrice en los 3 casos y stale, split 4:1 conserva coste y valor, dcaDue en bordes de mes.

## B — Precios `src/lib/finance/prices.ts`
- `fetchCryptoPrices(ids: string[])` → `GET https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=eur&include_24hr_change=true`
  en UNA llamada (lote), timeout 8 s con AbortController, devuelve `Record<id, { eur, change24h, at }>`.
  Cualquier error (red, CORS, 429) → devuelve `{}` y `console.warn`, NUNCA lanza a la UI.
- `searchCoins(q)` → `GET https://api.coingecko.com/api/v3/search?query=` → `{ id, name, symbol, thumb }[]` (máx 8).
- Caché en `localStorage` bajo la clave `finances_price_cache` — **local-only**: añádela en
  storageKeys.ts en un export NUEVO `LOCAL_ONLY_KEYS` (NO en `STORE_KEYS` / `ALL_STORAGE_KEYS`) y escríbela con
  `localStorage.setItem` directo (NO con saveToStorage: no debe subir a la nube).

## C — Store
- Clave `finances_holdings` en STORE_KEYS + estado + recargador onRemoteChange.
- `addHolding(h)`, `updateHolding(id, partial)`, `removeHolding(id)`.
- `buyLot(holdingId, lot, cuenta?)`: añade lote; si hay `cuenta`, crea Tx `expense` por
  `quantity × unitCost + fees` con `kind: 'investment'`, `category: 'Inversión'`, `holdingId`, moviendo saldo.
- `sell(holdingId, sale, cuenta?)`: valida con `position`; añade venta; si hay cuenta, Tx `income`
  por `quantity × unitPrice − fees` con `kind: 'investment'`.
- Dividendos: Tx normal de ingreso con categoría nueva `'Dividendos'` (añadir a CAT_META y a la lista
  de categorías de ingreso). NO tocan lotes.
- `runDueDca()`: para cada holding con `dcaDue`, compra por `dca.amount` al precio resuelto
  (si el source es `'cost'` porque no hay precio → no ejecuta y lo devuelve en una lista de omitidos),
  lote `source: 'dca'`, Tx de la cuenta, `lastRun = mes actual`. Llamarla en el montaje de Finanzas
  junto a processRecurrentes, con toast.
- `computeNetWorth` recibe `extra.investments = portfolio(...).value` en `recordSnapshot` y en el hero.
  `refreshPrices()`: pide precios de todos los `coingeckoId`, guarda caché y dispara recálculo del hero
  (estado `priceTick` o similar).

## D — UI (`src/components/finanzas/investments/`)
1. PatrimonioTab: nuevo segmento **📈 Inversiones** entre Cuentas y Huchas.
2. Cabecera del segmento: valor total (AnimatedNumber), P&L latente € y %, P&L realizado, y mini
   gráfica de la serie `investments` de las snapshots (1M · 1A · Todo).
3. Lista de posiciones: logo (`image` o icono por tipo), nombre y símbolo, cantidad, precio con
   marca de frescura ("● en vivo" / "manual · 12 sep" / "sin precio · coste"), valor y P&L con color.
4. `AddHoldingSheet`: tipo → si cripto, buscador CoinGecko (debounce 400 ms) que rellena nombre,
   símbolo, id, image; si no, nombre + símbolo/ISIN + precio actual manual → primera compra (fecha,
   cantidad, precio unitario, comisiones, cuenta de cargo opcional).
5. `HoldingDetailSheet`: lotes y ventas, botones Comprar · Vender · Actualizar precio (manual) ·
   Ajustar split (ratio) · DCA (importe, día, cuenta, activo) · Borrar (ConfirmDialog). Muestra coste
   medio, realizado y latente. Texto pequeño: "Rentabilidad de la posición = (valor − coste) / coste".
6. Refresco en vivo: con el segmento Inversiones visible y `document.visibilityState === 'visible'`,
   `refreshPrices()` al entrar y cada 60 s; limpiar el intervalo al salir.
7. Aviso en el formulario de cuentas si se elige tipo "Inversión": "Si registras esta inversión en
   📈 Inversiones, no la añadas también como cuenta: contaría dos veces."

## Criterios de aceptación
- `npm test` (nº), `npm run build`, `npm run lint` sin errores.
- `finances_holdings` en STORE_KEYS con recargador; `finances_price_cache` SOLO en LOCAL_ONLY_KEYS.
- Sin red (modo avión) la pestaña no rompe: precios manual/coste con su marca.

## Cierre
Commits por tarea lógica, rutas explícitas en git add, push a origin main, `[x] F3` en plan.md.
Resumen: ficheros, nº tests, pendientes.
