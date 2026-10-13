# Encargo B — La cuota mensual de cada proyecto (lo que le TIENEN que pagar)

> Ficha del arquitecto para el ejecutor. 14/10/2026. Va DESPUÉS de la fase A (catálogo vivo):
> toca los mismos ficheros, así que no se solapan. Plan: [plan.md](plan.md).

## Por qué
Josema, 14/10/2026: *"esto de la contabilidad de proyectos es para registrar lo que me tienen que
pagar cada mes… y yo marcarlo cobrado y poder añadir más si eso"*. Hoy Conta sabe apuntar lo que
ya pasó; lo que falta es lo que **debería** pasar cada mes y el aviso de lo que no ha entrado.

## El modelo (entiéndelo antes de tocar nada)
Una cuota **no se apunta sola como ingreso**. Los recurrentes que ya existen
(`finances_recurring`) crean el movimiento y mueven el saldo de la cuenta porque son cargos
ciertos; un cobro de cliente no es cierto hasta que entra. Si se apuntara solo, el patrimonio
enseñaría dinero que no ha llegado.

Entonces: **cuota → pendiente de cobro (`Pufo me_debe` con `project`) → botón "Cobrar" de F4 →
ingreso**. Ese botón ya existe y ya crea el `Tx income` con su proyecto, su fecha real y el
movimiento de cuenta (`cobrarPufo` en el store, F4). Esta fase solo añade quién genera los
pendientes.

## Estado: el MOTOR YA ESTÁ HECHO (14/10, commit `d10ebaf`)
`src/lib/finance/quotas.ts` existe y sus tests pasan: `dueQuotaPufos` y `quotaMonthlyTotal` con el
rango `startDate`/`lastRun`→hoy, la idempotencia, el cinturón de duplicados por mes, el tope de 24
y el redondeo de las anuales. `Pufo.quotaId?: number` ya está en `types.ts`.
**Lo que queda de esta fase es todo lo demás**: la clave `finances_quotas` con su recargador, la
generación al abrir Finanzas y la pantalla en Conta. El contrato del motor NO se toca.

## Tests de aceptación (INTOCABLES)
`src/lib/finance/quotas.test.ts`. No se edita ni una línea. Si algo parece imposible o
contradictorio, se lee y se pregunta en el informe.

Las cifras de ese fichero son inventadas **a propósito**: el repo es público y los importes de
los clientes de Josema no entran en el código (ni en tests, ni en semillas, ni en comentarios).

## Contrato de `src/lib/finance/quotas.ts` (fichero nuevo, puro)
```ts
export interface Quota {
  id: number
  project: ProjectId
  amount: number                      // euros
  day: number                         // día del mes (1-31, recortado a fin de mes)
  freq?: 'monthly' | 'yearly'         // sin freq = mensual
  startDate: string                   // YYYY-MM-DD: desde cuándo se cobra
  active: boolean
  concept?: string                    // por defecto "Cuota <Proyecto>"
  lastRun?: string                    // última ocurrencia ya generada
}

export interface QuotaRun {
  pufos: Omit<Pufo, 'id'>[]           // los pendientes que faltan, en orden de fecha
  lastRunByQuota: Record<number, string>
}

// Puro: decide, no escribe. El id del pufo lo pone el store.
export function dueQuotaPufos(quotas: readonly Quota[], pufos: readonly Pufo[], todayISO: string): QuotaRun
export function quotaMonthlyTotal(quotas: readonly Quota[]): number   // anuales repartidas /12
```
Reutiliza `occurrences()` de `recurring.ts` para el calendario (ya está probado: día recortado a
fin de mes, mensual/anual, nunca antes de `startDate`). **No** uses `dueOccurrences`: esa, sin
`lastRun`, se limita al mes en curso, y aquí hace falta lo retroactivo desde `startDate`.

Reglas que los tests clavan:
1. Genera desde `startDate` (o desde `lastRun` si lo hay) hasta HOY. Nunca el futuro.
2. Idempotencia por `lastRun`: lo ya generado no vuelve a salir, **aunque Josema haya borrado el
   pendiente** (si lo borró, fue a propósito).
3. Cinturón extra: si ya existe un pufo de esa cuota (`quotaId`) en ese **mes**, no se duplica,
   esté cobrado o no. Un pendiente apuntado a mano (sin `quotaId`) no bloquea nada.
4. Cuota inactiva: ni pendientes ni movimiento de `lastRun`.
5. Tope de 24 ocurrencias por cuota y pasada, quedándose con las últimas: una fecha de inicio
   antigua no puede inundar la app.
6. Importes en céntimos (`money.ts`), sin arrastre de coma flotante.
7. El pufo generado trae `who`, `person` y `concept` rellenos (la lista de Patrimonio los pinta).

## Datos
- `src/lib/finance/types.ts`: `Pufo` gana `quotaId?: number` (de qué cuota nació). Nada más
  cambia de forma: **life-mcp lee estas claves** y no se le puede mover un campo existente.
- `src/lib/storageKeys.ts`: `finances_quotas` en `STORE_KEYS` + etiqueta `'Finanzas'`.
- `src/stores/financeStore.ts`: estado `quotas`, acciones de alta/edición/borrado/activar, el
  **recargador obligatorio** de `finances_quotas` (invariante del espejo vivo) y el paso de
  generación: al abrir Finanzas —donde ya se generan los recurrentes— aplicar `dueQuotaPufos`,
  crear los pufos con un id único (el mismo patrón que `nextTxId`) y guardar los `lastRun`. Si no
  hay nada que generar, **no se escribe ninguna clave** (si no, el espejo vivo y CompAI reciben
  ruido en cada apertura).

## Pantalla (pestaña Conta)
- Bloque "Cuotas": una línea por proyecto con importe, periodicidad, día y "desde"; alta,
  edición, activar/desactivar y borrar (con `ConfirmDialog`, nunca `confirm()`). Arriba, el total
  mensual previsto (`quotaMonthlyTotal`).
- Lo pendiente del mes se enseña con su botón "Cobrar" (reutiliza `CobrarPufoSheet` de F4).
- Atajo que pidió Josema para no teclear el pasado: **"dar por cobrado lo anterior a este mes"**,
  que liquida de golpe los pendientes generados de meses anteriores llamando a la acción de F4
  (una por una: el ingreso de cada mes va con su fecha). Es dinero, así que va con
  `ConfirmDialog` diciendo cuántos pendientes y cuánto dinero en total.
- El alta de cuota propone el proyecto del filtro activo, día 1 y "desde" el mes en curso.

## Fuera de esta fase
- Importes reales de clientes (van por la pantalla o por CompAI, nunca por el repo).
- Cobro parcial (sigue siendo el importe entero, decisión del 12/10).
- Marcar con proyecto un pufo que ya existe: los que tiene vivos Josema son dinero personal
  (dicho por él el 14/10), así que no corre prisa.
- Borrado de proyectos, `supabase/migrations/` (no hace falta), `globals.css`, los motores
  `conta*.ts` y `money.ts`, cualquier `*.test.ts` ya existente, `package.json` y las dependencias.
- `AGENTS.md`, `ESTADO.md`, `DECISIONES.md`, `docs/relevos/`, `CLAUDE.md`: los escribe el arquitecto.

## Hecho =
1. `npm test` entero en verde (quotas.test.ts + todo lo que ya pasaba, sin regresiones).
2. `npm run build` limpio y `npm run lint` sin avisos nuevos.
3. En el informe: ficheros cambiados y, en una línea, qué hace Josema para registrar la cuota de
   un cliente y marcarla cobrada.
