# Encargo F5 — Planificación: presupuestos, recurrentes, detección, calendario y avisos

Calidad: final. Requiere F0-F4 hechos.

LEE PRIMERO: AGENTS.md (incluye §Convenciones: notificaciones locales), .mapa/finanzas-margen/mapa.md,
plan.md, 02, 03, y §5.8 del teardown (`Pendiente implementar/FInanzas pro/margen-teardown-y-plan-life-app.md`).

## A — Motor puro (con tests)

### `src/lib/finance/budgets.ts`
- `Presupuesto` (types.ts) gana opcionales `rollover?: boolean` y `since?: string /* YYYY-MM */`
  (se rellena al crear; si falta, se toma el mes actual).
- `budgetStatus(p, txs, monthKey)`: `{ spent, carry, available, pct, level: 'ok' | 'warn' | 'over' }`
  — spent = Σ gastos de flujo (`isFlow`) de esa categoría en el mes; carry (solo si rollover) =
  Σ (limit − spent) de los meses desde `since` hasta el anterior (puede ser negativo);
  available = limit + carry; warn ≥ 80 %, over > 100 %.
- Tests: sin rollover, rollover con sobrante, rollover con exceso, since en el mes actual.

### `src/lib/finance/recurring.ts`
- `Recurrente` gana opcionales `freq?: 'weekly' | 'monthly' | 'yearly'`, `interval?: number` (cada N),
  `startDate?: string`, `cuenta?: string`, `lastRun?: string /* YYYY-MM-DD última ocurrencia generada */`,
  `notifyDaysBefore?: number`. Sin `freq` = mensual el día `day` (compat con los existentes).
  `Tx` gana opcional `recurringId?: number`.
- `occurrences(r, fromISO, toISO): string[]` — fechas en [from, to]; mensual/anual en el día `day`
  recortado a fin de mes; semanal cada 7·interval días desde startDate.
- `dueOccurrences(r, todayISO)`: fechas > lastRun (o, si no hay lastRun, SOLO las del mes actual ≤ hoy,
  para no rellenar años hacia atrás) y ≤ hoy.
- `detectRecurring(txs, recurrentes, dismissed: string[])`: agrupa movimientos de flujo por `merchantId` o
  por `normalizeConcept(concept)`; candidatos con ≥3 apariciones, importes dentro de ±10 % de la mediana y
  separaciones regulares (26-35 días → monthly, 6-8 → weekly, 355-375 → yearly); excluye grupos ya cubiertos
  por un recurrente (concepto normalizado igual) o cuya clave esté en `dismissed`. Devuelve
  `{ key, concept, amount /* mediana */, type, category, day, freq, cuenta }[]`.
- `projectCashflow(startBalance, recurrentes, fromISO, toISO)`: `{ date, events: {concept, amount}[], balance }[]`
  día a día (ingresos +, gastos −).
- Tests: occurrences en los 3 tipos y 31→30/28, dueOccurrences con y sin lastRun, detect (Netflix mensual
  detectado; 2 apariciones no; importes dispares no; ya cubierto no; dismissed no), proyección con un cargo
  que deja saldo negativo el día correcto.

### `src/lib/finance/alerts.ts`
- `computeFinanceAlerts(state, todayISO)` → `{ id, kind: 'upcoming' | 'budget' | 'summary', title, body }[]`:
  cargo previsto en los próximos `notifyDaysBefore ?? 1` días; presupuesto en warn/over (id incluye mes y
  nivel); resumen mensual el día 1 (mes anterior: ingresos, gastos, tasa de ahorro). Tres tipos, no más.
- Tests de cada tipo e ids estables.

## B — Store
- `processRecurrentes()` reescrito con `dueOccurrences`: cada ocurrencia crea Tx con `recurringId`, `cuenta`
  (mueve saldo si hay), fecha = la de la ocurrencia, `note: '(recurrente)'`; actualiza `lastRun`. Mantén la
  guarda anti-duplicado actual para los recurrentes legacy sin lastRun.
- `setPresupuesto(cat, limit, rollover?)` guarda `since` al crear.
- Clave `finances_recurring_dismissed` (string[]) en STORE_KEYS + recargador; `dismissSuggestion(key)`.
- `updateRecurrente(id, partial)` y toggle `active`.

## C — Notificaciones
- En `src/lib/notifications.ts`: `checkFinanceReminders()` siguiendo el patrón de `checkHabitReminders`
  (permiso concedido → `scheduleReminder`/Notification). Deduplica con `finances_alerts_sent` en
  `localStorage` directo, declarada en `LOCAL_ONLY_KEYS` (no se sube a la nube). Llámala donde se llaman
  las otras comprobaciones (búscalo en App.tsx/Shell).

## D — UI
1. Pestaña **Plan** con segmentos **Presupuestos · Recurrentes · Calendario** (formularios en hojas `Modal`,
   nada de formularios siempre abiertos).
2. Presupuestos: tarjeta por presupuesto con gastado/disponible, carry si rollover ("+35 € del mes pasado"),
   barra verde/ámbar/roja por level; hoja de alta/edición con casilla "El sobrante pasa al mes siguiente".
3. Recurrentes: lista con próximo cargo (fecha e importe), frecuencia legible ("Cada mes, día 5"), cuenta,
   toggle activo; hoja de alta/edición con frecuencia, intervalo, día/fecha inicio, cuenta, aviso N días antes.
   Encima, tarjetas de sugerencias de `detectRecurring`: "Parece que pagas Netflix cada mes (12,99 €)"
   [Crear recurrente] [Descartar].
4. Calendario: rejilla del mes (lunes primero) con punto verde/rojo en días con cargos previstos; tocar un día
   lista sus eventos; debajo "Saldo previsto a fin de mes: X €" usando `projectCashflow` desde el saldo
   líquido actual (grupo liquid) y aviso rojo si algún día baja de 0 ("El 23 bajarías a −120 €").
5. Inicio: bajo el hero, bloque compacto "Próximos 7 días" (cargos previstos) y avisos de presupuesto
   activos de `computeFinanceAlerts` (máx 3).

## Criterios de aceptación
- `npm test` (nº), `npm run build`, `npm run lint` sin errores.
- Recurrentes existentes (sin freq) siguen funcionando igual (test de compat).
- `finances_recurring_dismissed` en STORE_KEYS con recargador; `finances_alerts_sent` solo en LOCAL_ONLY_KEYS.

## Cierre
Commits por tarea lógica, rutas explícitas en git add, push a origin main, `[x] F5` en plan.md.
Resumen: ficheros, nº tests, pendientes.
