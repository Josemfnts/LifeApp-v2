# Plan — Finanzas "Margen" (investigación + ejecución por fases)

Fecha: 2026-09-15 · Autor: Claude (arquitecto) · Ejecuta: OpenCode · Decide: Josema

## 1. Qué hay HOY en Finanzas (verificado en el código)

`src/pages/Finanzas.tsx` (988 líneas, todo en un fichero) + `src/stores/financeStore.ts`.

| Pieza | Clave | Estado | Carencias frente a Margen |
|---|---|---|---|
| Movimientos (`Tx`) | `finances_tx` | alta ingreso/gasto, categoría, cuenta, buscador, filtro, CSV export, borrar | sin editar en UI, sin comercio, sin traspasos, fecha en UTC, sin import |
| Cuentas (`Cuenta`) | `finances_cuentas` | saldo manual, tipos activo/pasivo, movimientos mueven saldo | referencia por NOMBRE (renombrar rompe), sin "ajustar saldo", sin histórico |
| Patrimonio neto | — (calculado) | activos − pasivos de cuentas | sin inversiones/deudas/inmuebles reales, sin evolución, sin gráfica |
| Huchas | `finances_huchas` | objetivos de ahorro con aportar | no mueven dinero de ninguna cuenta |
| Pufos | `finances_pufos` | me deben / les debo, saldar a hucha | no nacen de un gasto compartido |
| Presupuestos | `finances_budgets` | límite mensual por categoría | sin rollover, sin avisos 80/100 % |
| Recurrentes | `finances_recurring` | día del mes, se crean al abrir Finanzas | sólo mensual, no tocan saldo de cuenta, sin próximo cargo, sin detección |
| Análisis | — | 6 meses ingreso/gasto, tasa de ahorro, categorías | la tasa mezcla todo el histórico; traspasos contarían como gasto |
| Simulador | — | interés compuesto | sin préstamo/hipoteca, sin tabla ni curva |

Consumidores externos: **Dashboard** (lee `finances_tx` para XP) y **CompAI/life-mcp** (lee y
escribe `store_data`). Por eso las claves viejas no cambian de forma (decisión 02).

## 2. Inventario Margen → LifeApp (TODAS las funciones)

