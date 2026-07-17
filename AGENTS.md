# AGENTS.md — Life OS (`lifeapp-v2`)

PWA personal de "sistema operativo de vida": una sola app donde el usuario (Josema) gestiona
**Agenda** (+Kanban de proyectos, +**Notas** tipo Notion), **Hábitos**, **Físico** (entrenos/rutinas),
**Nutrición**, **Finanzas** y **Comunidad** (social), con una capa de **gamificación XP** por encima.
El **Diario** vive ahora dentro de Notas ("📓 Diario de hoy") y **Pomodoro** está desactivado (código
conservado, quitado del array de pestañas). En la práctica es single-user, pero tiene login (Supabase
Auth) y sincronización multi-dispositivo. Es una app **local-first**: funciona entera sin conexión y sin
cuenta — **excepto Notas y Comunidad**, que hablan con Supabase directamente y requieren sesión.

> Esta app se generó en varias tandas con IA y el 2026-07-01 pasó una auditoría de seguridad
> pre-producción. La mayoría de los hallazgos críticos ya están corregidos (ver §Estado). El
> plan completo de la auditoría vive en la memoria del proyecto (`lifeapp-audit-plan.md`).

## Stack
- **React 19** + **TypeScript 6** + **Vite 8** (`type: module`).
- **react-router-dom 7** — rutas lazy con `Suspense` (`src/App.tsx`).
- **Zustand 5** para el estado por dominio (`src/stores/*`). **TanStack Query 5** montado (`QueryClient`) pero de uso ligero.
- **Supabase JS 2** — Auth + una tabla de datos (`store_data`). Backend serverless, sin API propia.
- **Tailwind CSS 4** (via `@tailwindcss/vite`) + theming por **CSS variables** (`var(--color-*)`).
- **chart.js 4** + react-chartjs-2 (gráficas). **lucide-react** (iconos). **vite-plugin-pwa** (PWA/offline).
- **barcode-detector** (ponyfill de `BarcodeDetector` sobre zxing-wasm) — escáner de código de barras en
  Nutrición. Se importa **lazy** (`import('barcode-detector/ponyfill')`) solo cuando el navegador no trae
  `BarcodeDetector` nativo (caso iOS Safari). NO lo metas en el bundle principal.
- **BlockNote 0.51** (`@blocknote/core|react|mantine`) — editor de bloques del módulo Notas. Compatible
  con React 19; carga en un **chunk lazy** propio (~270kB js / ~225kB css), nunca en los chunks de página.
- Lint: **oxlint** (no ESLint). Formato: prettier. Deploy: **Vercel** (`vercel.json`).

## Comandos
```bash
npm run dev       # Vite dev server (HMR)
npm run build     # tsc -b && vite build   ← el build hace TYPECHECK; si tsc falla, no compila
npm run lint      # oxlint
npm run preview   # sirve el build
```
Tras cualquier cambio no trivial, deja **verde** las tres: `npm run build` (incluye `tsc -b`) y `npm run lint`.

## Estructura
```
src/
  App.tsx            Router + providers + atajos de teclado + deep-link iOS (Kanban por URL)
  main.tsx           Entry
  pages/             Una por módulo: Dashboard, Agenda, Habitos, Fisico, Nutricion,
                     Finanzas, Diario, Pomodoro, Comunidad, Login, Notas (pantalla full-screen)
  stores/            Zustand por dominio: agendaStore, financeStore, fisicoStore, nutriStore, toast
  lib/               storageKeys · storage · sync · mirror · realtime · supabase · notifications · dates · xp-engine · social · appTheme
  modules/notes/     Módulo Notas tipo Notion (BlockNote): api · hooks · NotesPanel · EntityNotes · PageEditor/Tree
  components/
    ui/              Átomos reutilizables (Badge, Button, Card, EmptyState, Input, Modal,
                     ProgressBar, TabBar) — exportados desde components/ui/index.ts
    layout/          Shell, NavBar, TopBar, SplashScreen
    notes/           NotesFor — "el cable": engancha notas a una entidad (gated+lazy+colapsable)
    agenda/ habits/  Componentes específicos de módulo
  contexts/          ThemeContext (tema), XPContext (gamificación)
  data/              Bases de datos estáticas: recetas (v1/v2), rutinas (v1/v2), foods
  types/             Tipos compartidos
supabase/migrations/ 001..006 (ver §Datos)
```
Alias de imports: **`@/` → `src/`** (ej. `import { supabase } from '@/lib/supabase'`). Úsalo siempre.

