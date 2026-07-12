-- 010: health_metrics — salud diaria del reloj (Garmin/Amazfit) vía agregador (Terra/Vital).
-- Formato estrecho: una fila por (usuario, día, métrica). El webhook del agregador
-- (Supabase Edge Function, escribe con service_role) hace upsert; el front lee con la
-- sesión del usuario (RLS auth.uid()). `payload` guarda el detalle crudo (p. ej. fases
-- de sueño) por si el front quiere ampliarlo sin migrar.
--
-- Métricas canónicas (slug en `metric`, más pueden añadirse sin migración):
--   steps (pasos) · sleep_minutes (min) · resting_hr (lpm) · stress (0-100)
--   calories (kcal) · distance_m (m) · spo2 (%) · hr_avg (lpm) · body_battery (0-100)

create table if not exists public.health_metrics (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  date       date        not null,
  metric     text        not null,
  value      numeric     not null,
  unit       text,
  source     text,                 -- 'garmin' | 'google_fit' | ... (proveedor según el agregador)
  payload    jsonb,                -- detalle crudo opcional del agregador
  updated_at timestamptz not null default now(),
  primary key (user_id, date, metric)
);

alter table public.health_metrics enable row level security;

create policy "health_metrics_select_own" on public.health_metrics
  for select using (auth.uid() = user_id);
create policy "health_metrics_insert_own" on public.health_metrics
  for insert with check (auth.uid() = user_id);
create policy "health_metrics_update_own" on public.health_metrics
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "health_metrics_delete_own" on public.health_metrics
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on table public.health_metrics to anon, authenticated;
-- A diferencia de 005/007/008, aquí SÍ damos grant a service_role: la Edge Function del
-- webhook escribe con esa key (RLS no le aplica, pero el grant de tabla sí hace falta).
grant all on table public.health_metrics to service_role;
