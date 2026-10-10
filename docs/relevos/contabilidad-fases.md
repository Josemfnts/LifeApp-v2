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

## Decisión de producto — RESUELTA por Josema (2026-10-10)
**¿Los cobros y gastos de Contabilidad son movimientos reales de Finanzas o un libro aparte?**
Josema elige **(a)**: "Movimientos de Finanzas + pendientes como te deben". El plan de abajo ya
está escrito para esa opción; (b) y (c) quedan descartadas y se conservan solo como registro.

- **(a) ELEGIDA — movimientos reales con etiqueta de proyecto.** Un cobro es un `Tx`
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

## F0 — La entrada · HECHA (2026-10-10, commit e49b779, en origin/main)
Alta de la pantalla y del selector. Sin cálculos, sin datos nuevos, sin tocar `Tx`.

- `src/lib/finance/projects.ts` (nuevo, motor puro): `ProjectId`, `PROJECTS`, `OTHER_PROJECT`,
  `PROJECT_FILTER_ALL`, `ProjectFilter`, `isProjectId`, `projectLabel`, `resolveProjectId`,
  `matchesProjectFilter`. Contrato exacto en el test de aceptación.
- `src/components/finanzas/ContabilidadTab.tsx` (nuevo): selector de proyecto + `Mes`/`Año` +
  tres bloques con `EmptyState`, sin cifras falsas.
- `src/pages/Finanzas.tsx`: una entrada más en el array de pestañas (`conta` → "Conta").
- Pruebas: `src/lib/finance/projects.test.ts` (**intocable**, 8 tests) + `npm test` (207 verdes),
  `npm run build` y `npm run lint` en verde (contrato de dev-mcp).
- Deuda que arrastra: en `projects.ts`, `projectLabel` usa `OTHER_LABEL`, declarado **al final**
  del fichero. Funciona (solo se llama tras inicializar el módulo) pero es TDZ esperando a pasar:
  se sube esa constante arriba al empezar F1.
- Sin verificar a ojo: el navegador de esta sesión es de solo lectura (no puede pulsar "Continuar
  sin cuenta"), así que la pestaña pintada no la ha visto nadie. Lo mira Josema en 3 toques.

## F1 — Modelo y marcas (siguiente; tests de aceptación ya escritos y en rojo)
Deja la contabilidad **marcable**: puedes etiquetar un movimiento con su proyecto desde Movs.
- `src/lib/finance/types.ts`: `Tx.project?: ProjectId` y `Pufo.project?: ProjectId`, **opcionales**
  (nada se renombra; `Tx.type` y `Tx.kind` intactos). Import relativo `./projects.ts`.
- `src/lib/finance/conta.ts` (nuevo): `contaMonth` y `contaYear`. Contrato exacto en
  `src/lib/finance/conta.test.ts` (**intocable**, 14 tests, ya en el repo en rojo): solo flujo
  (`isFlow`), importes con `flowAmount` (nunca `tx.amount`), sumas en céntimos, `balanceAnio`,
  pendientes = pufos `me_debe` activos con fecha ≤ fin de mes, y la tabla proyecto × mes.
- UI: selector de proyecto (opcional, por defecto ninguno) en `QuickAddSheet` y `EditTxSheet`, y
  `TxRow` muestra la etiqueta del proyecto cuando la hay.
- Usable al terminar: marcas un gasto como Yatekomo en Movs y se ve marcado.

## F2 — Las vistas con datos reales
- Vista Mes: selector de mes (‹ octubre ›), los tres bloques leyendo `contaMonth` (listas con
  fecha, concepto e importe), cifras del mes en una `.stat-strip` (cobrado · gastos · balance) y
  lo pendiente aparte, nunca sumado al balance.
- Vista Año: tabla proyecto × mes desde `contaYear`, con totales de fila y columna.
- Usable al terminar: ves cobros, gastos y balance por proyecto y mes de lo que ya tengas marcado.

## F3 — Registrar rápido (el corazón del encargo)
- Botón `+` en Conta → hoja con tres atajos contra el **proyecto activo**: cobro recibido
  (ingreso con `project` contra una cuenta), cantidad pendiente (pufo `me_debe` con `project`,
  sin mover cuenta) y gasto (`expense` con `project`).
- "Guardar y añadir otro": la hoja no se cierra, conserva proyecto y fecha y vacía importe y
  concepto. Varios apuntes en la misma sesión sin pelearse con la UI.
- Con el filtro en "Todos" el `+` pide elegir proyecto antes de guardar (no se inventa "Otros").

## F4 — Cerrar el ciclo del cobro
- Marcar un pendiente como cobrado: liquida el pufo (`settled` + `settledDate`) y crea el ingreso
  con la fecha real del cobro, en una sola acción y sin dobles conteos.
- Editar/borrar un apunte desde Conta reutilizando `EditTxSheet`.

## F5 — Cierre
- `finances_context`: bloque `projects` mínimo (por proyecto: cobrado del año, pendiente, gastos,
  balance) **midiendo que el JSON sigue < 4 KB**; si no cabe, solo los proyectos con movimiento.
- `AGENTS.md` (sección Finanzas), `ESTADO.md`, `DECISIONES.md` y, si molesta no recordar el
  proyecto activo, persistirlo en `LOCAL_ONLY_KEYS` (preferencia de UI, no sube a la nube).
- Avisar a Josema de que life-mcp (fuera de este repo) no conoce `project`: sus sumas no cambian,
  pero tampoco sabrá filtrar por proyecto hasta que se le enseñe.

## E2E de referencia (automatizado en `conta.test.ts` desde F1; a mano en cada fase)
"Abrir Contabilidad, anotar un cobro y un gasto del mes contra Yatekomo, ver el balance del mes".

Ya automatizado como test del motor en `src/lib/finance/conta.test.ts` (sin DOM: el motor es puro
y el store solo lo encadena), con estas cifras:
1. Cobro de 1.210 € de Yatekomo el 2026-10-05 → `Tx` `income`, `project: 'yatekomo'`, sin `kind`.
2. Gasto de 310,50 € de Yatekomo el 2026-10-07 → `Tx` `expense`, `project: 'yatekomo'`.
3. Pendiente de 500 € de Yatekomo → `Pufo` `me_debe` con `project`, que **no** mueve la cuenta.
4. `contaMonth({ month: '2026-10', filter: 'yatekomo' })` → cobrado 1.210, gastado 310,50,
   **balance 899,50**, pendiente 500 aparte.
5. Los mismos datos con `filter: 'all'` (suma los demás proyectos) y con `filter: 'asensio'`
   (ceros, no `undefined`), más el frontera de mes y la tabla anual.

A mano en el navegador (lo que mira Josema): Finanzas → Conta → Yatekomo → Mes → `+` cobro
1.210 € → `+` gasto 310,50 € → el Balance del mes marca 899,50 € y el acumulado del año lo
recoge; en Año, la fila Yatekomo de octubre cuadra.
