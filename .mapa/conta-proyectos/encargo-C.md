# Encargo C — CompAI entiende los proyectos de Josema (repo `compai`, no este)

> Ficha del arquitecto, 14/10/2026. Va DESPUÉS de la fase B. **El trabajo no es en LifeApp**:
> es en el proyecto `compai`, carpeta `life-mcp/` (`tarea_lanzar({proyecto:"compai"})`).

## Por qué
Dos motivos, y el segundo es el que lo hace urgente:

1. Josema preguntó el 14/10 si CompAI no puede gestionarle la app. **Sí**: `life-mcp` escribe en
   `store_data` con control de versión (CAS + backup, `mutateKey`) y ya crea movimientos con
   `gasto_add`. Lo que no sabe es de **proyectos** ni de **cuotas**. Si lo aprende, Josema le
   dicta por Telegram "la cuota de Anantara son 65 al mes desde septiembre" y queda registrado:
   sin teclear formularios en el móvil y **sin que una cifra de cliente pase por este repo, que es
   público**.
2. La tool `finanzas` valida el proyecto con un **`z.enum` de seis ids**
   (`anantara|clocks|asensio|elevencuts|yatekomo|otros|todos`). Desde la fase A, Josema crea los
   suyos (el `3d` ya viene en la semilla), así que ese enum **ya está desfasado**: un proyecto
   nuevo no se puede consultar y, si se cuela, cae en "Otros".

## Qué hay que hacer en `life-mcp`
1. **El catálogo deja de ser un espejo fijo.** `finanzas.js` tiene hoy `PROYECTOS` con seis ids
   escritos a mano. Pasa a leer la clave `finances_projects` (la que escribe la app) y, si no
   existe o viene vacía, cae en esos seis + `3d` como semilla. `resolveProyecto` sigue
   normalizando (NFD, sin diacríticos, minúsculas, trim) y lo desconocido sigue cayendo en
   `otros`; lo que cambia es contra qué lista compara.
2. **Las tools dejan de usar `z.enum` para el proyecto**: `z.string()` resuelto con
   `resolveProyecto` contra el catálogo leído. Si el texto no casa con ningún proyecto, la
   respuesta lo dice ("no tengo ningún proyecto que se llame X; los que hay son …") en vez de
   sumarlo a "Otros" en silencio — una cifra atribuida al proyecto equivocado es peor que un "no
   sé".
3. **Escritura nueva** (es lo que pidió Josema):
   - `gasto_add` acepta `proyecto` y lo guarda en `Tx.project` resuelto contra el catálogo.
   - tool nueva para la cuota mensual: crea o actualiza una fila de `finances_quotas`
     (`{id, project, amount, day, freq:'monthly'|'yearly', startDate, active}` — el formato lo fija
     la fase B; **leer `src/lib/finance/quotas.ts` y `.mapa/conta-proyectos/encargo-B.md` de
     LifeApp antes de escribir**) con `mutateKey`, nunca con un upsert ciego.
   - tool nueva para apuntar un pendiente de cobro (`Pufo me_debe` con `project`), que es como se
     registra "me deben X de este mes" fuera de la cuota.
   - Toda escritura con CAS, con el `id` generado como ya se hace en `gasto_add`, y confirmando en
     la respuesta qué quedó guardado (importe, proyecto y fecha).
4. **La app manda**: si `finances_context.projects` existe para el año en curso y discrepa de lo
   que calcula el MCP, se avisa como ya se hace hoy. No se "arregla" nada por detrás.

## Cuidado
- `pm2 restart life-mcp` **no lo puede hacer un job** (comprobado el 12/10: su pm2 es otro
  demonio). Lo hace Josema o CompAI, y se comprueba por **uptime**, no por "el comando no falló".
- Solo por nombre: en esa máquina corren servicios de clientes.
- La memoria de ese repo (`AGENTS.md`, `DECISIONES.md`) la escribe quien tenga sesión ahí: a
  OpenCode se lo prohíbe su regla de operario.
- Los tests de aceptación de `life-mcp` no los puede escribir el arquitecto de LifeApp (está
  fuera de su carpeta): el contrato va con **cifras exactas dentro del encargo** y se revisa
  leyendo el test después.
