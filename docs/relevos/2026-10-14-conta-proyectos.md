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