| # | Función Margen | Cómo se implementa aquí | Fase |
|---|---|---|---|
| 1 | Patrimonio neto en vivo (una cifra) | `lib/finance/networth.ts`: cuentas + inversiones + inmuebles − deudas; hero con número animado `tabular-nums` | F1 |
| 2 | Evolución / gráfica del patrimonio + "+x % este mes" | snapshots diarios `finances_nw_snapshots`; periodos 1M/3M/1A/Todo; etiqueta "variación", no "rentabilidad" | F1 |
| 3 | Cuentas ilimitadas con saldo | ya existe; se añade `id` estable y renombrado que propaga | F1 |
| 4 | Ajustar saldo (conciliación) | movimiento `kind:'adjust'` por la diferencia, excluido de estadísticas | F1 |
| 5 | Traspasos entre cuentas (no son gasto) | 2 patas `kind:'transfer'` con `linkId`, excluidas de estadísticas | F1 |
| 6 | Movimientos en segundos con comercio/logo | `finances_merchants` + normalizador de conceptos + autocompletado + categoría por defecto + favicon del dominio | F2 |
| 7 | Editar movimiento | hoja de edición (hoy sólo se puede borrar) | F2 |
| 8 | Importación bancaria (BBVA, Santander, CaixaBank, Sabadell, ING, Revolut, Trade Republic…) | parser **N43** + **CSV** genérico con mapeo de columnas guardado por banco; revisión; dedupe; deshacer | F2 |
| 9 | Análisis gastos por categoría | ya existe; se corrige para excluir `kind` no-flujo y usar fecha local | F2 |
| 10 | Activos de inversión (acción, ETF, fondo, cripto) | `finances_holdings` con lotes; P&L coste medio; FIFO en ventas | F3 |
| 11 | Precios en tiempo real + gráficas por periodo | CoinGecko (cripto) en vivo; bolsa manual con frescura; caché local | F3 |
| 12 | Compras recurrentes automáticas (DCA) | recurrente `kind:'dca'` → salida de cuenta + lote nuevo | F3 |
| 13 | Deudas | `finances_debts`: hipoteca/préstamo/tarjeta, cuadro francés, pago = interés (gasto) + capital (traslado) | F4 |
| 14 | Hipoteca variable (Euríbor + diferencial) | revisión anual con Euríbor introducido a mano | F4 |
| 15 | Inmuebles con evolución de valor | `finances_properties` + valoraciones; modo manual o % anual | F4 |
| 16 | Presupuestos | ya existe; + rollover + aviso 80/100 % | F5 |
| 17 | Recurrentes | + frecuencia (semanal/mensual/anual/cada N meses), cuenta, próximo cargo, mueven saldo | F5 |
| 18 | Detección automática de recurrentes | ≥3 apariciones mismo comercio ±10 % importe, 28-31 días → sugerir | F5 |
| 19 | Calendario de cargos + saldo proyectado ("¿llego a fin de mes?") | vista mes con cargos previstos y saldo día a día | F5 |
| 20 | Notificaciones (cargo próximo, presupuesto, resumen) | `lib/notifications.ts`, locales, 3 tipos | F5 |
| 21 | Simulador préstamo | cuota, intereses, coste total, tabla | F6 |
| 22 | Simulador hipoteca + impacto en patrimonio | + entrada, gastos compra ~10-12 %, patrimonio antes/después, ratio deuda/activos | F6 |
| 23 | Simulador ahorro / interés compuesto | ya existe; + curva | F6 |
| 24 | Compartir gastos (partes iguales o %) | split en el movimiento → pufos automáticos, reparto de céntimos exacto | F6 |
| 25 | Informe PDF | informe mensual con vista imprimible (`window.print`) | F6 |
| 26 | Recap y asesor con IA | `buildFinanceContext()` JSON compacto (dinero) listo para CompAI/Agente personal | F6 |
| 27 | Disclaimer legal | en simuladores e informe | F6 |
| 28 | Widget iPhone | fuera: lo cubrirá la idea Atajos iOS (decisión 07) | — |
| 29 | Amigos / cuentas compartidas | fuera: app single-user; los pufos cubren "me debe" (decisión 07) | — |
| 30 | Importación con IA de cualquier banco | fuera de la app: CompAI (niebla) | — |

Las 12 trampas contables del teardown (§9) se cubren así: traspasos, aportaciones y capital de
deuda con `kind` excluido de flujo (1-3); plusvalías fuera de ingresos (4); tasa de ahorro sobre
flujo (5); fechas en hora local de Madrid (6); ajuste manual de cantidad para splits (7);
dividendos como ingreso normal (8); céntimos enteros y reparto del resto al primero (9);
dedupe (10); precio viejo con marca de frescura (11); lote a coste 0 para staking (12).

## 3. Fases de ejecución

Cada fase = 1-2 encargos a OpenCode, verificación de Claude (leer diff, build, lint, tests,
navegador) y commit+push. Si una fase se corta, se retoma por la primera casilla sin marcar.

- [x] **F0 · Cimientos** — tests `node:test`; `src/lib/finance/{money,dates,types,flow}.ts` con tests; `Finanzas.tsx`
      partido en `src/components/finanzas/*` SIN cambio funcional; fecha local en vez de UTC.
      (2026-09-15, commits e41e941·5095d42·d506a1f + fix de Claude en toCents: notación exponencial y −0.)
- [x] **F1 · El número** — motor de patrimonio + snapshots + hero animado + gráfica evolución;
      ajustar saldo; traspasos; `kind` excluido de estadísticas; id estable de cuenta.
      (2026-09-15, commits b4973fc·850c82d·81f7927 + fixes de revisión: dinero en céntimos, variación sin histórico.)
