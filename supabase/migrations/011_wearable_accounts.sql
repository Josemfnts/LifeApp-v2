-- 011: wearable_accounts — registro de relojes DENTRO de la app (decisión Josema 2026-07-12):
-- el usuario guarda las credenciales de su cuenta Garmin Connect o Zepp (Amazfit) desde la
-- hoja "Conectar reloj"; el conector del mini PC (service_role) las lee, valida el login y
-- sincroniza las métricas a `health_metrics` 2 veces al día o cuando el usuario pide
-- actualizar (señal `sync_requested_at`).
--
-- SEGURIDAD: aislamiento por RLS (`auth.uid() = user_id`) — cada usuario solo ve/edita SU fila.
-- La contraseña del proveedor va en `secret`; el conector la lee con service_role. Se evaluó
-- hacer `secret` de solo-escritura para el cliente vía privilegios POR COLUMNA, pero PostgREST
-- necesita SELECT de tabla completo para resolver el upsert (ON CONFLICT) → incompatible. Como
-- el riesgo real es mínimo (el dueño releyendo su propia contraseña, que él mismo tecleó; el
-- cruce entre usuarios lo corta la RLS) y Josema priorizó enviar esto, nos quedamos con RLS.
-- El front igualmente selecciona columnas explícitas (sin `secret`), así que en la práctica el
-- cliente nunca lo descarga. Endurecer a futuro: mover `secret` a tabla aparte + RPC definer.

create table if not exists public.wearable_accounts (
  user_id           uuid        not null references auth.users (id) on delete cascade,
  provider          text        not null check (provider in ('garmin', 'zepp')),
  email             text        not null,
  secret            text        not null,           -- contraseña del proveedor (solo la lee el conector)
  status            text        not null default 'pending' check (status in ('pending', 'connected', 'error')),
  error             text,                            -- mensaje legible si status='error'
  last_sync         timestamptz,                     -- última sincronización completada por el conector
  sync_requested_at timestamptz,                     -- botón "Actualizar": el conector sincroniza ya si > last_sync
  created_at        timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.wearable_accounts enable row level security;

create policy "wearable_accounts_select_own" on public.wearable_accounts
  for select using (auth.uid() = user_id);
create policy "wearable_accounts_insert_own" on public.wearable_accounts
  for insert with check (auth.uid() = user_id);
create policy "wearable_accounts_update_own" on public.wearable_accounts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "wearable_accounts_delete_own" on public.wearable_accounts
  for delete using (auth.uid() = user_id);

-- anon no necesita acceso (la app usa la anon key como apikey pero con JWT de usuario → rol
-- authenticated). El acceso de authenticated queda acotado por RLS a su propia fila.
revoke all on public.wearable_accounts from anon;
grant select, insert, update, delete on public.wearable_accounts to authenticated;

-- El conector del mini PC lee credenciales y actualiza estado con la service_role.
grant all on table public.wearable_accounts to service_role;
