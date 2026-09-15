# DECISIONES — lifeapp

> Append-only: una linea por decision, la nueva SIEMPRE al final, y nunca se reescribe
> lo de arriba. Formato: fecha - que se decidio - por que - quien.
> Lo que Josema decida por el canal humano (Telegram o TheLab) se apunta aqui el mismo dia.

- 2026-09-09 - Se adopta ESTADO.md + DECISIONES.md como memoria del proyecto en el repo - la conversacion de cada agente se borra y el repo es lo unico que queda - Josema
- 2026-09-15 - Replicar en Finanzas todas las funciones de Margen (teardown en Pendiente implementar/FInanzas pro) por fases F0-F6; plan en .mapa/finanzas-margen/ - encargo de Josema - Josema
- 2026-09-15 - Datos nuevos de Finanzas como blobs finances_* en store_data, sin tablas por dominio - respeta la regla local-first y el espejo vivo con CompAI - Claude
- 2026-09-15 - En claves finances_* existentes solo campos opcionales nuevos; Tx.type sigue income|expense y lo no-flujo (traspaso, ajuste, inversion, capital de deuda) se marca con Tx.kind y se excluye de estadisticas - no romper life-mcp - Claude
- 2026-09-15 - Dinero en euros con 2 decimales en disco, aritmetica en centimos enteros (lib/finance/money.ts) - compat con datos y CompAI sin deriva de redondeo - Claude
- 2026-09-15 - Snapshot diario de patrimonio inmutable calculado en cliente (finances_nw_snapshots) - no hay backend ni cron - Claude
- 2026-09-15 - Precios: cripto en vivo con CoinGecko desde cliente; bolsa/fondos con precio manual; proveedor de bolsa en vivo pendiente de clave de Josema - sin coste ni claves - Claude
- 2026-09-15 - Importacion N43 + CSV en cliente con revision obligatoria, dedupe y deshacer; IA de PDFs, widget iPhone, asesor IA y amigos/cuentas compartidas quedan fuera de la app - requieren servidor/claves/multiusuario - Claude
- 2026-09-15 - Se anade vitest solo para src/lib/finance (motor puro) - el dinero debe cuadrar al centimo y no habia tests - Claude
