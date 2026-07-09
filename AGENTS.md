# AGENTS.md — Life OS (`lifeapp-v2`)

PWA personal de "sistema operativo de vida": una sola app donde el usuario (Josema) gestiona
**Agenda** (+Kanban de proyectos), **Hábitos**, **Físico** (entrenos/rutinas), **Nutrición**,
**Finanzas**, **Diario**, **Pomodoro** y **Comunidad** (social), con una capa de **gamificación
XP** por encima. En la práctica es single-user, pero tiene login (Supabase Auth) y sincronización
multi-dispositivo. Es una app **local-first**: funciona entera sin conexión y sin cuenta.

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
                     Finanzas, Diario, Pomodoro, Comunidad, Login (los 9 primeros son rutas)
  stores/            Zustand por dominio: agendaStore, financeStore, fisicoStore, nutriStore, toast
  lib/               storageKeys · storage · sync · supabase · notifications · dates · xp-engine · social
  components/
    ui/              Átomos reutilizables (Badge, Button, Card, EmptyState, Input, Modal,
                     ProgressBar, TabBar) — exportados desde components/ui/index.ts
    layout/          Shell, NavBar, TopBar, SplashScreen
    agenda/ habits/  Componentes específicos de módulo
  contexts/          ThemeContext (tema), XPContext (gamificación)
  data/              Bases de datos estáticas: recetas (v1/v2), rutinas (v1/v2), foods
  types/             Tipos compartidos
supabase/migrations/ 001..005 (ver §Datos)
```
Alias de imports: **`@/` → `src/`** (ej. `import { supabase } from '@/lib/supabase'`). Úsalo siempre.

## Arquitectura de datos — LÉELO antes de tocar cualquier dato
Este es el corazón de la app y donde estaban los bugs graves. Tres reglas:

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
   reintroduzcas salvo decisión explícita.

Helpers de storage en [`src/lib/storage.ts`](src/lib/storage.ts): `getItem/setItem` (prefijan `lifeos_`)
y `loadFromStorage/saveToStorage` (clave completa, sin prefijo) — ambos sincronizan a la nube. Los stores
Zustand usan las claves de `storageKeys.ts` directamente. El módulo **Comunidad** sí habla con Supabase
aparte (`src/lib/social.ts`, migración `005_social.sql`).

Migraciones: `001` esquema inicial (ya en desuso), `002` tabla `store_data`, **`003` multi-tenant + grants**,
`004` borra el esquema muerto, `005` social/comunidad.

## Convenciones y patrones
- **Páginas lazy**: cada página se importa con `lazy()` y se envuelve en `Suspense` (`App.tsx`).
- **Theming**: colores vía CSS variables (`var(--color-dim)`, etc.), no hex hardcodeados — se migraron
  68 colores a variables; respeta eso al añadir estilos.
- **Atajos de teclado**: leader key **`g`** y luego `1..9` navega entre módulos (patrón Gmail/GitHub);
  implementado dentro del Router para no recargar la página (`App.tsx:KeyboardShortcuts`).
- **Deep-link iOS**: `?kanban=texto&priority=&project=` añade una tarjeta al Kanban al abrir (atajo de iOS).
- **Notificaciones locales**: `checkHabitReminders` / `checkAgendaReminders` (`src/lib/notifications.ts`).
- Idioma del producto y de los comentarios: **español**. Sigue ese estilo.

## Estado actual (verificado contra el código, 2026-07-08)
La auditoría del 1-jul ya está mayormente resuelta:
- ✅ **C1/C2** (fuga entre usuarios + grants rotos) → migración `003_store_data_multitenant`.
- ✅ **C3/A1/A2** (claves divergentes en Dashboard/backup/notificaciones) → `storageKeys.ts` + helpers unificados.
- ✅ **M6** (esquema muerto) → migración `004_drop_unused_schema`.
- ⚠️ **C4** (PAT de GitHub en el remote + repo público): es acción manual del usuario; **confirmar** que
  el token se revocó y el remote se limpió (`git remote -v`). No verificable desde el código.
- Desde entonces se añadió mucho: Kanban de proyectos, módulo **Comunidad** (social), 4 bases de datos de
  recetas/rutinas, rediseño visual y refactor del módulo Físico.

## Gotchas
- `.env` (anon key de Supabase) está versionado. La anon key es **pública por diseño** — ok. **Nunca**
  metas una `service_role` key en el cliente ni en `.env`.
- Antes de dar por bueno un cambio de datos, comprueba que la clave existe en `storageKeys.ts` y que
  Dashboard/backup la contemplan — es el punto exacto donde esta app se rompió antes.
- El build **es** el typecheck (`tsc -b && vite build`): un error de tipos tira el build entero.
