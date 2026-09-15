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
- 2026-09-15 - CORRIGE la anterior: tests con node:test nativo (sin dependencias) en vez de vitest - el primer intento de F0 no logro instalar vitest y dejo node_modules borrado - Claude
- 2026-09-15 - Con dev-mcp caido, Claude termina F2b (importacion) directamente en vez de esperar a OpenCode - el job de OpenCode dejo el parser N43 roto a medias - Josema
- 2026-09-15 - Encargos a OpenCode siempre cortos (motor / store / UI por separado) y revision de logica + prueba en navegador de cada entrega - un encargo largo se colgo y varias entregas "verdes" traian bugs de dinero (id vs indice, floats, comercios sin seed) - Claude
- 2026-09-15 - Importacion N43: el concepto sale de los registros 23 (si no hay, referencia 2/1/documento); ajustar al saldo final del extracto es opcional y viene desmarcado - los codigos y referencias son ruido, y ajustar a ciegas descuadra si hay movimientos posteriores al extracto - Claude
- 2026-09-15 - Importes tecleados o importados: el ultimo separador (punto o coma) es el decimal - cubre 1.234,56 (ES) y 1,234.56 (Revolut/EN) con un solo parser - Claude
- 2026-09-15 - N43: un campo ilegible (fecha, debe/haber, importe, totales, saldo) nunca se lee como 0; la fila se omite con aviso de linea y check.ok=false - un movimiento perdido con el aviso en verde es peor que un aviso amarillo - Claude
- 2026-09-15 - Ids de Tx con nextTxId = max(Date.now(), id maximo + 1) en todas las altas; el ajuste al saldo final de un extracto lleva el importId - editar/borrar buscan por id y Deshacer revierte por importId - Claude
- 2026-09-15 - F3 (inversiones) la escribe Claude directamente, no OpenCode - la sesion de dev-mcp de Claude quedo caducada tras el reinicio del servidor y Josema pidio seguir sin esperar - Josema
- 2026-09-15 - Compras y ventas de inversiones son movimientos kind 'investment' contra la cuenta (mueven saldo, no son gasto ni ingreso); el resultado se ve en el P&L de la posicion, no en el flujo - trampas contables 2 y 4 del teardown - Claude
- 2026-09-15 - Refrescar precios en vivo NO reescribe la foto diaria del patrimonio; la foto se recalcula al abrir Finanzas o al tocar datos - un precio que cambia cada minuto llenaria store_data y el espejo de CompAI de escrituras - Claude
- 2026-09-15 - Recurrentes con lastRun: uno nuevo empieza a generar desde manana y los antiguos sin lastRun solo generan el mes actual; cada ocurrencia se apunta con su fecha real y mueve la cuenta - evitar cargos retroactivos duplicados al migrar - Claude
- 2026-09-15 - Deudas: el plazo restante descuenta las cuotas ya pagadas (no solo los meses transcurridos) - si no, pagar la cuota del mes recalculaba y bajaba la cuota (bug visto en prod) - Claude
- 2026-09-15 - Gastos compartidos: el movimiento sale entero de la cuenta, en estadisticas y presupuestos cuenta solo mi parte (flowAmount) y el resto crea pufos me_debe; los pufos activos suman/restan al patrimonio liquido - modelo de Margen (teardown 5.10) - Claude
- 2026-09-15 - finances_context: la app escribe en store_data un resumen compacto de Finanzas (<4 KB) para CompAI / Agente personal y nadie mas lo escribe - el asistente no debe leer la base de datos entera (teardown 5.11) - Claude
- 2026-09-15 - Avisos de Finanzas locales y solo tres tipos (cargo previsto, presupuesto 80/100 %, resumen del mes), deduplicados en finances_alerts_sent solo local - mas tipos hacen que se desactiven todos (teardown 5.8) - Claude
- 2026-09-15 - Precios en vivo de bolsa/ETF/fondos APARCADOS: se sigue con precio manual (cripto sigue con CoinGecko) - ninguna API gratis sirve desde el navegador; la opcion viable (Yahoo via funcion de Vercel, FT de respaldo) es no oficial y podria bloquearse; investigacion en .mapa/finanzas-margen/05-precios.md - Josema
- 2026-09-15 - Amortizacion anticipada «Reducir plazo»: se guarda en el pago como monthsSaved (campo opcional) y remainingMonths lo resta; sin el campo (pagos antiguos) cuenta como «Reducir cuota» - antes el modo solo cambiaba la simulacion; campo opcional para no romper life-mcp - Claude
