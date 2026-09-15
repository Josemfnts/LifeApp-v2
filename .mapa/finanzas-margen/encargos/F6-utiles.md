# Encargo F6 — Útiles: simuladores, gastos compartidos, informe y contexto para el asistente

Calidad: final. Requiere F0-F5 hechos.

LEE PRIMERO: AGENTS.md, .mapa/finanzas-margen/mapa.md, plan.md, 02, 03, 07-fuera-de-la-app.md, y §1.8,
§5.6, §5.10, §5.11, §5.12, §7 del teardown (`Pendiente implementar/FInanzas pro/margen-teardown-y-plan-life-app.md`).

## A — Motor puro (con tests)

### `src/lib/finance/simulators.ts` (reutiliza `monthlyPayment`/`schedule` de debts.ts)
- `export const DISCLAIMER = 'Herramienta orientativa basada en tus datos. No es asesoramiento financiero ni garantía de aprobación bancaria.'`
- `simulateLoan({ amount, years, tin, openingFeePct? })` → `{ payment, totalInterest, totalCost, schedule }`.
- `simulateMortgage({ price, downPayment, years, tin, purchaseCostsPct = 0.10, netWorth, liquid, totalAssets, totalDebt, monthlyIncome? })`
  → `{ loan, payment, upfrontCash /* entrada + gastos */, purchaseCosts, totalInterest, nwBefore, nwAfter, debtToAssetsBefore, debtToAssetsAfter, paymentToIncome | null, liquidAfter, canAfford: boolean }`.
  nwAfter = nwBefore − purchaseCosts (la entrada y el préstamo solo cambian de forma); canAfford = liquidAfter ≥ 0
  y (paymentToIncome == null o ≤ 0,35).
- `simulateSavings({ initial, monthly, annualReturn, years, inflation = 0 })` → serie anual
  `{ year, contributed, value, realValue }` (capitalización mensual, igual que el cálculo actual de AnalysisTab).
- Tests con cifras: préstamo 10 000 € 5 años 6 % → cuota 193,33 €; hipoteca con nwAfter = nwBefore − gastos;
  ahorro 1000 inicial + 100/mes 7 % 10 años coincide con el bucle actual de AnalysisTab al euro.

### Gastos compartidos — `src/lib/finance/split.ts`
- `Tx` gana opcional `split?: { mode: 'equal' | 'pct' | 'amount'; people: { name: string; share: number }[]; myShare: number }`
  (`people` NO me incluye; `share` = euros finales de cada uno). `Pufo` gana opcional `txId?: number`.
- `buildSplit(total, mode, people: {name, value}[], includeMe = true)` → `{ myShare, people }` usando `splitCents`
  (equal: partes iguales entre yo + N; pct: values en %, lo que falte hasta 100 es mío; amount: values en €,
  el resto es mío). La suma SIEMPRE == total. Error si pct > 100 o importes > total.
- `flowAmount(tx)` = `tx.split ? tx.split.myShare : tx.amount`. **Sustituye `t.amount` por `flowAmount(t)` en
  TODAS las sumas de flujo** (Summary, Analysis, budgets.ts, recurring detect, alerts, context). El saldo de la
  cuenta sigue moviéndose por el importe completo (pagaste tú).
- Tests: equal 3 personas con céntimo sobrante, pct, amount, errores, flowAmount.

### `src/lib/finance/context.ts`
- `buildFinanceContext(state, todayISO)` → JSON compacto (< 4 KB serializado con datos realistas):
  `{ generatedAt, disclaimer, netWorth: { now, breakdown, var1M, var3M, var1A }, month: { income, expense, savingsRate },
  topCategories: [{ category, amount, avg6m, deltaPct }] /* top 5 */, budgets: [{ category, pct, level }] /* solo warn/over */,
  upcoming: [{ date, concept, amount }] /* 14 días */, portfolio: { value, unrealized, byKind }, debts: { total, monthlyPayments },
  receivables: { meDeben, lesDebo } }`. Todo en euros redondeados.
- Tests de forma, tamaño y un par de cifras.

## B — Store
- Clave `finances_context` en STORE_KEYS (la lee CompAI / futuro Agente personal; SOLO la escribe la app).
  `recordContext()` la recalcula y guarda SOLO si cambió (comparación JSON sin `generatedAt`); llamarla donde
  se llama `recordSnapshot` (con debounce de 2 s para no escribir en ráfaga). Recargador onRemoteChange
  no hace nada útil pero regístralo como no-op documentado.
- Al guardar un movimiento con `split`, crea un Pufo `me_debe` por persona (`txId`, concept = concepto del
  movimiento). Borrar el movimiento pregunta si borrar también sus pufos no saldados.
- Patrimonio: `extra.liquid += meDeben − lesDebo` de pufos activos (lo que te deben es tuyo). Añade debajo del
  hero el texto pequeño "incluye 45 € que te deben" cuando ≠ 0.

## C — UI
1. Pestaña **Útiles** con segmentos **Análisis · Simuladores · Informe**. Análisis = AnalysisTab actual SIN el
   bloque de interés compuesto (se mueve a Simuladores).
2. Simuladores (`components/finanzas/simulators/`): selector Préstamo · Hipoteca · Ahorro. Resultados en vivo al
   teclear (sin botón Calcular). Préstamo: cuota, intereses, coste total, tabla plegable. Hipoteca: todo lo
   anterior + "Necesitas X € en efectivo (entrada + gastos)", "Tu patrimonio pasa de A a B", ratio deuda/activos
   antes → después, % de ingresos que se come la cuota (ingresos = media 3 meses de flujo), semáforo canAfford;
   datos del patrimonio del usuario precargados. Ahorro: curva chart.js (aportado vs valor vs valor real).
   `DISCLAIMER` visible al pie de cada simulador. Funcionan sin datos.
3. Compartir gasto: en QuickAddSheet y EditTxSheet, fila "👥 Compartir gasto" (solo gastos) que despliega modo
   (Iguales · % · Importes) y personas (autocompletar con nombres de pufos existentes); muestra "Tu parte: X €".
   TxRow muestra "tu parte X €" en el subtítulo si hay split.
4. Informe (`components/finanzas/report/MonthlyReport.tsx`): selector de mes; patrimonio a fin de mes y
   variación, gráfica 12 meses, desglose por clase de activo, ingresos/gastos/tasa de ahorro, top categorías vs
   media 6 meses, presupuestos, cartera (valor y P&L), deudas pendientes, DISCLAIMER. Botón "Imprimir / guardar
   PDF" → `window.print()`. En `src/index.css` añade `@media print` que oculta todo salvo `.fin-report`
   (nav-bar, cabeceras, hojas) y fuerza fondo blanco/texto oscuro legible SOLO dentro de la impresión.

## Criterios de aceptación
- `npm test` (nº), `npm run build`, `npm run lint` sin errores.
- `git grep -n "t.amount" src/components/finanzas` solo en listas/filas, no en sumas de flujo (justifica los que queden).
- `finances_context` en STORE_KEYS.

## Cierre
Commits por tarea lógica, rutas explícitas en git add, push a origin main, `[x] F6` en plan.md.
Resumen: ficheros, nº tests, pendientes.
