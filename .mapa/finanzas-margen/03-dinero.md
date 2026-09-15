# ¿Guardamos el dinero en céntimos enteros como pide el teardown?

Estado: resuelto
Tipo: investigar

El teardown exige `BIGINT` en céntimos para no derivar por redondeo. Hoy todos los blobs guardan
euros como `number` con decimales, y CompAI escribe en ese formato.

## Respuesta
**Formato en disco: euros (number, redondeado a 2 decimales).** **Aritmética: céntimos enteros.**
`src/lib/finance/money.ts` expone `toCents`, `fromCents`, `sumEuros`, `addEuros`, `splitCents`
(reparto con el resto al primero) y todo cálculo de sumas/saldos/cuotas pasa por ahí.

Por qué: cambiar la unidad en disco rompería a CompAI y a los datos existentes, y mezclar
unidades entre claves viejas y nuevas es peor que cualquier deriva. Sumando en enteros y
redondeando al guardar se elimina la deriva, que es lo que el teardown quiere evitar.
Cantidades de activos (acciones, cripto) van como `number` sin redondear: float64 da ~15 dígitos,
suficiente para uso personal.
