# Encargo F4 — Deudas (amortización francesa) e inmuebles

Calidad: final. Requiere F0-F3 hechos.

LEE PRIMERO: AGENTS.md, .mapa/finanzas-margen/mapa.md, plan.md, 02, 03, y §5.5, §5.7, §9.3 del teardown
(`Pendiente implementar/FInanzas pro/margen-teardown-y-plan-life-app.md`).

## A — Motor `src/lib/finance/debts.ts` (+ tests; todo dinero vía money.ts)
```ts
export type DebtKind = 'mortgage' | 'loan' | 'card' | 'personal'
export interface DebtPayment { id: string; date: string; total: number; interest: number; principal: number; extra?: boolean }
export interface Debt {
  id: string; name: string; kind: DebtKind
  principal: number; balance: number          // importe original y pendiente HOY (euros, positivos)
  annualRate: number                          // 0.0325 = 3,25 % TIN
  rateType: 'fixed' | 'variable'; euribor?: number; spread?: number; reviewMonth?: number /* 1-12 */
  termMonths: number; startDate: string; paymentDay: number
  cuenta?: string; propertyId?: string; includeInNw?: boolean
  payments: DebtPayment[]
}
```
- `effectiveRate(d)`: fixed → annualRate; variable → (euribor ?? 0) + (spread ?? 0).
- `monthlyPayment(P, annualRate, n)`: cuota francesa `P·i / (1 − (1+i)^−n)`, `i = rate/12`; rate 0 → P/n;
  redondeada a céntimos. **Test: 150 000 € al 3 % a 30 años = 632,41 €.**
- `schedule(P, annualRate, n, startDate, paymentDay)`: filas `{ n, date, payment, interest, principal, balance }`
  en céntimos; la ÚLTIMA fila ajusta la cuota para dejar el saldo exactamente a 0.
  **Test: Σ principal == P al céntimo; Σ interest == Σ payment − P.**
- `remainingMonths(d, today)`: termMonths − meses transcurridos desde startDate (mínimo 1 si balance > 0).
- `nextPaymentSplit(d, today)`: cuota recalculada sobre `balance` y `remainingMonths` a `effectiveRate`;
  `interest = balance·i`, `principal = cuota − interest` (si principal > balance, principal = balance).
- `simulateExtra(d, amount, mode: 'reduce_term' | 'reduce_payment', today)`: `{ newPayment, newMonths, interestSaved, monthsSaved }`
  comparando el schedule actual con el nuevo.
- Tests adicionales: rate 0, tarjeta (termMonths corto), variable con euribor+spread, simulateExtra en los
  dos modos con cifras razonables (interestSaved > 0, monthsSaved > 0 en reduce_term).

## B — Motor `src/lib/finance/properties.ts` (+ tests)
```ts
export interface Valuation { date: string; value: number; source: 'manual' | 'index' }
export interface Property {
  id: string; name: string; kind: 'home' | 'rental' | 'garage' | 'land' | 'other'
  purchasePrice: number; purchaseDate: string; surface?: number; postalCode?: string; cadastralRef?: string
  valuationMode: 'manual' | 'annual_pct'; annualPct?: number /* 0.04 = 4 %/año */
  valuations: Valuation[]; includeInNw?: boolean
}
```
- `currentValue(p, today)`: manual → última valoración o purchasePrice; annual_pct → desde la última
  valoración manual (o compra) `base·(1+pct)^(años fraccionales)`.
- `valueSeries(p, today)`: un punto por año desde la compra + hoy (para gráfica).
- `equity(p, debts, today)`: `currentValue − Σ balance de deudas con propertyId == p.id`.
- Tests: manual, % anual con 2,5 años, valoración manual intermedia que reinicia la base, equity con hipoteca.

## C — Store
- Claves `finances_debts` y `finances_properties` en STORE_KEYS + estado + recargadores.
- CRUD: `saveDebt`, `removeDebt`, `saveProperty`, `removeProperty`, `addValuation(propertyId, v)`.
- `payDebt(id, { date?, cuenta? })`: usa `nextPaymentSplit`; crea DOS Tx con `debtId` y mismo `linkId`:
  intereses → `expense`, categoría nueva `'Intereses'` (flujo normal, SÍ es gasto); capital → `expense`,
  categoría nueva `'Amortización'`, `kind: 'debt_principal'` (NO es gasto). Ambas mueven el saldo de la
  cuenta si hay. `balance −= principal`, añade DebtPayment. El patrimonio neto NO debe cambiar por la parte
  de capital (test de integración pura en debts.test: NW antes/después de pagar solo baja en los intereses).
- `extraAmortization(id, amount, cuenta?)`: Tx `kind: 'debt_principal'`, payment `extra: true`, balance −= amount.
- `recordSnapshot` y el hero: `extra.debt += Σ balance deudas`, `extra.property += Σ currentValue inmuebles`
  (respetando includeInNw).
- `CAT_META`: 'Intereses' (💸, expense) y 'Amortización' (🏦, meta type 'debt_principal'); 'Intereses' SÍ
  aparece en categorías de gasto del alta.

## D — UI (`src/components/finanzas/debts/` y `.../properties/`)
1. PatrimonioTab: segmentos **💳 Deudas** y **🏠 Inmuebles** tras Inversiones.
2. Deudas: total pendiente; por deuda: nombre, tipo, pendiente, barra "% amortizado" (1 − balance/principal),
   próxima cuota con desglose "X intereses · Y capital", botón "Pagar cuota" (hoja: fecha, cuenta, desglose,
   confirmar). Hoja de detalle: condiciones editables, Euríbor actual (variable), tabla de amortización
   (12 próximas filas + "Ver todo" plegable), simulador de amortización anticipada (importe + modo →
   resultado), historial de pagos.
3. Inmuebles: valor actual, plusvalía vs compra (€ y %), equity si hay hipoteca ligada, etiqueta visible
   **"valor estimado por índice, no tasación"** cuando `annual_pct`, botón "Nueva valoración", gráfica
   `valueSeries`. Formulario: datos de compra, modo de valoración, hipoteca ligada (select de deudas).
4. Aviso en el formulario de cuentas para tipos Préstamo/Hipoteca/Inmueble: "Si lo registras en 💳 Deudas /
   🏠 Inmuebles no lo añadas también como cuenta: contaría dos veces."

## Criterios de aceptación
- `npm test` (nº), `npm run build`, `npm run lint` sin errores. Test 632,41 € presente y verde.
- Claves nuevas en STORE_KEYS con recargador.

## Cierre
Commits por tarea lógica, rutas explícitas en git add, push a origin main, `[x] F4` en plan.md.
Resumen: ficheros, nº tests, pendientes.