## Arquitectura de datos — LÉELO antes de tocar cualquier dato
Este es el corazón de la app y donde estaban los bugs graves. Cuatro reglas:

1. **Local-first.** La fuente de verdad es **`localStorage`**. Supabase es un **espejo** para backup y
   multi-dispositivo. Todo funciona sin sesión (cae a localStorage).

2. **Nunca hardcodees claves de `localStorage`.** La lista canónica es
   [`src/lib/storageKeys.ts`](src/lib/storageKeys.ts) (`STORE_KEYS` / `ALL_STORAGE_KEYS`).
   *Importa de ahí.* La causa raíz de los bugs críticos de la auditoría fue que lectores (Dashboard,
   backup, notificaciones) usaban claves legacy que ningún store escribía. Si añades un dato nuevo,
   añade su clave a `storageKeys.ts` primero.

3. **La nube es una única tabla key-value multi-tenant.** [`src/lib/sync.ts`](src/lib/sync.ts) lee/escribe
   `store_data (user_id, key, value, updated_at)`, PK compuesta `(user_id, key)`, RLS `auth.uid() = user_id`
   (migración [003](supabase/migrations/003_store_data_multitenant.sql)). `saveToCloud` escribe a
   localStorage **y** a la nube; los errores de nube se registran (`console.warn`) sin romper la UI.
   **No hay tablas por dominio**: el esquema multi-tabla original se **borró** (migración 004). No lo
   reintroduzcas salvo decisión explícita (reafirmada el 2026-07-17 al construir el espejo vivo).

4. **El espejo es VIVO y las escrituras llevan control de versión** (2026-07-17, migración 013).
   CompAI escribe en `store_data` por su cuenta (life-mcp con service_role) y nadie debe pisar a nadie:
   - `updated_at` lo fija SIEMPRE el servidor (trigger `store_data_touch_updated_at`, migración 013): es
     la **versión** de cada fila. Ningún cliente debe mandar `updated_at` (el trigger lo machaca igualmente).
   - **Entrada (nube → app)**: `store_data` está en la publicación Realtime. Con sesión,
     [`src/lib/realtime.ts`](src/lib/realtime.ts) abre un canal postgres_changes filtrado por `user_id`
     (respeta RLS). Cada fila entrante pasa por `applyCloudRow` ([`src/lib/mirror.ts`](src/lib/mirror.ts)):
     actualiza `lifeos_sync_meta` y, si `value` difiere de localStorage, lo escribe y emite el evento
     **`lifeos:remote-change`** (esa comparación corta el eco de las escrituras propias, porque saveToCloud
     escribe localStorage antes de subir). Los stores Zustand registran `onRemoteChange({clave: recargador})`
     al final de su módulo; los componentes con useState usan el hook `useRemoteChange([claves], reload)`.
     **Si añades una clave/store nueva, cablea su recargador** o la UI no verá los cambios de CompAI.
   - **Salida (app → nube)**: `lifeos_sync_meta` (localStorage; NUNCA se sube — no está en ALL_STORAGE_KEYS)
     guarda por clave el último `updated_at` visto. `saveToCloud` hace UPDATE **condicionado** a esa versión;
     si toca 0 filas y la fila existe hay conflicto → adopta la versión de la nube localmente (evento a la UI
     incluido) y re-aplica el cambio del usuario con UN reintento. Sin versión vista → INSERT estricto (jamás
     upsert a ciegas). Hay cola por clave para guardados rápidos consecutivos. Semántica resultante por clave:
     last-writer-wins CON visibilidad (el blob es entero; no hay merge por campos).
   - **Login sin clobber**: `syncOnLogin()` (sync.ts; sustituye a los antiguos downloadFromCloud +
     syncAllToCloud) primero baja TODO lo que exista en la nube (la UI se refresca vía eventos) y después
     sube SOLO las claves locales que la nube no tenga.

Helpers de storage en [`src/lib/storage.ts`](src/lib/storage.ts): `getItem/setItem` (prefijan `lifeos_`)
y `loadFromStorage/saveToStorage` (clave completa, sin prefijo) — ambos sincronizan a la nube. Los stores
Zustand usan las claves de `storageKeys.ts` directamente. El módulo **Comunidad** habla con Supabase
aparte (`src/lib/social.ts`, migración `005_social.sql`).

