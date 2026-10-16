# LifeApp (Life OS) — AGENTS.md

PWA personal de Josema, local-first: Agenda (Kanban, Notas tipo Notion), Hábitos, Físico (entrenos, rutinas, salud de relojes), Nutrición, Finanzas (Margen + Conta por proyecto) y Comunidad, con gamificación XP. Funciona sin conexión y sin cuenta salvo Notas, Comunidad y Salud, que hablan con Supabase y piden sesión. CompAI escribe en sus datos en vivo (life-mcp).

## Stack y mapa
- React 19 · TypeScript 6 · Vite 8 · react-router-dom 7 (páginas `lazy()` + `Suspense` en `src/App.tsx`) · Zustand 5 · Supabase JS 2 · Tailwind 4 con CSS variables · chart.js · lucide-react · vite-plugin-pwa · BlockNote (chunk lazy propio) · oxlint · Vercel.
- `src/pages/` una por módulo · `src/stores/` Zustand por dominio · `src/lib/` (storageKeys, storage, sync, mirror, realtime, notifications, xp-engine, social, health, `finance/` motor puro, `ui/`) · `src/modules/notes/` · `src/components/{ui,layout,finanzas,fisico,social,…}` · `supabase/migrations/` · `connector/` (servicio Python de relojes, no se importa desde la app). Alias `@/` → `src/` (salvo en `src/lib/finance/`).

## Comandos
- Tests: `npm test` (node:test con strip-types sobre `src/lib/finance/**` y `src/lib/ui/**`).
- Build (es el typecheck: `tsc -b && vite build`): `npm run build`. Lint: `npm run lint`.
- Instalar: `npm ci --include=dev` (la máquina tiene `NODE_ENV=production`; sin el flag faltan vite y tsc). Nunca borres `node_modules` ni `package-lock.json` para «arreglar».

## Convenciones
- **Datos local-first**: la verdad es `localStorage`; Supabase es espejo (una tabla `store_data(user_id, key, value, updated_at)` con RLS). No hay tablas por dominio: no las reintroduzcas.
- **Claves**: nunca escritas a mano; la lista canónica es `src/lib/storageKeys.ts` (`STORE_KEYS`/`ALL_STORAGE_KEYS`; `LOCAL_ONLY_KEYS` nunca sube). Dato nuevo = clave allí primero, y que Dashboard y backup la contemplen.
- **Espejo vivo**: `updated_at` lo pone el servidor (nunca lo mandes); `saveToCloud` hace UPDATE condicionado a la versión vista; las filas entrantes pasan por `applyCloudRow` y emiten `lifeos:remote-change`. Clave o store nuevo = cablea su recargador (`onRemoteChange` en el store o `useRemoteChange` en el componente).
- **Notas, Comunidad, Salud** tienen tablas propias con RLS `auth.uid()`; tras una migración con tablas nuevas, `NOTIFY pgrst, 'reload schema';`.
- **Finanzas** (`src/lib/finance/`): imports relativos con `.ts`, solo TS borrable, dinero siempre en céntimos vía `money.ts`; en sumas de flujo `flowAmount(t)`, nunca `t.amount`; los `Tx.kind` (`transfer|adjust|investment|debt_principal`) no son flujo. La UI no calcula dinero: lo da el motor, con su `*.test.ts`. `finances_context` < 4 KB (lo mide un test). En el estado de React vive el id de una fila, nunca su índice.
- **UI**: colores por CSS variables (nunca hex; transparencias con `color-mix()`), tamaños con los tokens `--fs-*`, confirmaciones con `<ConfirmDialog>`, navegación interna con `ChipTabs`, varias cifras en una `.stat-strip`. Hojas inferiores: portal a `document.body` con safe-area en el `padding-bottom`; nada de `-webkit-overflow-scrolling:touch` en contenedores con hijos fixed; la safe-area del pie la llevan `.nav-bar` y `#sw`, no `html`. Pulsables ≥ 44 px, inputs ≥ 16 px. Idioma: español.
- No quites la red anti-cuelgue (`vite:preloadError` en `main.tsx` + `ErrorBoundary`).

## Reglas
- Nunca una `service_role` en el cliente ni en `.env`.
- No cambies el protocolo del espejo (versión, conflicto, `syncOnLogin`) sin que la ficha lo pida: CompAI depende de él.
- No unifiques `cobrarPufo` con `settlePufo` (son cosas distintas) ni añadas claves de datos fuera de `storageKeys.ts`.
- Si tocas el esquema de Supabase o un formato que CompAI lee, dilo en tu informe.
- Si una decisión de producto no está en la ficha, no la inventes: dila en tu informe.

## Contexto ampliado
- Estado: ESTADO.md · Decisiones: DECISIONES.md · Planes: `.mapa/`, `docs/relevos/`.
- Historia por fechas, módulo a módulo, y el porqué de cada regla: docs/agentes/CONTEXTO.md (solo arquitecto, por tramos).
