# ESTADO — lifeapp

> Por donde va el proyecto AHORA. Lo reescribe quien termina una fase (Claude, OpenCode
> o Josema). Si algo de aqui ya no es verdad, se corrige: este fichero manda sobre la
> memoria de cualquier agente. Sembrado el 2026-09-09.

## Que es
LifeApp v2 — el cuaderno de vida de Josema (turnos, tareas, finanzas, habitos, diario, nutricion) y futura casa de su asistente personal. FUENTE DE VERDAD de su vida: CompAI la lee via life-mcp. PRIORIDAD ALTA.
Stack real: React 19 + Vite 8 + Zustand + Supabase (store_data key-value). Ver AGENTS.md.

## Piezas
- (una sola app) + `connector/` (Python, relojes, corre en el mini PC)

## Hecho
- Modulos Agenda/Notas/Habitos/Fisico/Nutricion/Finanzas/Comunidad, espejo vivo con CompAI, conector de relojes (ver AGENTS.md §Estado).

## A medias
- **Contabilidad por proyecto** (2026-10-10, encargo nuevo de Josema): pestaña "Conta" en Finanzas para
  llevar la contabilidad de Anantara, Clocks, Asensio, Elevencuts, Yatekomo y Otros — cobrado, pendiente,
  gastos y balance por proyecto y mes, más resumen anual. Plan por fases F0-F5 y relevo en
  `docs/relevos/` (`contabilidad-fases.md` = plan, `2026-10-12-conta-f2.md` = relevo con el encargo de F3
  listo para lanzar).
  - Modelo decidido por Josema: un cobro es un `Tx income` con `project` y un gasto un `Tx expense` con
    `project` (mueven cuenta y patrimonio como cualquier movimiento); lo pendiente de cobro es un
    `Pufo me_debe` con `project` y al marcarlo cobrado se liquida y crea el ingreso. Lo sin marcar cae en
    "Otros" al filtrar: no hay que reclasificar nada de lo ya apuntado.
  - HECHO **F0 la entrada** (e49b779, en prod): catálogo `src/lib/finance/projects.ts` (6 proyectos +
    normalización + filtro), `ContabilidadTab.tsx` (selector de proyecto, Mes/Año, bloques vacíos) y la
    sexta pestaña en `Finanzas.tsx`. 207 tests verdes. **La pantalla no la ha visto nadie todavía**: el
    navegador de Claude no puede pasar del login (solo lectura) — la mira Josema en Finanzas → Conta.
  - HECHO **F1 modelo y marcas** (c4eeaca, en prod): `Tx.project?` y `Pufo.project?` opcionales, motor
    `src/lib/finance/conta.ts` (`contaMonth`/`contaYear`: cobrado, gastado, balance, balance del año y
    pendientes por proyecto y mes, más la tabla proyecto × mes) y selector "Proyecto" en el alta rápida
    (dentro de "Más opciones") y en editar movimiento, con la etiqueta en la fila de Movs. 221 tests.
    Revisado a mano: solo cuenta lo que es flujo (`isFlow`), importes con `flowAmount` (de un gasto
    compartido, mi parte), sumas en céntimos, frontera de mes exacta y lo pendiente nunca en el balance.
    `project` va dentro de las claves `finances_*` que ya existían: ninguna clave nueva, ningún recargador.
    En prod comprobado por el bundle desplegado (`Finanzas-LMbUXc-j.js` trae "Sin proyecto"); **a ojo no
    lo ha visto nadie**: el navegador de Claude no pasa del login. Josema: Finanzas → Movs → + → Más
    opciones → Proyecto.
  - HECHO **F2 las vistas con datos reales** (2defa11 + 7aa415a + pulido 4e5cad0, en prod): la pestaña Conta
    ya enseña números de verdad. `src/lib/finance/conta-view.ts` (modelo de la pantalla: navegación de mes,
    etiquetas, filas, banderas de vacío) y `ContabilidadTab.tsx` reescrito — vista **Mes** con navegador
    ‹ octubre 2026 › (sin flecha al futuro), `.stat-strip` de cobrado · gastos · balance, bloques Cobros ·
    Gastos · Te deben (clic en una fila abre editar movimiento) y el acumulado del año al pie; vista **Año**
    con la tabla proyecto × mes y totales. 235 tests. Revisado a mano: el dinero no se recalcula en ningún
    sitio nuevo (todo sale de `conta.ts`), Conta **solo lee** y no hay claves nuevas ni migraciones.
    El pulido F2.1 corrigió lo que el contrato no veía: los gastos se pintaban con `+` (ahora `−`, como en
    Movs), los totales anuales iban redondeados a 100 € (ahora exactos), una celda con balance 0 parecía un
    mes vacío y al filtrar por un proyecto desaparecían las etiquetas de la tabla.
    En prod: el chunk de Finanzas cambió de hash (`Finanzas-twd1KSy5.js`); **a ojo no lo ha visto nadie** —
    el navegador de Claude no pasa del login. Josema: Finanzas → Conta.
  - HECHO **F3 registrar rápido** (840a36c + pulidos cc0bdfa y e60fcbb, en prod), el corazón del encargo: ya se
    puede **apuntar** desde Conta. Botón `+` en la fila del mes → hoja con `ChipTabs` **Cobro · Pendiente ·
    Gasto** contra el proyecto activo, importe (teclado numérico), concepto, categoría y "Guardar y añadir otro"
    para meter varios seguidos. Borrador puro en `src/lib/finance/conta-draft.ts` (`emptyDraft`, `draftError`,
    `buildContaEntry`, `nextDraft`, `defaultCategory`) + hoja `ContaAddSheet.tsx`. **250 tests.**
    La fecha del apunte es la del mes que estás mirando (hoy si es el mes actual, si no el día 1) y es editable.
    Revisado a mano: el dinero entra por `addTx`/`addPufo` del store (id, saldo de la cuenta, persistencia y
    snapshot ya resueltos), el apunte es un `Tx` corriente sin `kind`/`id`/`split`, la validación vive **solo**
    en el borrador y los importes pasan por `parseEuroInput`+`roundEuros`. Sin claves nuevas ni migraciones.
    Los pulidos corrigieron lo que el contrato no veía: con el filtro en "Todos" el selector de proyecto estaba
    escondido en "Más opciones" y el toast "Elige un proyecto" no tenía salida; la fecha de otro mes no se veía
    en ninguna parte (ahora sale arriba con la nota "Se apunta en el mes que estás viendo"); y la hoja cambiaba
    de forma bajo el dedo porque esas dos decisiones se calculaban del borrador en cada tecla.
    En prod: el chunk de Finanzas cambió de hash (`Finanzas-JGQrtH3r.js`); **a ojo no lo ha visto nadie** — el
    navegador de Claude no pasa del login. Josema: Finanzas → Conta → `+`.
  - SIGUIENTE **F4 cerrar el ciclo del cobro**: marcar un pendiente de "Te deben" como cobrado (liquida el pufo
    con la **fecha real** y crea el ingreso en una sola acción) y borrar un pendiente apuntado por error.
    Comprobado en el store: `settlePufo` (`financeStore.ts:675`) solo marca `settled` con la fecha de hoy y **no
    crea movimiento**, así que F4 añade una acción nueva y **no toca `settlePufo`** (lo usa Patrimonio; cambiarlo
    haría aparecer ingresos de la nada en los pufos ya guardados). Sus tests de aceptación ya están escritos y
    EN ROJO a propósito en `src/lib/finance/conta-settle.test.ts` (13 tests): `npm test` da 250 verdes + 1
    fichero rojo hasta que exista `conta-settle.ts`. No borrar ese test. **Esos 13 tests no se han podido
    ejecutar** (el Bash del arquitecto solo permite git de lectura y no hay `node_modules`): si el ejecutor
    dice que uno es imposible, leerlo antes de insistir. Encargo listo en `docs/relevos/2026-10-12-conta-f3.md`.

