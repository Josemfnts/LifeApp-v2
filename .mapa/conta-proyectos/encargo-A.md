# Encargo A — Los proyectos los crea Josema (catálogo vivo)

> Ficha del arquitecto para el ejecutor. 14/10/2026. Fase A de dos (la B son las cuotas
> mensuales: lo que cada cliente tiene que pagarle al mes). Plan: `plan.md` en esta carpeta.

## Por qué
Josema, 14/10/2026: *"además debo poder crear proyectos, por ejemplo el de 3D"*. Hoy los seis
proyectos de Contabilidad están **escritos en el código** (`src/lib/finance/projects.ts`) y el
tipo `ProjectId` es una unión literal, así que no se puede añadir ni renombrar nada sin un
despliegue. El catálogo pasa a ser un dato suyo, sincronizado como el resto de Finanzas.

## Tests de aceptación (INTOCABLES, ya están en el repo y ahora fallan a propósito)
- `src/lib/finance/projects-catalog.test.ts` — el contrato nuevo, entero.
- `src/lib/finance/projects.test.ts` — el de F0, ya adaptado por el arquitecto: lo que valía
  sigue valiendo con el catálogo de fábrica cargado.

No se edita ninguno de los dos. Si algo parece imposible o contradictorio, se lee con calma y
se pregunta; no se "arregla" el test.

## Contrato de `src/lib/finance/projects.ts`
Sigue siendo un fichero **puro** (datos y normalización; no toca storage ni transacciones), pero
guarda el catálogo activo que le inyecta el store.

```ts
export type ProjectId = string                    // ya NO es una unión literal
export interface ProjectDef { id: ProjectId; label: string; color?: string; archived?: boolean }

export const OTHER_PROJECT = 'otros'              // el cajón, igual que hasta ahora
export const PROJECT_FILTER_ALL = 'all'
export type ProjectFilter = ProjectId | typeof PROJECT_FILTER_ALL

export const DEFAULT_PROJECTS: readonly ProjectDef[]   // semilla: los 5 clientes + 3D + Otros

// Catálogo activo (estado del módulo). Lo inyecta el store al cargar y al recargar la clave.
export function setProjectCatalog(list: readonly ProjectDef[]): void   // lista vacía ⇒ vuelve al de fábrica
export function getProjectCatalog(): readonly ProjectDef[]
export function activeProjects(): readonly ProjectDef[]                // sin archivados, Otros al final

export function projectSlug(label: string): ProjectId                  // 'FloodStudio 3D' → 'floodstudio-3d'

// Mismas firmas que hoy (no hay que tocar a los 14 llamadores), leyendo el catálogo activo:
export function isProjectId(v: unknown): v is ProjectId
export function projectLabel(v: string | null | undefined): string
export function resolveProjectId(v: string | null | undefined): ProjectId
export function matchesProjectFilter(filter: ProjectFilter, v: string | null | undefined): boolean

// Operaciones de catálogo: devuelven una lista NUEVA (no mutan la de entrada) o un error legible.
export interface ProjectsResult { projects: ProjectDef[]; project?: ProjectDef; error?: string }
export function addProject(list: readonly ProjectDef[], label: string, color?: string): ProjectsResult
export function renameProject(list: readonly ProjectDef[], id: ProjectId, label: string): ProjectsResult
export function setProjectArchived(list: readonly ProjectDef[], id: ProjectId, archived: boolean): ProjectsResult
```

Reglas que los tests clavan, por si ayudan a entender el porqué:
1. **El id no cambia nunca.** Los movimientos y los pendientes ya guardados llevan el id dentro
   (`Tx.project`, `Pufo.project`); renombrar cambia solo la etiqueta.
2. **`otros` es el cajón**: existe siempre, va último, no se renombra, no se archiva y no se
   puede crear otra vez. Lo sin marcar y lo que apunta a un proyecto desaparecido cae ahí.
