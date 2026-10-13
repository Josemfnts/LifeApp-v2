# Conta, segunda vuelta: proyectos propios + lo que me deben pagar cada mes

> Plan del arquitecto, 14/10/2026. Nace de lo que pidió Josema ese día:
> *"esto de la contabilidad de proyectos es para registrar lo que me tienen que pagar cada mes…
> y yo marcarlo cobrado y poder añadir más si eso. Además debo poder crear proyectos, por
> ejemplo el de 3D"*. La primera vuelta (F0-F5, cerrada el 12/10) está en
> `docs/relevos/contabilidad-fases.md`.

## Fase A — el catálogo de proyectos es suyo, no del código
Ficha: [encargo-A.md](encargo-A.md). Tests de aceptación ya commiteados en rojo
(`src/lib/finance/projects-catalog.test.ts` + el de F0 adaptado).
Clave nueva `finances_projects`, altas/renombrar/archivar desde Conta, `ProjectId` deja de ser
una unión literal. Semilla: los cinco clientes de siempre + **3D** + el cajón Otros.

Estado: **lanzada** (ver `docs/relevos/` de esta tanda para el job).

## Fase B — la cuota mensual de cada proyecto
Lo que de verdad pidió: registrar lo que cada cliente **tiene que** pagarle al mes, que cada mes
aparezca como pendiente y que él lo marque cobrado.

Decisión de modelo (arquitecto, 14/10/2026): **la cuota NO se apunta sola como ingreso.** Los
recurrentes que ya existen (`finances_recurring`) crean el movimiento y mueven la cuenta, porque
son cargos ciertos; un cobro de cliente no es cierto hasta que entra. Así que la cuota genera un
**pendiente de cobro** (`Pufo me_debe` con `project`) y el botón "Cobrar" de F4 —que ya existe y
ya crea el ingreso con su proyecto— cierra el ciclo. Así el patrimonio nunca enseña dinero que
no ha llegado, y lo que él tiene que hacer cada mes es un toque.

Piezas previstas:
- clave `finances_quotas`: `{ id, project, amount, day, freq: 'monthly' | 'yearly', startDate, active }`;
- motor nuevo `src/lib/finance/quotas.ts` apoyado en `occurrences`/`dueOccurrences` de
  `recurring.ts` (el calendario ya está probado: día recortado a fin de mes, anual, `lastRun`),
  que decide qué pendientes faltan e **idempotente**: abrir la app diez veces no duplica nada;
- generación al abrir Finanzas, como los recurrentes, pero escribiendo pufos;
- pantalla en Conta: la cuota de cada proyecto, con su "desde cuándo", y lo pendiente del mes;
- retroactivo: una cuota con `startDate` en agosto genera también los pendientes de los meses
  pasados, para poder marcar cobrado lo que ya se cobró sin teclear movimiento a movimiento;
- de paso, el hueco detectado el 13/10: **marcar con proyecto un pendiente que ya existe**
  (`PatrimonioTab` no toca `project`, así que los pufos vivos de Josema están todos en "Otros").

## Las cifras no van al repo
El repositorio es **público** en GitHub (comprobado el 14/10/2026: la API contesta 200 sin
credenciales). Lo que cobra Josema de cada cliente es dato de clientes reales —una clínica entre
ellos—, así que **ningún importe ni nombre de cliente con precio entra en el código, ni en una
migración, ni en un fichero de semilla**. Los mete él desde la pantalla de la fase B, o llegan
por canal privado (Telegram/TheLab) a un importador. Esto no es una precaución teórica: la
semilla con sus cuotas era el camino cómodo y es el que queda descartado.

## Lo que CompAI todavía no sabe
`life-mcp` (repo `compai`) valida el proyecto contra un **enum de seis ids**. En cuanto Josema
cree uno nuevo, ese enum se queda corto y la tool lo mandará a "Otros". Hay que pasarlo a texto
libre resuelto contra la lista que escriba la app. Es una tanda aparte en `compai`, pequeña, y va
después de la fase A.
