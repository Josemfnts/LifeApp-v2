# Finanzas "Margen" en LifeApp

## Destino
El módulo Finanzas de LifeApp cubre **todas** las funciones de Margen (teardown en
`Pendiente implementar/FInanzas pro/margen-teardown-y-plan-life-app.md`) sobre lo que ya existía,
sin romper las claves `finances_*` que consume CompAI, con `build` + `lint` + tests del motor en
verde y cada fase comprobada en el navegador.

## Notas
- Plan de ejecución por fases e inventario función a función: [plan.md](plan.md).
- Contexto de las 4 ideas de `Pendiente implementar/`: **Finanzas pro** (esto), **Mejora visual**
  (se aplica ya a Finanzas: hojas inferiores, menos chrome, cifra protagonista), **Agente personal**
  (el motor deja un `buildFinanceContext()` para él) y **Atajos iOS** (sustituye al widget de
  iPhone de Margen). Las otras tres NO se ejecutan en este esfuerzo.
- Reglas que mandan (AGENTS.md): local-first, claves en `storageKeys.ts`, blobs en `store_data`,
  espejo vivo → toda clave nueva cablea su recargador con `onRemoteChange`.
- La app es React 19 + Vite (no Next.js). No había tests: se añaden sólo para el motor puro.

## Decisiones tomadas
- [01 · Dónde viven los datos](01-donde-viven-los-datos.md): blobs nuevos `finances_*` en `store_data`, sin tablas por dominio.
- [02 · Compatibilidad con CompAI](02-compatibilidad-compai.md): en las claves existentes sólo campos opcionales nuevos; `Tx.type` sigue siendo `income|expense`, lo no-flujo se marca con `kind`.
- [03 · Cómo se guarda el dinero](03-dinero.md): euros con 2 decimales en los blobs; toda la aritmética en céntimos enteros en `lib/finance/money.ts`.
- [04 · Cómo se construye el histórico de patrimonio](04-snapshots.md): foto diaria inmutable calculada en cliente al abrir la app, hora de Madrid.
- [05 · De dónde salen los precios](05-precios.md): cripto en vivo con CoinGecko desde el cliente; bolsa/fondos con precio manual y marca de frescura.
- [06 · Cómo se importan extractos](06-importacion.md): N43 y CSV parseados en cliente, revisión obligatoria, deduplicación por hash y deshacer por importación.
- [07 · Qué se queda fuera de la app](07-fuera-de-la-app.md): widget → Atajos iOS; asesor IA → CompAI con `buildFinanceContext()`; amigos/cuentas compartidas → no (single-user).
- [08 · Cómo se prueba](08-tests.md): runner nativo `node:test` (sin dependencias) sólo sobre `src/lib/finance/**`; vitest descartado tras fallar su instalación.
- [09 · Cómo se ve Finanzas](09-ui.md): 5 pestañas (Inicio · Movs · Patrimonio · Plan · Útiles), formularios en hojas, Finanzas.tsx partido en `components/finanzas/`.

## Niebla
- Proveedor de cotizaciones de bolsa/ETF en vivo (Twelve Data necesita clave de Josema). Hasta entonces, precio manual.
- Índice INE de vivienda automático (API INE con CORS sin verificar): de momento % de revalorización manual.
- Importación con IA de PDFs/CSV raros: la haría CompAI, no la app.
- life-mcp (fuera de este repo) debería conocer las claves nuevas y el campo `kind` para no contar traspasos como gasto.
