# ¿Cómo se importan los extractos bancarios?

Estado: resuelto
Tipo: investigar

Margen importa de BBVA, Santander, CaixaBank, Sabadell, ING, Trade Republic, Revolut y "con IA de
cualquier banco". El teardown recomienda empezar por Norma 43 (determinista y verificable).

## Respuesta
Todo en el cliente, en `src/lib/finance/import/`:
1. **N43** (ancho fijo, registros 11/22/23/33/88): parser propio en TS con verificación de totales
   del registro 33 contra la suma de movimientos. Codificación latin1 (`TextDecoder('iso-8859-1')`).
2. **CSV** genérico: detecta separador (`;` `,` tab), decimal con coma, formatos de fecha
   dd/mm/yyyy y yyyy-mm-dd, columnas importe único o cargo/abono. Si no puede, el usuario mapea
   columnas en la hoja y el mapeo se guarda por nombre de banco en `finances_import_maps`.
3. **Deduplicación**: `dedupe = hash(cuenta|fecha|céntimos|concepto normalizado[:40]|ordinal)`;
   se omiten los que ya existen y la revisión muestra "N omitidos por duplicados".
4. **Revisión obligatoria** antes de aplicar (categoría y comercio sugeridos editables).
5. **Deshacer**: todo movimiento importado lleva `importId`; deshacer borra esos y revierte saldos.

Por qué: N43 lo exportan todos los bancos españoles y valida sumas; CSV cubre neobancos/brokers.
La IA para PDFs queda fuera de la app (decisión 07).
