# Relevo 2026-10-14 · Conta segunda vuelta: proyectos propios + cuotas mensuales

## El encargo (Josema, 14/10/2026, él tomó la batuta)
*"Esto de la contabilidad de proyectos es para registrar lo que me tienen que pagar cada mes…
y yo marcarlo cobrado y poder añadir más si eso. Además debo poder crear proyectos, por ejemplo
el de 3D."* Partido en tres fases: plan en `.mapa/conta-proyectos/plan.md`.

## Fase A — catálogo vivo (EN MARCHA, contrato en rojo)
Tests de aceptación commiteados: `src/lib/finance/projects-catalog.test.ts` (+ el de F0 adaptado),
ficha en `.mapa/conta-proyectos/encargo-A.md`. Commit `99eb5c2`.

Estado real: el ejecutor **ya escribió el código** (3 commits en un worktree **retenido**:
`22f18b8`, `0534f58`, `07b370f`) y sus 24 tests de catálogo pasan, pero **el contrato no pasa**:
él verificó solo esos dos ficheros y `npm test` ENTERO falla. Lanzado `job_mv79hc637mxa`
(continuación) para que corra la suite completa y lo arregle sin tocar ningún `*.test.ts`.

**Lo primero que hay que revisar cuando pase**, de su propio informe: dice que
*"`PROJECTS` conserva los 6 originales para que `conta.ts` siga funcionando sin tocarse"*. Si
`conta.ts` sigue iterando esa constante, **un proyecto creado por Josema no saldría en la tabla
del Año**: serían dos fuentes de verdad. Hay que mirarlo antes de dar la fase por buena. Lo otro:
que el recargador de `finances_projects` esté puesto (invariante del espejo vivo con CompAI) y
que `ProjectsSheet.tsx` no vaya lleno de `style={{...}}` a pelo.

## Fase B — cuotas mensuales (LISTA, SIN LANZAR)
Tests `src/lib/finance/quotas.test.ts` y ficha `.mapa/conta-proyectos/encargo-B.md`, commit
`e7a7005`. No se lanzó porque toca los mismos ficheros que A. Modelo decidido: la cuota **no** se
apunta como ingreso (el patrimonio no puede enseñar dinero que no ha llegado); genera un pendiente
`me_debe` con `project` y `quotaId`, y el botón "Cobrar" de F4 lo convierte en ingreso.
Retroactivo desde `startDate`, idempotente por `lastRun`, tope de 24 por pasada.

## Fase C — CompAI (repo `compai`, pendiente)
Josema preguntó si CompAI no puede gestionarle la app: **sí** (life-mcp escribe con CAS), pero su
`gasto_add` no tiene `proyecto` y no sabe de cuotas, y la tool `finanzas` valida el proyecto
contra un **enum de seis ids** que se queda corto en cuanto él cree uno. Es la vía para cargarle
las cifras sin teclear y sin pasar por el repo. Va después de B.

