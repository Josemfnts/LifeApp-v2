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
  - HECHO en código, SIN verificar en prod aún: **F4 deudas e inmuebles** (Patrimonio → 💳 Deudas / 🏠 Inmuebles):
    cuota francesa con cuadro exacto, pagar cuota = intereses (gasto) + capital (`debt_principal`), amortización
    anticipada simulada, inmuebles con valor manual o % anual y valor neto de hipoteca (`finances_debts`,
    `finances_properties`). El patrimonio neto suma cartera, deudas e inmuebles. 161 tests.
  - Aviso visto: el selector de color de cuenta recibe `var(--color-acc-blue)` (input type=color exige #hex) — preexistente.

## Lo siguiente
- Josema: probar la importación con un extracto REAL de su banco (N43 o CSV) — el parser solo se ha
  probado con ficheros sintéticos.
- Verificar F4 en prod → F5 planificación → F6 útiles (la primera casilla sin marcar en
  plan.md; cada spec en `.mapa/finanzas-margen/encargos/`). Encargos cortos (motor / store / UI).
- Ideas aparcadas en `Pendiente implementar/`: Agente personal, Atajos iOS, Mejora visual global.

## Cuidado con
- life-mcp (fuera del repo) lee/escribe finances_*: no cambiar la forma de campos existentes; lo nuevo va en campos opcionales o claves nuevas.