Migraciones: `001` esquema inicial (ya en desuso), `002` tabla `store_data`, **`003` multi-tenant + grants**,
`004` borra el esquema muerto, `005` social/comunidad, **`006` notas** (`pages` + `page_links`, RLS `auth.uid()`),
**`007` comunidad v2** (perfiles, seguidores, comentarios, reposts, notificaciones y nuevos tipos de post:
rutina/receta/dieta/objetivo/progreso), **`008` social_uses** ("han usado tu contenido": tabla `social_uses` +
`use_count` + trigger que notifica al autor al importar del feed), **`009` storage** (bucket `social` público +
policies en `storage.objects`: subir a `social/{uid}/`, lectura pública), **`013` espejo vivo** (`store_data`
en la publicación `supabase_realtime` + trigger `updated_at = now()` del servidor) — todas **APLICADAS y
verificadas E2E**.
Nota: los `GRANT` de 005/007/008 son a `anon, authenticated` (no a `service_role`): la service_role no puede leer
estas tablas por PostgREST. Al aplicar una migración con tablas nuevas, tras el POST hacer
`NOTIFY pgrst, 'reload schema';` (si no, PostgREST da 404 hasta que refresca el cache del esquema).

**Excepción al patrón local-first — módulo Notas** (`src/modules/notes/`): NO usa `store_data`; tiene tablas
propias `pages` (documento BlockNote en `content` jsonb, jerarquía `parent_id`, papelera `deleted_at`) y
`page_links` (N:M polimórfico `entity_type`/`entity_id` = "los cables"). Recibe el cliente `supabase` inyectado.
Requiere sesión (RLS): en modo invitado el gate lo oculta. Cablea notas a entidades con
`<NotesFor entityType="day|workout|project|activity|trip|plan-project|finance" entityId=.../>`.

## Convenciones y patrones
- **Páginas lazy**: cada página se importa con `lazy()` y se envuelve en `Suspense` (`App.tsx`).
- **Red de seguridad anti-cuelgue** (`main.tsx` + `components/ErrorBoundary.tsx`): tras un deploy, la PWA
  autoUpdate deja la pestaña abierta con chunks viejos ya purgados de Vercel → el import lazy da 404. El
  listener `vite:preloadError` recarga UNA vez (guarda anti-bucle en sessionStorage) y el `ErrorBoundary`
  global captura cualquier otro crash de render. **No quites ninguno de los dos**; sin ellos la app se
  quedaba en pantalla negra hasta recargar a mano.
- **Notas a pantalla completa**: la ruta `/notas` va **fuera** del `<Route element={<Shell/>}>` (por eso no
  tiene barra inferior ni header de Agenda). `src/pages/Notas.tsx` = gate de sesión + `NotesPanel` con barra
  propia (‹ volver · ☰ árbol-drawer · título · +) y editor inmersivo. La pestaña "Notas" de Agenda **navega**
  a `/notas` (no renderiza inline). Si algo debe abrirse full-screen sin nav, sigue este patrón.
- **Theming**: colores vía CSS variables (`var(--color-dim)`, etc.), no hex hardcodeados — respeta eso al
  añadir estilos. El header de página es `.page-header` (padding-top 24px) + un único `.page-title`.
- **Atajos de teclado**: leader key **`g`** y luego `1..9` navega entre módulos (patrón Gmail/GitHub);
  implementado dentro del Router para no recargar la página (`App.tsx:KeyboardShortcuts`).
- **Deep-link iOS**: `?kanban=texto&priority=&project=` añade una tarjeta al Kanban al abrir (atajo de iOS).
- **Notificaciones locales**: `checkHabitReminders` / `checkAgendaReminders` (`src/lib/notifications.ts`).
- Idioma del producto y de los comentarios: **español**. Sigue ese estilo.

## Estado actual (verificado contra el código, 2026-07-09)
La auditoría del 1-jul ya está mayormente resuelta:
- ✅ **C1/C2** (fuga entre usuarios + grants rotos) → migración `003_store_data_multitenant`.
- ✅ **C3/A1/A2** (claves divergentes en Dashboard/backup/notificaciones) → `storageKeys.ts` + helpers unificados.
- ✅ **M6** (esquema muerto) → migración `004_drop_unused_schema`.
- ⚠️ **C4 — tokens SIN ROTAR (urgente)**: el **PAT de GitHub (`ghp_`)** sigue incrustado en la URL del remote
  (repo público) y el **token Supabase Management (`sbp_`)** se reusó para migraciones; con él se puede sacar la
  `service_role` key por la Management API. **Rota ambos.** Al rotar el `ghp_`, actualiza el remote:
  `git remote set-url origin https://<TOKEN>@github.com/Josemfnts/LifeApp-v2.git`.
