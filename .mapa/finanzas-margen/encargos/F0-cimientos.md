# Encargo F0 — Cimientos (Finanzas Margen)

Calidad: final. Sin cambios visibles para el usuario.

LEE PRIMERO: AGENTS.md (entero), .mapa/finanzas-margen/mapa.md, plan.md, 02-compatibilidad-compai.md,
03-dinero.md, 08-tests.md, 09-ui.md.

## PASO 0 — commit de documentación
Ya hecho en el intento anterior (7b8993e). Ahora commitea con rutas concretas los cambios de
`.mapa` y `DECISIONES.md` que haya sin commitear (spec de F0 revisada, decisión de tests).
NO añadas "Pendiente implementar/" ni "mockups/" (son de Josema, se quedan sin trackear). En TODO
el encargo: NUNCA `git add -A` ni `git add .`; solo rutas concretas.

## PASO A0 — REPARAR node_modules (el primer intento de F0 lo dejó roto)
El intento anterior modificó package.json/package-lock.json (vitest ^5.0.0, que nunca llegó a
instalarse) y borró node_modules. **vitest queda DESCARTADO.**
1. `git restore package.json package-lock.json` (vuelven a la versión commiteada, sin vitest).
2. `npm ci` UNA vez. Comprueba que existen `node_modules/vite`, `node_modules/typescript`,
   `node_modules/oxlint`, `node_modules/react` y que `npm run build` pasa ANTES de tocar código.
3. Si `npm ci` no deja esos paquetes: PARA. No borres nada más, no edites package.json a mano, no
   experimentes. Reporta `node -v`, `npm -v`, `npm config get omit`, el valor de NODE_ENV y la
   salida de `npm ci`, y termina el encargo.

## PASO A — Tests del motor con el runner NATIVO de Node (cero dependencias)
1. NO instales ninguna dependencia. Script en package.json:
   `"test": "node --test --experimental-strip-types \"src/lib/finance/**/*.test.ts\""`
   (si `node -v` no soporta globs en `--test` o type stripping, adapta el comando al mínimo que
   funcione con esa versión y explícalo en el resumen). Editar el bloque "scripts" de package.json
   es lo ÚNICO que se toca de ese fichero; package-lock.json no debe cambiar.
2. Tests con `import { test, describe } from 'node:test'` y `import assert from 'node:assert/strict'`.
3. Reglas para que Node pueda ejecutar el TS sin compilar, en TODO `src/lib/finance/`:
   imports RELATIVOS con extensión `.ts` (`import { toCents } from './money.ts'`; para las fechas
   `import { getStr } from '../dates.ts'`), NUNCA el alias `@/` dentro de lib/finance; tipos con
   `import type`; nada de enums, namespaces ni parameter properties (solo sintaxis borrable).
4. Excluye `src/**/*.test.ts` de `tsconfig.app.json` (`"exclude"`) para que `tsc -b` no necesite
   los tipos de `node:test`. El resto del código de lib/finance sí se typecheckea con el build.

## PASO B — `src/lib/finance/` (funciones puras, sin React ni localStorage)
- `money.ts`:
  - `toCents(eur: number): number` entero, robusto a coma flotante: toCents(1.005)=101,
    toCents(0.1+0.2)=30, toCents(-12.345)=-1235 (half away from zero), NaN/undefined → 0.
  - `fromCents(c: number): number` → euros con 2 decimales exactos.
  - `roundEuros(n)`, `addEuros(...ns: number[])`, `subEuros(a, b)`, `sumEuros(ns: number[])`, todo vía céntimos.
  - `splitCents(totalCents: number, weights: number[]): number[]` proporcional a weights; la suma
    SIEMPRE == totalCents; el resto al primer participante. splitCents(100,[1,1,1])=[34,33,33];
    splitCents(1000,[50,50])=[500,500]; splitCents(1001,[70,30])=[701,300].