3. **Archivar ≠ borrar.** Un archivado sale del selector pero `projectLabel` y `resolveProjectId`
   lo siguen reconociendo: su histórico conserva nombre y sigue sumando en su fila. Desarchivar
   lo devuelve a su sitio en el orden, no al final.
4. `resolveProjectId(v)` = `projectSlug(v)` si eso es un id del catálogo; si no, `otros`. Así
   sigue entendiendo texto suelto con mayúsculas y acentos (lo usan CompAI y el alta rápida).
5. `all` está reservado: ningún proyecto creado a mano puede quedarse con ese id.
6. No hay borrado en esta fase. Si Josema lo pide, se decide entonces qué pasa con su histórico.

## Claves y store
- `src/lib/storageKeys.ts`: `finances_projects` **en `STORE_KEYS`** (es dato de usuario: va a la
  nube y al espejo vivo) y su etiqueta en `STORAGE_LABELS` como `'Finanzas'`.
- `src/stores/financeStore.ts`:
  - estado `projects: ProjectDef[]`, cargado con `loadFromStorage('finances_projects', [])`;
    vacío ⇒ se usa `DEFAULT_PROJECTS` (no hace falta escribir la clave para que la app funcione);
  - acciones `addProject(label)`, `renameProject(id, label)`, `archiveProject(id, archived)` que
    guardan con `saveToStorage` y vuelven a inyectar el catálogo con `setProjectCatalog`;
  - **recargador obligatorio** para `finances_projects` en el mapa de recargadores (invariante
    del espejo vivo: clave nueva ⇒ recargador), y ese recargador también reinyecta el catálogo.
- Al arrancar la app (donde ya se cargan las claves de Finanzas) se llama una vez a
  `setProjectCatalog(projects)` para que las funciones puras tengan el catálogo bueno.

## Pantalla
- Los cinco sitios que hoy pintan el selector de proyecto (`QuickAddSheet`, `EditTxSheet`,
  `ContaAddSheet`, `CobrarPufoSheet`, `ContabilidadTab`) dejan de iterar la constante y usan
  `activeProjects()`.
- En **Conta** hace falta gestionarlos: una hoja "Proyectos" con la lista (los archivados
  aparte), un campo para añadir, renombrar y el interruptor de archivar. Los errores que
  devuelven las funciones se enseñan tal cual en un toast (no se inventan textos nuevos).
- Si el proyecto recordado en `conta_project` ya no está **activo**, la pestaña abre en "Todos"
  (hoy solo cae si el id no es válido; un archivado también tiene que caer).
- Nada de `confirm()` ni `prompt()`: el repo usa `ConfirmDialog`.

## Fuera de esta fase (no lo toques)
- Las cuotas mensuales (fase B) y cualquier cifra de clientes: **el repo es público**, así que
  en el código no entra ni un importe real.
- Los motores `conta.ts`, `conta-view.ts`, `conta-draft.ts`, `conta-settle.ts`, `money.ts`,
  `context.ts` y sus tests: el catálogo se amplía, la contabilidad no cambia.
- `supabase/migrations/` (no hace falta ninguna: `store_data` es clave-valor), `globals.css`,
  `AGENTS.md`, `ESTADO.md`, `DECISIONES.md`, `docs/relevos/` y `CLAUDE.md` (los escribe el
  arquitecto), `package.json`, `package-lock.json` y las dependencias.
- `life-mcp` vive en otro repo (`compai`) y su lista de proyectos es un enum de seis ids que se
  quedará corto: es otra tanda, apuntada por el arquitecto.

## Hecho = 
1. `npm test` entero en verde, incluidos los dos ficheros de tests de aceptación y los 271 que
   ya pasaban (ninguna regresión: si un test viejo se cae, el fallo es del código nuevo).
2. `npm run build` limpio y `npm run lint` sin avisos nuevos.
3. En el informe: qué ficheros cambiaron y, en una línea, qué ve Josema al abrir Conta.
