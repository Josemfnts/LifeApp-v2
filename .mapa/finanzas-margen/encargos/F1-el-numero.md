# Encargo F1 — El número (patrimonio neto vivo + histórico + ajuste + traspasos)

Calidad: final. Requiere F0 hecho (lib/finance, vitest, Finanzas partido en components/finanzas).

LEE PRIMERO: AGENTS.md (§Arquitectura de datos, reglas 2 y 4), .mapa/finanzas-margen/mapa.md,
plan.md, 02-compatibilidad-compai.md, 03-dinero.md, 04-snapshots.md, 09-ui.md.

## A — Motor puro en `src/lib/finance/` (con tests, todo el dinero vía money.ts)

### `networth.ts`
- `export const CUENTA_GROUP: Record<string, 'liquid'|'investments'|'property'|'debt'>` =
  bank/savings/cash → liquid · invest/pension → investments · property/vehicle → property ·
  loan/mortgage/credit → debt. Tipo desconocido → liquid.
- `export interface NetWorthBreakdown { liquid: number; investments: number; property: number; debt: number; net: number }`
  (euros; `debt` positivo).
- `computeNetWorth(cuentas: Cuenta[]): NetWorthBreakdown` — suma por grupo; deudas con
  `Math.abs(balance)`; `net = liquid + investments + property − debt`; excluye cuentas con
  `includeInNw === false`. Deja la firma preparada para F3/F4 con un 2º parámetro opcional
  `extra?: Partial<Omit<NetWorthBreakdown,'net'>>` que se suma a cada grupo.
- Añade a `Cuenta` (types.ts) el opcional `includeInNw?: boolean`.

### `snapshots.ts`
- `export interface NwSnapshot extends NetWorthBreakdown { date: string; estimated?: boolean }`
- `upsertTodaySnapshot(snaps, today, b): { snaps: NwSnapshot[]; changed: boolean }` — reemplaza
  SOLO la fila de `today` (o la añade), NUNCA modifica filas de fechas anteriores, devuelve
  ordenado por fecha asc. `changed=false` si la fila de hoy ya tenía exactamente esos valores
  (para no escribir en la nube en cada render). Si existe una fila con fecha > today (reloj
  cambiado) no la toques.
- `backfillEstimated(cuentas, txs, today, months = 12): NwSnapshot[]` — reconstruye el saldo de cada
  cuenta al ÚLTIMO DÍA de cada uno de los `months` meses anteriores a hoy: saldo_en_fecha =
  saldo_actual − Σ efecto de los movimientos de esa cuenta con `date > fecha` (efecto: income +,
  expense −, igual que `cuentasConMovimiento`). Calcula computeNetWorth con esos saldos. Marca
  `estimated: true`. No incluye la fila de hoy. Omite meses anteriores al movimiento más antiguo
  si no hay ninguno (si no hay txs, devuelve []).
- `variation(snaps, currentNet, today, period: '1M'|'3M'|'1A'|'Todo'): { abs: number; pct: number | null; fromDate: string | null }`
  — compara con la última snapshot con fecha <= today − periodo (Todo = la primera). `pct` null si
  la base es 0 o no hay snapshot.

### `ops.ts` (constructores puros de movimientos)
- `buildAdjustment(cuenta: Cuenta, newBalance: number, date: string): Tx | null` → null si la
  diferencia es 0; si no, `{ type: diff>0?'income':'expense', amount: |diff|, category: 'Ajuste',
  concept: 'Ajuste de saldo', note: '', cuenta: cuenta.name, date, kind: 'adjust' }`.
- `buildTransfer(from: string, to: string, amount: number, date: string, concept?: string): [Tx, Tx]`
  → pata origen `expense` y pata destino `income`, ambas `kind: 'transfer'`, `category: 'Traspaso'`,
  mismo `linkId` (`crypto.randomUUID()`), concept por defecto `Traspaso ${from} → ${to}`.
  Lanza Error si from === to o amount <= 0.

### Tests
`networth.test.ts`, `snapshots.test.ts`, `ops.test.ts`: grupos, includeInNw=false, deudas en
negativo y positivo, extra; upsert no toca pasado y `changed`; backfill con un caso numérico
concreto a mano (2 cuentas, 4 movimientos en 3 meses); variation con fecha exacta ausente (coge la
anterior) y base 0; ajuste ±/0; traspaso patas y errores.

## B — Store (`src/stores/financeStore.ts`)
1. Clave nueva `finances_nw_snapshots` en `storageKeys.ts` (STORE_KEYS) + recargador en el
   `onRemoteChange` del final del store.