- `dates.ts`: `localISO(d = new Date())` (YYYY-MM-DD hora LOCAL, reutiliza `getStr` de `@/lib/dates`),
  `monthKeyOf(iso)` (YYYY-MM), `addMonthsISO(iso, n)` recortando al último día del mes
  (2026-01-31 +1 → 2026-02-28; 2028-01-31 +1 → 2028-02-29), `daysBetween(aISO, bISO)` entero y sin
  problemas de horario de verano (Date.UTC).
- `types.ts`: MUEVE aquí las interfaces `Tx, Hucha, Pufo, Cuenta, Presupuesto, Recurrente` de
  src/stores/financeStore.ts y re-expórtalas desde financeStore.ts
  (`export type { ... } from '@/lib/finance/types'`) para no romper imports. Añade SOLO opcionales:
  - `Tx`: `kind?: TxKind`, `linkId?: string`, `merchantId?: string`, `importId?: string`,
    `dedupe?: string`, `holdingId?: string`, `debtId?: string`.
  - `Cuenta`: `id?: string`.
  - `export type TxKind = 'transfer' | 'adjust' | 'investment' | 'debt_principal'`
- `flow.ts`: `export function isFlow(tx: { kind?: TxKind }): boolean` → `!tx.kind`.
- Tests `money.test.ts`, `dates.test.ts`, `flow.test.ts` con TODOS los ejemplos de arriba y bordes
  (cero, negativos, weights con cero, un solo participante).

## PASO C — Partir `src/pages/Finanzas.tsx` (988 líneas) SIN CAMBIAR COMPORTAMIENTO NI ESTILOS
- `src/components/finanzas/`: `shared.ts` (MONTHS, MONTHS_SH, monthKey, exportCSV), `SummaryTab.tsx`,
  `MovesTab.tsx`, `TxRow.tsx`, `AnalysisTab.tsx`, `PatrimonioTab.tsx`, `BudgetsTab.tsx`. Código movido
  tal cual (mismo JSX y estilos inline). Export nombrado por componente.
- `src/pages/Finanzas.tsx` queda como shell (cabecera + tab-bar + pestaña + useEffect de
  processRecurrentes), < 120 líneas.

## PASO D — Correcciones pequeñas acordadas
1. Fecha UTC → local: el `todayISO()` de Finanzas (usa toISOString) y en financeStore
   (`updatedAt: new Date().toISOString().slice(0,10)` y `todayStr` de processRecurrentes) pasan a
   `localISO()` de `@/lib/finance/dates`. Motivo: entre 00:00 y 02:00 en Madrid ponía el día anterior.
2. Estadísticas solo sobre flujo: SummaryTab (ingresos, gastos, dona, top categorías), AnalysisTab
   (totales, 6 meses, tasa de ahorro, categorías) y BudgetsTab (gastado) filtran con `isFlow(t)`
   antes de sumar, y suman con `sumEuros`. Las LISTAS de movimientos NO filtran.
3. En financeStore, `cuentasConMovimiento` usa `addEuros` en vez del Math.round manual.

NO TOQUES: formato de claves de localStorage, storageKeys.ts, sync/mirror/realtime, Dashboard,
otras páginas. NINGUNA dependencia nueva. NUNCA `rm -rf node_modules` ni borrar package-lock.json.

## Criterios de aceptación (compruébalos antes de commitear)
- `git diff HEAD -- package-lock.json` vacío; en package.json solo cambia el script "test".
- `npm test` verde (di cuántos tests).
- `npm run build` verde.
- `npm run lint` sin ERRORES (hoy solo hay warnings; el exhaustive-deps de AnalysisTab puede cambiar
  de fichero, no añadas otros).
- `git grep -n "toISOString().slice(0, 10)" src/pages/Finanzas.tsx src/components/finanzas src/stores/financeStore.ts` vacío.
- Finanzas.tsx < 120 líneas.

## Cierre
Commits por tarea lógica (docs / vitest+lib finance / refactor Finanzas), rutas explícitas en git
add, y push a origin main. Resumen final: ficheros creados/modificados, versión de vitest, nº de
tests, y lo que no hayas podido cumplir.