## Las cifras de sus clientes NO van en el repo
El repositorio es **público** (comprobado el 14/10: la API de GitHub contesta 200 sin
credenciales). Lo que cobra de cada cliente está en el **grafo de memoria** (hechos #122558 a
#122561 del 14/10), no aquí: ni en código, ni en tests, ni en semillas, ni en estas fichas. Las
cifras de los tests son inventadas a propósito.

## Incidente de git, ya resuelto (no repetirlo)
El primer job (`job_mv78uwmtf266`) hizo el trabajo bien y falló al `git add`: el ejecutor corre
con otro usuario y los directorios antiguos de `.git/objects` no tenían escritura de grupo. Para
sortearlo escribió `.git/objects/info/alternates` → `/tmp/alt-objects`, que habría dejado objetos
del repo en un directorio volátil. Lo paré, verifiqué con `git fsck` y arreglé la causa:
`git config core.sharedRepository group` + `g+w` en los directorios de `.git`. Desde ahora, todos
los encargos llevan prohibido tocar cualquier cosa dentro de `.git`.

## Lo que queda de Josema
- Sus 5 pendientes vivos (1.035 €) son **dinero personal**: se quedan en "Otros", no se tocan.
- Cuando A y B estén: 4 cuotas que registrar (o dictárselas a CompAI tras la fase C) y marcar
  cobrado agosto y septiembre; octubre de Clocks y Asensio está pendiente de verdad.

---

## Cierre de la tanda (madrugada del 14/10)
**Integrado y publicado** (`d10ebaf`): catálogo vivo + `ProjectsSheet` + el motor `quotas.ts`,
301 tests en verde. Dos cosas que hay que saber:

1. **Mi error de proceso**: dejé los tests de la fase B (rojos) en el repo mientras el contrato de
   la fase A era `npm test` entero, así que la suite tenía que fallar y el job salió "no-pasa" dos
   veces. Al retomarlo, el ejecutor implementó `quotas.ts` para ponerla en verde — fuera de su
   encargo, pero correcto. Lección: **los tests en rojo de una fase futura no se commitean si hay
   un contrato `npm test` en vuelo**; o van en la misma tanda, o esperan.
   El "tocó DECISIONES.md/ESTADO.md" del contrato era un falso positivo del rebase: esos cambios
   eran míos.
2. **Bug crítico que dejó la fase A, ya con arreglo lanzado** (`job_mv79o6h52v9a`): `conta.ts`
   seguía iterando la constante `PROJECTS` (seis fijos) mientras `resolveProjectId` resuelve
   contra el catálogo vivo, así que un movimiento de `3d` o de cualquier proyecto nuevo da un pid
   que no está en la rejilla → `monthByProject[pid][idx]` sobre `undefined` → **la pestaña Conta
   peta**. Lo provocó mi propia ficha, que le prohibía tocar `conta.ts`; la prohibición queda
   levantada. Tests de aceptación en `src/lib/finance/conta-catalogo.test.ts` (`598fcd7`).

### Estado al cerrar (01:00 del 14/10)
- **Fase A + A.1: HECHAS, integradas y publicadas** (`b39c7dc`). El arreglo de `conta.ts` está
  revisado a mano: el orden de filas sale de `getProjectCatalog()` (incluye archivados, así un
  proyecto archivado con histórico conserva su fila), `ensureRow(pid)` crea la fila al vuelo para
  un id huérfano en vez de reventar, las etiquetas salen de `projectLabel` y **`PROJECTS` y
  `BASE_PROJECTS` están borrados**: una sola fuente de verdad. **306/306 tests**, build limpio.
- **Fase B: LANZADA** como `job_mv79u4ckrhen` (ficha `encargo-B.md`, ya actualizada a que el motor
  está hecho). Lo que hace: clave `finances_quotas` + recargador, generación al abrir Finanzas,
  pantalla de cuotas en Conta y el atajo "dar por cobrado lo anterior a este mes".
  **Al recogerla hay que revisar**: (1) que el recargador de `finances_quotas` esté puesto
  (invariante del espejo vivo), (2) que no se escriba ninguna clave cuando no hay nada que
  generar, y (3) que el atajo de cobro masivo vaya con confirmación y ponga a cada ingreso la
  fecha de SU mes, no la de hoy.
- **Fase B: HECHA e integrada** (`finances_quotas` + recargador, generación al abrir Finanzas,
  pantalla de Cuotas en Conta y el atajo de dar por cobrado lo anterior). Revisado a mano: el
  recargador está puesto, no escribe la clave si no hay nada que generar y cada ingreso del cobro
  masivo va con la fecha de su mes.
- **Fase C: LANZADA** como `job_mv7s3bvrxg8h` sobre `compai` (ficha `encargo-C.md`): catálogo leído
  de `finances_projects` en vez del enum de seis, y tools nuevas `cuota_set`, `cuota_listar` y
  `pendiente_add` con escritura CAS. **Al recoger**: revisar los tests nuevos, escribir la línea de
  memoria en el `AGENTS.md`/`DECISIONES.md` de compai (OpenCode no puede) y que **Josema** haga
  `pm2 restart life-mcp` (solo por nombre; un job no puede, se comprueba por uptime).
- **Los datos de Josema ya están cargados** (14/10, escritos por Claude con el Management API y
  autorizados por él en el momento; NO están en el repo): `finances_tx` con los 8 cobros ya hechos
  (780 € en 2026: Anantara 380, Elevencuts 250, Clocks 100, Asensio 50) y `finances_quotas` con las
  4 cuotas (140 €/mes + 250 anuales). Los `lastRun` están puestos para que la app genere sola solo
  lo que de verdad está pendiente: Clocks 50 y Asensio 25 de octubre. Los cobros van **sin cuenta**
  (no mueven saldos ni descuadran el patrimonio) y los 5 pufos personales no se tocaron.
- **Nadie lo ha visto a ojo**: el navegador MCP no pasa del login y aquí no hay `node_modules`.
  La pantalla la tiene que mirar Josema, y conviene que lo haga **después** de que B entre.