2. Estado `snapshots: NwSnapshot[]`. Acción `recordSnapshot()`: si `snapshots` está vacío y hay
   cuentas, primero `backfillEstimated`; después `upsertTodaySnapshot` con `computeNetWorth(cuentas)`;
   guarda con `saveToStorage` SOLO si hubo cambio. Llámala al final de addTx, removeTx, updateTx,
   saveCuenta, removeCuenta y de las acciones nuevas, y en el `useEffect` de montaje de Finanzas.
3. `adjustBalance(cuentaName: string, newBalance: number)` → buildAdjustment + addTx.
4. `addTransfer(from, to, amount, date, concept?)` → inserta las 2 patas (ambas mueven saldo con
   cuentasConMovimiento) en una única escritura de `finances_tx` y otra de `finances_cuentas`.
5. `removeTx(idx)`: si la tx tiene `linkId`, borra TODAS las patas con ese linkId y revierte el
   saldo de cada una.
6. Ids de cuenta: `saveCuenta` asigna `id = crypto.randomUUID()` si falta. Si al editar cambia el
   nombre, reescribe `cuenta` en todos los movimientos que tenían el nombre viejo (y guarda
   `finances_tx`).
7. `CAT_META`: añade `'Ajuste': { icon:'⚖️', color:'var(--color-sub)', type:'adjust' }` y
   `'Traspaso': { icon:'🔁', color:'var(--color-acc-blue)', type:'transfer' }`. NO los añadas a los
   selects de categoría del alta.

## C — UI (siguiendo 09-ui.md; colores SOLO con `var(--color-*)`; hojas con `Modal` de `@/components/ui`)
1. Pestañas de Finanzas pasan a: **Inicio · Movs · Patrimonio · Plan · Útiles** (claves internas
   `inicio|moves|patrimonio|plan|utiles`). Plan = BudgetsTab actual. Útiles = AnalysisTab actual.
2. `src/components/finanzas/NetWorthHero.tsx` arriba de Inicio (encima del contenido actual de
   SummaryTab, que se mantiene debajo):
   - Etiqueta "Patrimonio neto", cifra grande con `AnimatedNumber` (`components/finanzas/AnimatedNumber.tsx`:
     interpola con requestAnimationFrame ~600 ms del valor anterior al nuevo, easing out,
     `fontVariantNumeric: 'tabular-nums'`, respeta `prefers-reduced-motion` saltando la animación).
   - Chip de variación con selector 1M · 3M · 1A · Todo (verde si ≥0, rojo si <0) y el texto
     pequeño "variación del patrimonio, no rentabilidad".
   - Fila Líquido · Inversión · Inmuebles · Deudas (ocultar los que sean 0 salvo Líquido).
   - Gráfica de línea chart.js con las snapshots (altura ~120px, sin ejes pesados); los puntos
     `estimated` con línea discontinua (segment.borderDash) y leyenda mínima "estimado".
   - Sin cuentas: estado vacío "Añade tu primera cuenta para ver tu patrimonio" con botón que
     cambia a la pestaña Patrimonio (pasa `onGoPatrimonio` desde el shell).
3. PatrimonioTab → Cuentas: botón "🔁 Traspaso" junto a "+ Añadir" (hoja: origen, destino, importe,
   fecha, concepto) y en cada cuenta un botón ⚖️ "Ajustar saldo" (hoja: saldo real actual,
   muestra la diferencia que se va a apuntar, confirmar). El `NotesFor` se queda donde está.
4. TxRow: `kind==='transfer'` → importe en `var(--color-sub)` y subtítulo `origen → destino`
   (busca la otra pata por linkId); `kind==='adjust'` → icono ⚖️ y color neutro.

## Criterios de aceptación
- `npm test` verde (nº de tests), `npm run build` verde, `npm run lint` sin errores.
- `git grep -n "finances_nw_snapshots" src/lib/storageKeys.ts src/stores/financeStore.ts` con ≥2 resultados.
- Ningún hex nuevo en los componentes nuevos (solo var(--color-*)), salvo rgba de fondos si imitan los existentes.
- No cambia la forma de ningún campo existente de las claves finances_* (solo opcionales nuevos).

## Cierre
Commits por tarea lógica (motor+tests / store / UI) con rutas explícitas en `git add` (nunca -A ni .),
push a origin main. Marca `[x] F1` en `.mapa/finanzas-margen/plan.md` en el último commit.
Resumen final: ficheros, nº de tests, y lo que no hayas podido cumplir.
