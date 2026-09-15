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
  de la biblioteca de rutinas bajo demanda) y V4 (Inicio compacto, 187→125 px). Quedan V5 superficies y V6 tipografía/motion.
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
