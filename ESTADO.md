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
- **Contabilidad por proyecto** — pestaña "Conta" en Finanzas. **Plan F0-F5 CERRADO el 2026-10-12**, todo en
  `origin/main` y en prod. Qué hace: cobros, gastos, pendientes y balance por proyecto (Anantara · Clocks ·
  Asensio · Elevencuts · Yatekomo · Otros) y mes, tabla del año, apuntar desde la propia pestaña y cobrar un
  pendiente. Cómo está hecho: `AGENTS.md` §Finanzas → Conta. Plan y detalle fase a fase:
  `docs/relevos/contabilidad-fases.md` + los relevos `2026-10-1x-conta-f*.md`.
  - Modelo (decisión de Josema): un cobro es un `Tx income` con `project` y un gasto un `Tx expense` con
    `project`; lo pendiente es un `Pufo me_debe` con `project` y al cobrarlo se liquida y crea el ingreso.
    **Ninguna clave nueva de datos, ninguna migración**; lo sin marcar cae en "Otros" al filtrar.
  - Commits: `e49b779` F0 · `c4eeaca` F1 · `2defa11`+`7aa415a`+`4e5cad0` F2 · `840a36c`+`cc0bdfa`+`e60fcbb` F3 ·
    `ed4f7c7`+`c8b182d` F4 · `6691e2c` F5. **271 tests** verdes (de 207 al empezar).
  - F5 añadió el bloque `projects` a `finances_context` (una línea por proyecto con movimiento del año, como
    proyección de `contaYear`, con el presupuesto de 4 KB medido en test) y `conta_project` en
    `LOCAL_ONLY_KEYS` (recuerda el proyecto filtrado; el mes NO se persiste, siempre abre en el de hoy).
  - **Nadie lo ha visto a ojo**: el navegador de Claude es de solo lectura y no pasa del login. Lo que falta
    está en "Lo siguiente".

