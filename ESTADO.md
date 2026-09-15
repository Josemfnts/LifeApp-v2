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
  - HECHO F2a-2 UI (alta rápida con autocompletado de comercios, editar/borrar movimiento, logos),
    verificado E2E en prod el 2026-09-15.
  - A MEDIAS F2b-1: `src/lib/finance/import/types.ts` commiteado; `n43.ts` + `n43.test.ts` SIN commitear
    (job de OpenCode cortado cuando cayó dev-mcp; 8/9 tests, falla isN43). Revisar antes de seguir.
  - Aviso visto: el selector de color de cuenta recibe `var(--color-acc-blue)` (input type=color exige #hex) — preexistente.

## Lo siguiente
- F2b importación N43/CSV → F3 inversiones → F4 deudas/inmuebles → F5 planificación → F6 útiles
  (la primera casilla sin marcar en plan.md; cada spec en `.mapa/finanzas-margen/encargos/`).
- Ideas aparcadas en `Pendiente implementar/`: Agente personal, Atajos iOS, Mejora visual global.

## Cuidado con
- life-mcp (fuera del repo) lee/escribe finances_*: no cambiar la forma de campos existentes; lo nuevo va en campos opcionales o claves nuevas.
