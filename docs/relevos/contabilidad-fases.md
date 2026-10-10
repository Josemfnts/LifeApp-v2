# Contabilidad por proyecto dentro de Finanzas — plan por fases

Encargo de Josema (2026-10-10): llevar la contabilidad de sus proyectos (Anantara, Clocks,
Asensio, Elevencuts, Yatekomo, Otros) sin salir de LifeApp. Ver de un vistazo **quién le ha
pagado, quién le debe y en qué se le va el dinero**, por proyecto y por mes, con resumen anual.

Una fase por relevo. El arquitecto escribe los tests de aceptación ANTES de lanzar cada fase y
van como **intocables** en el contrato; el ejecutor escribe el código de producto.

## Reglas que mandan (no se negocian en este plan)
- `AGENTS.md`: local-first, claves solo en `src/lib/storageKeys.ts`, **blobs en `store_data`,
  nunca tablas por dominio**, y toda clave nueva cablea su recargador `onRemoteChange`.
- `.mapa/finanzas-margen/02-compatibilidad-compai.md`: en las claves `finances_*` existentes
  **solo se añaden campos opcionales**; `Tx.type` sigue siendo `income|expense` y nada de
  renombrar ni cambiar tipos. Lo que no es flujo se marca con `Tx.kind`.
- `.mapa/finanzas-margen/03-dinero.md`: euros con 2 decimales en disco, **toda la aritmética en
  céntimos** vía `src/lib/finance/money.ts`.
- `.mapa/finanzas-margen/08-tests.md`: tests con `node:test` nativo, solo sobre
  `src/lib/finance/**`; imports relativos con extensión `.ts` (nunca `@/`), solo sintaxis TS
  borrable. **No se instala ninguna dependencia nueva** (en esta máquina `NODE_ENV=production`:
  `npm ci --include=dev`, y jamás borrar `node_modules`).
- `DECISIONES.md` línea 29: `finances_context` es un resumen **< 4 KB** que **solo escribe la
  app**. Si Contabilidad entra ahí (F5), entra como un bloque pequeño y se mide el tamaño.
- `DECISIONES.md` línea 36: navegación nueva con `ChipTabs`; **filas de botones con borde
  prohibidas**. Cifras relacionadas en una `.stat-strip`, no una tarjeta por cifra.
- No se toca `Finanzas.tsx` más allá de añadir la pestaña, ni se reorganizan las 5 pestañas
  existentes (Inicio · Movs · Patrimonio · Plan · Útiles). La `.tab-bar` ya hace scroll
  horizontal: una sexta pestaña cabe.
- `ErrorBoundary` + `vite:preloadError` (main.tsx): no se tocan.

## Decisión de producto pendiente (BLOQUEO para Josema)
**¿Los cobros y gastos de Contabilidad son movimientos reales de Finanzas o un libro aparte?**
Afecta a F1 en adelante; F0 es idéntica en los tres casos, así que F0 arranca ya.

- **(a) Recomendada — movimientos reales con etiqueta de proyecto.** Un cobro es un `Tx`
  `income` y un gasto un `Tx` `expense`, con campo nuevo opcional `project?: ProjectId`; mueven
  la cuenta y cuentan en el patrimonio como hoy. Lo **pendiente** de cobro se apunta como `Pufo`
  `me_debe` con `project` (ya existe en el dominio, ya suma al patrimonio líquido y ya lo ve
  CompAI); marcarlo cobrado lo liquida y genera el ingreso. Ventaja: no se apunta nada dos
  veces, el patrimonio cuadra y life-mcp lo ve sin cambios. Coste: los pufos de clientes
  aparecen también en Patrimonio › Pufos (se distinguen por `project`).
- (b) Movimientos reales con `project`, pero los pendientes en una lista propia
  (`finances_receivables`). Más limpio visualmente, pero lo que te deben deja de sumar al
  patrimonio salvo que se duplique la lógica.
- (c) Libro aparte (`finances_accounting`): Contabilidad no toca cuentas ni patrimonio. Cero
  riesgo, pero cada cobro hay que apuntarlo dos veces si además quiere verlo en Finanzas.

El plan de abajo está escrito para **(a)**. Si Josema elige (b) o (c) cambian F1-F4, no F0.

## Decisiones ya tomadas (no tocan dinero, las toma el arquitecto)
- **Catálogo de proyectos fijo en código** (`src/lib/finance/projects.ts`), seis entradas con id
  en minúsculas y `Otros` siempre al final. Sin pantalla de administración: son los clientes de
  Josema y cambian una vez al año. Si aparece uno nuevo, se añade una línea.
- **Gasto global = sin `project`.** No se marca nada: todo lo que no tenga proyecto (y cualquier
  valor desconocido, p. ej. un proyecto retirado) cae en **Otros** al filtrar
  (`matchesProjectFilter`). Así Contabilidad no obliga a reclasificar nada de lo que ya hay.
- **Entrada**: sexta pestaña `Conta` en la `.tab-bar` de Finanzas, estado local (la navegación
  de Finanzas es por estado, no por ruta; no se añaden rutas a `App.tsx`).