## A medias
- **Conta, segunda vuelta** (2026-10-14, plan en `.mapa/conta-proyectos/plan.md`): nace de lo que
  pidió Josema ese día — registrar lo que cada cliente **tiene que** pagarle al mes, marcarlo
  cobrado, y poder **crear proyectos** ("por ejemplo el de 3D").
  - **Fase A — catálogo vivo** (clave `finances_projects`, alta/renombrar/archivar desde Conta,
    `ProjectId` deja de ser unión literal): tests de aceptación commiteados en rojo (`99eb5c2`,
    `src/lib/finance/projects-catalog.test.ts`) y **lanzada** como `job_mv78uwmtf266`.
  - **Fase B — cuotas mensuales**: tests en rojo commiteados (`e7a7005`,
    `src/lib/finance/quotas.test.ts`) y ficha en `encargo-B.md`. **Sin lanzar**: toca los mismos
    ficheros que A, así que va después. Modelo: la cuota genera un pendiente, no un ingreso.
  - **Fase C (repo `compai`)**: `life-mcp` valida el proyecto contra un enum de seis ids y se
    queda corto en cuanto Josema cree uno; además su `gasto_add` no tiene `proyecto` y no sabe
    escribir cuotas. Es la vía para cargarle las cifras sin teclear y sin pasar por el repo.
  - Las cifras de sus clientes **no entran en este repo** (es público): viven en Supabase y en el
    grafo de memoria (hechos #122558-#122560 del 14/10).

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
- **Conta, en manos de Josema** (es lo único que falta del encargo): mirarlo en el móvil — Finanzas → Conta →
  apuntar un cobro, un gasto y un pendiente, **cobrar un pendiente de verdad** (lo único de F4 que nadie ha
  visto a ojo) y ver la tabla del Año en vertical (si la columna `sticky` molesta cuando la tabla cabe entera).
  Decisiones suyas que quedan en el aire: si quiere que la vista Año enseñe también lo que le deben (hoy, a
  propósito, solo sale en Mes) y si quiere **cobro parcial** (hoy se cobra el importe entero; es otra fase).
- **life-mcp ya entiende `project`** (fuera de este repo: proyecto **`compai`**, `life-mcp/`,
  commit `e064f97`, 20 tests): filtro `proyecto` en la tool `finanzas`, tool nueva
  `finanzas_proyectos` (un año por proyecto) y el bloque `projects` del contexto pintado en texto.
  Solo lectura. Revisado a mano en `docs/relevos/2026-10-12-conta-f5.md`. **Reiniciado y corriendo**
  desde el 13/10 10:27 (`/health` 200). Aviso de dato, no de código: Josema **no tiene ningún
  movimiento** en `finances_tx` y su `finances_context` es del 08/10 sin el bloque `projects`, así
  que CompAI contestará "sin movimientos por proyecto" hasta que apunte el primer cobro en Conta
  (el store reescribe el contexto 2 s después de un cambio, no al abrir). Sus 5 pendientes de
  1.035 € no llevan `project` y **un pufo ya creado no se puede marcar** (solo los movimientos, con
  `EditTxSheet`): candidato a fase siguiente. Falta también la línea en el `AGENTS.md`/`DECISIONES.md`
  de `compai`, que solo puede escribir una sesión abierta ahí.
  - Para la próxima tanda de life-mcp: el reinicio NO lo puede hacer un job de dev-mcp (su pm2 es
    otro demonio; `job_mv5bv2bl92m9` lo intentó y falló con el contrato en verde) y se comprueba por
    **uptime**, no por "el comando no dio error".
- Límite conocido (no es regresión): un pufo marcado liquidado **desde Patrimonio** no genera ingreso, como
  siempre. Solo el botón "Cobrar" de Conta cierra el ciclo. Si confunde al usarlo, se unifica en otra fase.
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

## Rediseño visual IMPULSO — 16/10/2026

Implementadas las cuatro entregas, con identidad de `Guia_Visual/`, nombre LifeApp y funciones conservadas. Temas GLOBAL Claro/Oscuro/Negro OLED desde Ajustes; Físico no fuerza oscuro. Referencias permanentes: `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json` y `.mapa/rediseno-impulso/mapa.md`. Skills: Impeccable y frontend-design de Anthropic.

Base e Inicio/Agenda (`a92b597`, `c6430bd`, `8b061c8`, `b5aa214`), Físico/Nutrición (`ec9f230`, `c727c6a`) y Finanzas/cobertura (`264dac6`) revisados. Correcciones finales `6db0bef`: contraste, iconografía y metadatos. Ancho escritorio 880 px, safe-area y movimiento reducido conservados. Sin cambios de stores, esquema, protocolos ni formatos consumidos por CompAI.

Verificación: build/lint y 306 tests verdes; revisión React/TypeScript sin P1/P2 abiertos. Capturas de los cinco módulos a 390×844 y 1440×1000 en claro/oscuro, sin overflow ni errores de página. Negro OLED persistido tras recarga y respetado en las cinco rutas. Pruebas aisladas con datos sintéticos: balance de Inicio excluye traspasos/respeta split; meta nutricional real; sesión libre y añadir ejercicio/serie; registrar alimento y calendario; Conta cobra125€, liquida pendiente y crea ingreso/cuenta 125 €. Seis pestañas de Finanzas comprobadas a 360 px. No se ha repetido E2E autenticado contra Supabase de Notas/Comunidad/Salud en esta sesión; gates y código revisados.

Revisión visual independiente cerrada: `fix` inicial (contraste ámbar, iconos secundarios, metadatos) → tres hallazgos resueltos y veredicto `ship`, con 22 capturas válidas. Documentación de diseño extraída y validada por agente independiente. Producción verificada: HTTP 200/CSS final, navegación en oscuro, gates de Notas y Comunidad sin errores. Resultado y límites en `.impeccable/review/resultado.md`. `Replicar_nudgio/` apareció como trabajo ajeno durante la sesión: no se incorpora ni modifica; oxlint puede emitir avisos de sus JS descargados.
