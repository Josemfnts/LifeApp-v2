# ¿Dónde viven los datos nuevos de Finanzas (cuentas, inversiones, deudas, snapshots…)?

Estado: resuelto
Tipo: investigar

El teardown de Margen propone un esquema Postgres con tablas (`accounts`, `transactions`,
`holdings`, `lots`, `debts`, `net_worth_snapshots`…). LifeApp tiene la regla 3 de AGENTS.md: una
única tabla key-value `store_data`, local-first, sin tablas por dominio (reafirmada el 2026-07-17
al construir el espejo vivo con CompAI).

## Respuesta
Blobs JSON nuevos en `store_data`, uno por colección (`finances_holdings`, `finances_debts`,
`finances_properties`, `finances_nw_snapshots`, `finances_merchants`, `finances_imports`…),
registrados en `storageKeys.ts` y con recargador `onRemoteChange`.

Por qué: (1) Finanzas es local-first y debe funcionar sin sesión, igual que hoy; (2) CompAI ya lee
y escribe `store_data` con control de versión, así que ve los datos nuevos sin tocar life-mcp;
(3) el volumen de un único usuario (miles de movimientos) cabe de sobra en un blob; (4) introducir
tablas rompería una decisión explícita reciente sin necesidad. El esquema del teardown se usa como
**modelo de dominio** (mismos campos), no como esquema físico.
