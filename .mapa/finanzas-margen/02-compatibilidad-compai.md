# ¿Cómo cambiamos los movimientos y cuentas sin romper a CompAI?

Estado: resuelto
Tipo: investigar

life-mcp (fuera de este repo) lee y escribe `finances_tx`, `finances_cuentas`, etc. con la forma
actual (`Tx.type: 'income'|'expense'`, `Tx.cuenta` = nombre de cuenta, importes en euros). Margen
necesita traspasos, aportaciones a inversión, capital de deuda y ajustes, que NO son gasto.

## Respuesta
En las claves existentes **sólo se añaden campos opcionales**; nunca se renombra ni se cambia el
tipo de uno existente.

- `Tx.type` sigue siendo `income|expense` (cada pata de un traspaso es un gasto en origen y un
  ingreso en destino, así los saldos cuadran también para un lector viejo).
- Campo nuevo opcional `Tx.kind?: 'transfer' | 'adjust' | 'investment' | 'debt_principal'`. Sin
  `kind` = flujo normal. Todo lo que tenga `kind` se **excluye** de ingresos/gastos/tasa de ahorro/
  presupuestos.
- Otros opcionales: `linkId` (une patas), `merchantId`, `importId`, `dedupe`, `holdingId`,
  `debtId`, `split`.
- `Cuenta` gana `id?` estable; `Tx.cuenta` sigue guardando el nombre (compat) y al renombrar una
  cuenta se reescriben sus movimientos.

Por qué: es la única vía que no obliga a desplegar life-mcp a la vez. Coste asumido: hasta que
life-mcp conozca `kind`, sus sumas contarían un traspaso como gasto (apuntado en Niebla).