- Desde la auditoría se añadió mucho: Kanban de proyectos (sync a nube arreglado), módulo **Comunidad** (social),
  4 bases de datos de recetas/rutinas, rediseño visual y refactor del módulo Físico.
- **2026-07-09**: módulo **Notas tipo Notion** (BlockNote, migración 006) con árbol jerárquico, autoguardado,
  buscador, favoritos, papelera y drag&drop; **cables** (`NotesFor`) en Diario/Físico/Kanban/Planes/Finanzas.
  **Reorg de Agenda**: barra Mes·Stats·Kanban·Planes·Notas; Mes = Calendario + filas plegables Turnos/Semana;
  Día se abre tocando el calendario (sin pestaña); Diario → "Diario de hoy" dentro de Notas; Pomodoro desactivado.
  **Notas rediseñado a pantalla completa** (ruta `/notas` fuera del Shell, barra propia + árbol en drawer + editor
  inmersivo). **Icono nuevo** en todo (PWA/favicon/apple-touch/splash/login). Verificado E2E; en `main`.
- **2026-07-10**: Comunidad v2 revisada+migrada+certificada (007 aplicada). Red de seguridad anti-cuelgue
  (ErrorBoundary + vite:preloadError). Saldo de cuenta ligado a movimientos (financeStore). Nav-bar con
  safe-area (sin franja muerta). **Notas más práctico**: pantalla de inicio (Diario de hoy / Nueva página /
  Favoritos / Recientes), emoji por página (UI del `pages.icon` que ya existía), breadcrumbs clicables y
  editor BlockNote en español (`dictionary: locales.es`). Todo E2E-verificado; en `main`.
- **Compartir desde toda la app (estilo Hevy)**: `src/lib/socialShare.ts` = mapeadores entidad→post
  estructurado (entreno/rutina/PR/carrera/plato/menú/peso) y `ShareSheet` (components/social) = hoja
  reutilizable con vista previa real (mismo `PostContent` del feed) + gate de sesión. Botones ↗ en Físico
  (fin de entreno automático, historial, rutinas, PRs, carreras) y Nutrición (platos, menú, progreso).
  Para añadir un punto de compartir nuevo: mapeador en socialShare.ts + estado local + `<ShareSheet/>`.
  El viaje de vuelta es `src/lib/socialImport.ts` (botón verde en `PostCard`): rutina/entreno → mis rutinas,
  receta → mis platos (parsea "Nombre — 200 g"), menú → mi menú semanal (días por nombre; 0=Domingo). Al
  importar, `markPostUsed` registra el uso (migración 008) → el autor recibe aviso. Compartir también desde
  Hábitos (racha). Feed paginado (`FEED_PAGE=20`, `.range()`, "Cargar más"). **Imágenes en Supabase Storage**
  (`uploadImage` en social.ts → bucket `social`, URL pública; cae a data URL `compressImage` si no hay sesión/red).
  Las imágenes antiguas (data URL) siguen renderizando. `compressImage`/`uploadImage` comparten `withCanvas`.
- **Confirmaciones**: usa `<ConfirmDialog>` (components/ui), no `confirm()` nativo — quedan 0 en el código.
- **2026-07-12 — Salud (relojes) fase 1**: pestaña **❤️ Salud** en Físico (`src/components/fisico/HealthTab.tsx`
  + `src/lib/health.ts`) que lee la tabla nueva **`health_metrics`** (migración **010, APLICADA**: fila por
  `(user_id, date, metric)`, RLS `auth.uid()`, grants a anon/authenticated **y service_role** — la Edge Function
  del webhook escribirá con service_role). Módulo conectado tipo Notas/Comunidad: requiere sesión, NO pasa por
  `store_data` ni localStorage. Métricas canónicas y formato en `METRICS` (health.ts). El botón "Conectar reloj"
  es aún un placeholder informativo: falta la fase 2 (cuenta en agregador Terra/Vital + Supabase Edge Function
  del webhook) — plan completo en la memoria del proyecto `lifeapp-wearables-plan.md`. **NO implementar la
  conexión sin las credenciales del agregador** (las aporta Josema).