- [x] **F2 · Que se mantenga solo** — comercios + alta rápida + editar movimiento; importador N43/CSV
      con revisión, dedupe y deshacer. (F2a: f5ef1cd·102f889·b419848·aba9094 + fix 5a6fc1a editar/borrar.
      F2b: motor b87fd4a + store/UI f9f7fda, hecho por Claude con dev-mcp caído. Verificado E2E en prod
      2026-09-15: alta rápida → editar → borrar; importar N43 (3 movs, totales OK, saldo 1000→2791,71) →
      reimportar = 0 nuevos/3 duplicados → deshacer (saldo vuelve a 1000). Pendiente probar un N43/CSV REAL de banco.)
- [x] **F3 · Inversiones** — holdings + lotes + P&L + CoinGecko + precio manual + DCA.
      (2026-09-15, Claude directo con dev-mcp caído: motor 71a3ac8 + store/UI 89d8410. Verificado E2E en prod:
      buscar BTC en CoinGecko desde el navegador (CORS OK) → compra 0,01 contra cuenta (mov. kind investment,
      saldo 1000→600) → precio en vivo 66.201 € y P&L latente. Venta/split/DCA solo cubiertos por tests del motor.)
- [x] **F4 · Deudas e inmuebles** — amortización francesa, pago con desglose, variable, inmuebles.
      (2026-09-15, Claude directo: motor c655ae6 + store/UI bc8bc80. Verificado E2E en prod: hipoteca 150.000 € 3 %
      360 m → cuota 632,41 € (375 intereses + 257,41 capital), cuadro 360 cuotas, pagar cuota = 2 movimientos
      enlazados, cuenta −632,41, deuda 149.742,59, patrimonio −375,00 exactos. Bug destapado y corregido: la cuota
      bajaba tras pagar (plazo no descontaba cuotas pagadas). Inmuebles y amortización anticipada: solo tests.)
- [x] **F5 · Planificación** — presupuestos rollover/avisos, recurrentes pro, detección, calendario, notificaciones.
      (2026-09-15, Claude directo: motor 144303d + store/UI c1e1102 + fix aviso calendario 76477a9. Verificado E2E en prod:
      recurrente mensual día 20 contra cuenta → "próximo 20 sep" sin cargos atrasados; calendario con el cargo el 20 y
      saldo previsto −782,41 €; Inicio "Próximos 7 días". De paso, en Inicio los gastos del mes = solo intereses (375 €),
      sin capital de hipoteca ni compra de BTC. Presupuestos, detección y notificaciones: solo tests.)
- [ ] **F6 · Útiles** — simuladores préstamo/hipoteca/ahorro, gastos compartidos, informe imprimible, contexto IA, disclaimer.
      (2026-09-15, Claude directo: motor 7e19e7e + store 81414cf + Útiles f51d20c + compartir gasto dcfa5e1, 189 tests.
      Un test del contexto destapó que presupuestos contaba el gasto compartido entero → flowAmount en todas las sumas.
      Pendiente verificación E2E en prod.)
- [ ] **Cierre** — sección Finanzas en AGENTS.md (claves nuevas + `kind`), ESTADO, DECISIONES, aviso life-mcp.

## 4. Claves nuevas (todas en `storageKeys.ts` y con recargador `onRemoteChange`)

| Clave | Contenido | Fase |
|---|---|---|
| `finances_nw_snapshots` | `{ date, liquid, investments, property, debt, net }[]` (euros) | F1 |
| `finances_merchants` | comercios `{ id, name, domain?, category?, patterns[] }` | F2 |
| `finances_imports` | historial de importaciones `{ id, date, cuenta, format, total, imported, skipped }` | F2 |
| `finances_import_maps` | mapeos CSV guardados por banco | F2 |
| `finances_holdings` | posiciones `{ id, kind, symbol, name, currency, coingeckoId?, manualPrice?, priceAt?, lots[] }` | F3 |
| `finances_debts` | deudas con condiciones y pagos | F4 |
| `finances_properties` | inmuebles + valoraciones | F4 |
| `finances_price_cache` | caché de precios — **local-only, NO se sincroniza** | F3 |
