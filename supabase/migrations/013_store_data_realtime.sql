-- Espejo VIVO de store_data (plan "espejo vivo", fase 1+2)
--
-- 1) Publica store_data en Realtime: la app abierta recibe al instante los
--    INSERT/UPDATE que hace CompAI (service_role) u otro dispositivo.
--    postgres_changes respeta RLS: cada usuario solo recibe sus propias filas.
--
-- 2) Trigger que fija updated_at = now() del servidor en cada escritura.
--    updated_at es la "versión" que usa la app para sus escrituras
--    condicionadas (lifeos_sync_meta): sin el trigger, un escritor que no
--    mande updated_at (o con el reloj desviado) dejaría la versión sin cambiar
--    y el detector de conflictos no vería su escritura.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'store_data'
  ) then
    alter publication supabase_realtime add table public.store_data;
  end if;
end $$;

create or replace function public.touch_store_data_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists store_data_touch_updated_at on public.store_data;
create trigger store_data_touch_updated_at
  before insert or update on public.store_data
  for each row execute function public.touch_store_data_updated_at();