- **2026-07-12 — Salud (relojes) fase 2, DECISIÓN NUEVA**: descartados los agregadores (Terra $399/mes, Vital
  $300/mes; Google Fit REST muerto en 2026; Garmin Health API solo-empresas). Josema quiere que **cada usuario
  registre su reloj DENTRO de la app** metiendo las credenciales de su cuenta Garmin/Zepp. Implementado el lado
  web + BD: tabla **`wearable_accounts`** (migración **011, APLICADA**: `(user_id,provider)` PK, `email/secret/
  status/error/last_sync/sync_requested_at`, RLS `auth.uid()`). La hoja "Conectar reloj" de HealthTab ahora es
  real: alta con email+contraseña del proveedor, estados (Conectando/Conectado/Error), Desconectar, y botón
  **⟳ Actualizar** (pone `sync_requested_at=now()`, guarda de 10 min). Helpers en `health.ts`
  (`fetch/save/deleteWearableAccount`, `requestWearableSync`). **Seguridad**: solo RLS por usuario — se descartó
  el privilegio-por-columna para `secret` porque PostgREST necesita SELECT de tabla para el upsert (incompatible);
  riesgo asumido (dueño releyendo su propia contraseña).
- **2026-07-14 — conector del mini PC HECHO** (carpeta **`connector/`**, servicio Python, NO se importa desde la
  app): `sync.py` (loop + decisión de sync: alta `pending` / botón Actualizar `sync_requested_at`>`last_sync` /
  pasada diaria), `store.py` (lee `wearable_accounts` y escribe `health_metrics` vía PostgREST con **service_role**),
  `providers/garmin.py` (`garminconnect`, sesión garth cacheada en `.sessions/`, mensaje claro si 2FA) y
  `providers/zepp.py` (API no oficial Huami: login email → `band_data.json` → pasos/distancia/calorías/sueño).
  Slugs canónicos en `providers/base.py`. Arranque: `python sync.py --once` (cron) o `sync.py` (bucle); systemd de
  ejemplo en `connector/README.md`. La **service_role va en `connector/.env`** (gitignored, NO al repo).
  **RATE LIMITING (importante)**: Garmin limita **por IP** y afecta a todos los usuarios del mini PC. Probado en
  real: devuelve **429**. Por eso (migración **012**, `last_attempt`, APLICADA) las cuentas en error esperan
  `ERROR_BACKOFF_HOURS` (6h) antes de reintentar — **antes se reintentaban en cada pasada (~5 min)** porque el error
  no rellena `last_sync`. `last_attempt` se escribe SIEMPRE; `last_sync` solo si la sincronización fue OK; el botón
  "Actualizar" se salta el backoff. No bajes `POLL_INTERVAL`/`ERROR_BACKOFF_HOURS` sin motivo. `garmin._classify`
  distingue 429 (transitorio) de credenciales/2FA: **no culpes a la contraseña de un rate limit**.
  Verificado: fontanería Supabase con proveedor fake (**24 checks**: upsert, filtrado, idempotencia, estados,
  should_sync + backoff), clasificador de errores (8 casos), smoke del parseo Garmin/Zepp, y una **pasada real
  contra la API de Garmin** (credenciales falsas → error legible, sin romper). El camino de login OK no se puede
  probar sin credenciales reales.
- **EL MINI PC ES ESTA MISMA MÁQUINA** (`DESKTOP-KFFL25R`, Dell OptiPlex 3050, **Windows 11 Pro**, 16 GB) — donde
  vive el repo y corre CompAI. No es un Linux remoto (error de suposición previo: el README tenía systemd).
  **El conector YA ESTÁ INSTALADO Y CORRIENDO** aquí: `connector/.env` con la service_role (gitignored, probado
  contra producción) + tarea programada **`LifeApp Connector`** cada 5 min lanzando `connector/run.bat`
  (log en `connector/sync.log`, gitignored). Verificada: el Programador la ejecuta y devuelve 0.
  ⚠️ La tarea es **"solo interactivo"** (se creó sin admin): corre solo con la sesión de `josema` iniciada; tras un
  reinicio sin login NO arranca. Para arreglarlo: recrearla como admin con `/ru SYSTEM` o `/ru josema /rp <pass>`,
  o dejar el mini PC con inicio de sesión automático. Comandos en `connector/README.md`.
  **Falta solo**: que la pareja de Josema cree cuenta LifeApp y que cada uno registre su reloj en la app.