- **Finanzas "Margen"** (2026-09-15): replicar todas las funciones de Margen en Finanzas.
  Plan y decisiones en `.mapa/finanzas-margen/` (mapa.md = indice, plan.md = fases F0-F6 con casillas,
  encargos/ = spec de cada fase lista para OpenCode).
  - HECHO y en prod (https://life-app-v2-ten.vercel.app/finanzas): F0 motor `src/lib/finance/` + tests
    `npm test` (node:test) + Finanzas partido en `components/finanzas/`; F1 patrimonio neto con hero animado,
    snapshots diarios (`finances_nw_snapshots`), ajustar saldo y traspasos (`Tx.kind`); F2a-1 motor y store de
    comercios (`finances_merchants`, seed de ~60 comercios).
  - HECHO F2a UI (alta rápida con autocompletado de comercios, editar/borrar movimiento, logos) y
    **F2b importar extractos** (Movs → ⬆): N43 y CSV (BBVA/Revolut/cargo-abono, columnas recordadas por
    banco), revisión con duplicados omitidos y categoría editable, ajuste opcional al saldo final del N43,
    historial con Deshacer (`finances_imports`, `finances_import_maps`). Ambas verificadas E2E en prod el
    2026-09-15 con un N43 sintético.
  - Revisión de Claude de F2b (2026-09-15 tarde), 3 bugs de dinero corregidos: N43 con fecha/importe ilegible
    ya no se pierde con check en verde (38fb831); ids de Tx únicos con `nextTxId` — antes el ajuste al saldo
    final repetía id con un importado y editar/borrar podía tocar otro movimiento (0567745); el ajuste lleva
    `importId` y Deshacer lo revierte (a99b90b). Más: saldo final ilegible ya no se ofrece como 0 €.
    Verificado leyendo código + tests/build de OpenCode; NO re-probado E2E en prod (el navegador de Claude
    solo mira, no puede pasar del login).
  - HECHO **F3 inversiones** (Patrimonio → 📈 Inversiones): posiciones con lotes FIFO, P&L latente/realizado,
    cripto en vivo con CoinGecko (verificado desde el navegador), precio manual con marca de antigüedad, split,
    compra periódica (DCA) al abrir Finanzas, compras/ventas contra cuenta como `kind: investment`
    (`finances_holdings`; caché de precios solo local). Verificado E2E en prod el 2026-09-15.
  - HECHO **F4 deudas e inmuebles**, deudas verificadas E2E en prod el 2026-09-15 (inmuebles solo por tests): (Patrimonio → 💳 Deudas / 🏠 Inmuebles):
    cuota francesa con cuadro exacto, pagar cuota = intereses (gasto) + capital (`debt_principal`), amortización
    anticipada simulada, inmuebles con valor manual o % anual y valor neto de hipoteca (`finances_debts`,
    `finances_properties`). El patrimonio neto suma cartera, deudas e inmuebles. 161 tests.
  - HECHO **F5 planificación** (pestaña Plan), recurrentes/calendario/Inicio verificados E2E en prod el 2026-09-15: presupuestos con rollover y
    niveles 80/100 %, recurrentes semanal/mensual/anual que se apuntan solos con su fecha y mueven la cuenta,
    sugerencias automáticas de recurrentes, calendario con saldo previsto a fin de mes, avisos al abrir la app
    (`checkFinanceReminders`) y bloque "Próximos 7 días" en Inicio (`finances_recurring_dismissed`;
    `finances_alerts_sent` solo local).
  - HECHO y verificado E2E en prod el 2026-09-15 (contexto, simulador hipoteca, informe, compartir gasto → pufos): **F6 útiles** (pestaña Útiles → Análisis · Simuladores · Informe):
    simuladores de préstamo, hipoteca con impacto en tu patrimonio y ahorro; informe mensual imprimible/PDF;
    "👥 Compartir gasto" en el alta rápida (tu parte en estadísticas, pufos para el resto; pufos activos cuentan en el
    patrimonio); `finances_context` (resumen <4 KB para CompAI, solo lo escribe la app). 189 tests.
  - Aviso visto: el selector de color de cuenta recibe `var(--color-acc-blue)` (input type=color exige #hex) — preexistente.

- **Mejora visual global** (2026-09-15, plan en `.mapa/mejora-visual/plan.md`): hechas V1 (cabecera pegada que se
  compacta y barra inferior que se esconde con el scroll), V2 (`ChipTabs`: Físico compacto, CSV a Movs), V3 (filtros
  de la biblioteca de rutinas bajo demanda), V4 (Inicio compacto, 187→125 px), V5 (menos tarjeta dentro de tarjeta:
  `.stat-strip`, listas planas) y V6 (escala tipográfica en tokens y animaciones de pestaña/hoja, que existían en el
  código pero no estaban definidas). Plan cerrado; falta que Josema lo pruebe en su iPhone.
- **life-mcp** (CompAI, c0a0b17, reiniciado por pm2): `finanzas` ya no cuenta traspasos/ajustes/inversiones/capital
  como gasto y usa tu parte en compartidos; tool nueva `finanzas_contexto` (lee `finances_context`). Verificado en vivo.

## Lo siguiente
- Josema: probar la importación con un extracto REAL de su banco (N43 o CSV) — el parser solo se ha
  probado con ficheros sintéticos.
- Verificado E2E en prod el 2026-09-15 (2ª tanda): precios de cripto al abrir Finanzas (foto del día al precio de
  ahora), presupuesto 94 %, inmueble al 4 % anual con hipoteca ligada (valor y patrimonio al céntimo), amortización
  anticipada en ambos modos, venta con realizado, split, compra periódica al abrir y vista de impresión del informe.
  Bug destapado y corregido: «Reducir plazo» guardaba siempre «Reducir cuota» (9033f3d, `DebtPayment.monthsSaved`).
  Nota: tras «Reducir plazo» la cuota real puede quedar ~1 € por debajo de la simulada (plazo en meses enteros).
- Ideas aparcadas en `Pendiente implementar/`: Agente personal, Atajos iOS, Mejora visual global.

## Cuidado con
- life-mcp (fuera del repo) lee/escribe finances_*: no cambiar la forma de campos existentes; lo nuevo va en campos opcionales o claves nuevas.