- **Dentro de Conta**: `ChipTabs` de proyecto (Todos + los 6) arriba y `ChipTabs` `Mes` / `Año`
  debajo. La vista Mes apila los tres bloques (Cobros · Gastos · Balance); la vista Año es la
  tabla proyecto × mes con totales.
- El proyecto activo **no se persiste** en F0 (estado en memoria). Si molesta, en F5 se guarda en
  `LOCAL_ONLY_KEYS` (preferencia de UI, no dato de usuario: no va a la nube).

## F0 — La entrada (esta tanda)
Alta de la pantalla y del selector. **Sin cálculos, sin datos nuevos, sin tocar `Tx`.**

- `src/lib/finance/projects.ts` (nuevo, motor puro): `ProjectId`, `PROJECTS`, `OTHER_PROJECT`,
  `PROJECT_FILTER_ALL`, `ProjectFilter`, `isProjectId`, `projectLabel`, `resolveProjectId`,
  `matchesProjectFilter`. Contrato exacto en el test de aceptación.
- `src/components/finanzas/ContabilidadTab.tsx` (nuevo): selector de proyecto + `Mes`/`Año` +
  tres bloques con `EmptyState` ("Los cobros llegan en la fase siguiente"), sin cifras falsas.
- `src/pages/Finanzas.tsx`: una entrada más en el array de pestañas (`conta` → "Conta").
- Pruebas: `src/lib/finance/projects.test.ts` (**intocable**, escrito por el arquitecto, 9 tests)
  + `npm test` entero (200 → 209 verdes), `npm run build`, `npm run lint`.
- Verificación visual: el arquitecto abre Finanzas › Conta en el navegador.

## F1 — El modelo y las marcas
- `Tx.project?: ProjectId` y `Pufo.project?: ProjectId` **opcionales** en
  `src/lib/finance/types.ts` (no se renombra ni se cambia nada existente).
- Selector de proyecto en `QuickAddSheet` y `EditTxSheet` (fila opcional, por defecto sin
  proyecto → el flujo actual no cambia).
- `src/lib/finance/conta.ts`: `filterConta({ txs, pufos, project, month })` y los agregados del
  mes. Tests de aceptación del arquitecto: sumas en céntimos, `flowAmount` (no `t.amount`),
  exclusión de `Tx.kind` (traspasos/inversiones/capital no son cobros ni gastos).
- Deja la vista Mes leyendo datos reales de solo lectura.

## F2 — Cobros (cobrado y pendiente)
- Bloque Cobros: lo cobrado del mes y lo pendiente (pufos `me_debe` con proyecto), por proyecto.
- Alta rápida de **cobro recibido** (ingreso con `project` contra una cuenta) y de **cantidad
  pendiente** (pufo con `project`, sin mover cuenta).
- Marcar un pendiente como cobrado: liquida el pufo y crea el ingreso con la fecha del cobro.
- Hoja de alta con "Guardar y añadir otro" (varios apuntes en la misma sesión, sin cerrar).

## F3 — Gastos
- Bloque Gastos del mes: por proyecto y los globales (sin proyecto), con fecha, concepto e
  importe. Alta rápida de gasto contra el proyecto activo, también con "Guardar y añadir otro".

## F4 — Balance y anualidad
- Balance del mes por proyecto = **cobros realizados − gastos** (lo pendiente se muestra aparte,
  no entra en el balance) y acumulado del año.
- Vista Año: tabla proyecto × mes con totales de fila y columna. Motor con tests de aceptación
  (incluido el e2e de abajo).

## F5 — Cierre
- `finances_context`: bloque `projects` mínimo (por proyecto: cobrado del año, pendiente,
  gastos, balance) **midiendo que el JSON sigue < 4 KB**.
- `AGENTS.md` (sección Finanzas), `ESTADO.md`, `DECISIONES.md` y, si procede, persistir el
  proyecto activo en `LOCAL_ONLY_KEYS`.

## E2E de referencia (se automatiza en F4, se mira a mano en cada fase)
"Abrir Contabilidad, anotar un cobro y un gasto del mes contra Yatekomo, ver el balance del mes".

Automatizable como test del motor (`src/lib/finance/conta-e2e.test.ts`, sin DOM: las funciones
del motor son puras y el store solo las encadena):
1. Estado vacío: una cuenta con 1.000 €, sin movimientos, hoy = 2026-10-10.
2. Cobro de 1.210 € de Yatekomo → `Tx` `income`, `project: 'yatekomo'`, sin `kind`.
3. Gasto de 310,50 € de Yatekomo → `Tx` `expense`, `project: 'yatekomo'`.
4. Pendiente de 500 € de Yatekomo → `Pufo` `me_debe` con `project`, que **no** mueve la cuenta.
5. `balanceOfMonth('2026-10', 'yatekomo')` → cobrado 1.210, gastos 310,50, **balance 899,50**,
   pendiente 500 aparte; el saldo de la cuenta es 1.899,50 €.
6. El mismo balance filtrado por `all` y por `clocks` (que da 0) para probar el filtro.

A mano en el navegador (lo que mira Josema): Finanzas → Conta → Yatekomo → Mes → `+` cobro
1.210 € → `+` gasto 310,50 € → el Balance del mes marca 899,50 € y el acumulado del año lo
recoge; en Año, la fila Yatekomo de octubre cuadra.