- **2026-07-17 — espejo VIVO store_data ↔ CompAI**: migración **013 (APLICADA)** = `store_data` en la
  publicación `supabase_realtime` + trigger que fija `updated_at = now()` del servidor en cada escritura.
  Fase 1: la app abierta ve al instante las escrituras de CompAI (canal en `lib/realtime.ts`; aplicación +
  evento `lifeos:remote-change` en `lib/mirror.ts`; re-hidratación cableada en agenda/finance/nutri/fisico
  stores, useHabits, Kanban, Diario, Planes y Dashboard; toast "⟳ Actualizado desde CompAI"). Fase 2:
  `saveToCloud` con control de versión vía `lifeos_sync_meta` (UPDATE condicionado + conflicto → adoptar
  nube + reintento único) y `syncOnLogin()` que nunca sube a ciegas (baja todo, sube solo claves nuevas).
  De paso: **el Diario ahora sube a la nube** (antes guardaba solo en localStorage). Verificado E2E con
  Playwright contra prod (usuario real + service_role): actualización en ~0,5 s sin recargar; escritura de
  CompAI + edición del usuario acumuladas sin pisarse; conflicto forzado resuelto re-aplicando el cambio
  del usuario; login que no machaca la nube. Detalle de arquitectura en §Arquitectura de datos, regla 4.
  **Pendiente del lado CompAI (otra sesión)**: life-mcp debería escribir con CAS sobre `updated_at` para
  tener la misma garantía; el trigger ya le asegura versiones honestas.

## Gotchas
- `.env` (`VITE_SUPABASE_URL` + anon key) **ya NO está versionado** (gitignored desde `255b781`). La anon key
  es **pública por diseño**; es recuperable del historial (`git show f6f3a0b:.env`) para correr en local.
  **Nunca** metas una `service_role` key en el cliente ni en `.env`.
- Antes de dar por bueno un cambio de datos, comprueba que la clave existe en `storageKeys.ts` y que
  Dashboard/backup la contemplan — es el punto exacto donde esta app se rompió antes.
- El build **es** el typecheck (`tsc -b && vite build`): un error de tipos tira el build entero.
- **Testear flujos autenticados** (Notas/Comunidad): el email-confirmation está ON, no puedes registrarte y
  entrar sin más. Para E2E: saca la `service_role` por la Management API (`GET /v1/projects/{ref}/api-keys`),
  crea un usuario confirmado (`POST {url}/auth/v1/admin/users` con `email_confirm:true`), loguéate por el form
  (placeholders Email/Contraseña, botón "Entrar") y **bórralo al final** (`DELETE .../admin/users/{id}`, cascada
  a `pages`/`page_links`). Ref del proyecto: `plgwbctxseuuujuepmfe`.
- La Management API (`.../database/query`) da **403 Cloudflare 1010** con User-Agent de urllib → usa `User-Agent: Mozilla/5.0`.
- **iOS + hojas bottom-sheet**: NO pongas `-webkit-overflow-scrolling:touch` en contenedores de scroll que tengan
  hojas `position:fixed` dentro (como `#sw`): en iOS Safari atrapa los fixed y los deja detrás de la nav-bar
  (botones cortados). Las hojas nuevas: portal a `document.body` + `padding-bottom` con `env(safe-area-inset-bottom)`.
- **Safe-area del pie**: la maneja la `.nav-bar` (fixed, `max(10px, safe)`) y `#sw` (`calc(80px + safe)`).
  `html` NO añade `padding-bottom` de safe-area (se contaba doble). No lo reintroduzcas.

## Trabajo a dos manos (regla para CUALQUIER agente en este repo)
Este repo lo editan dos vías: Josema con Claude Code, y CompAI→OpenCode (dev-mcp hace
pull de origin antes de cada job). **GitHub es el punto de encuentro**: trabajo no
pusheado no existe para la otra vía. Reglas: (1) no descartes cambios sin commitear que
no sean tuyos — pueden ser de la otra vía; pregunta; (2) commit por tarea lógica y push
al terminar; (3) si cambias arquitectura, esquema o decisiones, actualiza este AGENTS.md
en el mismo cambio; (4) si tocas el esquema de Supabase o formatos que CompAI consume en
runtime, dilo explícitamente en tu resumen final.
