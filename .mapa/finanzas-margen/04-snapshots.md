# ¿Cómo se construye el histórico del patrimonio sin backend ni cron?

Estado: resuelto
Tipo: investigar

Margen guarda una foto diaria inmutable del patrimonio (cron nocturno). LifeApp no tiene servidor
propio; el conector del mini PC existe pero sólo para relojes.

## Respuesta
Foto diaria en `finances_nw_snapshots` calculada **en cliente**: cada vez que el store de finanzas
cambia o se abre la app, se recalcula y se escribe la fila de **hoy** (fecha local, Europe/Madrid
por el reloj del dispositivo). Las filas de días pasados **nunca** se reescriben. Si hay días sin
abrir la app, la gráfica los interpola (no se inventan filas).

Además, al instalar la feature por primera vez se siembra un histórico **estimado** reconstruyendo
saldos hacia atrás desde los movimientos de las cuentas (12 meses), marcado `estimated: true` y
dibujado distinto.

Por qué: cero infraestructura, funciona offline y respeta la regla de inmutabilidad. Límite
asumido: si no abres la app en una semana, esa semana no tiene foto propia.
