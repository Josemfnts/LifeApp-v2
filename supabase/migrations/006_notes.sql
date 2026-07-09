-- ============================================================
-- LIFE OS · Módulo Notas (tipo Notion)
-- Ejecutar en el SQL Editor del proyecto Supabase de Life OS.
-- No toca ninguna tabla existente. Todo va con prefijo "pages".
-- ============================================================

-- 1. Páginas -------------------------------------------------
create table if not exists public.pages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  parent_id   uuid references public.pages (id) on delete cascade,
  title       text not null default 'Sin título',
  icon        text,                        -- emoji opcional
  content     jsonb,                       -- documento BlockNote completo (array de bloques)
  search_text text,                        -- texto plano extraído en cliente al guardar (para buscador)
  is_favorite boolean not null default false,
  position    double precision not null default extract(epoch from now()), -- orden en sidebar
  deleted_at  timestamptz,                 -- papelera (soft delete)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists pages_user_idx      on public.pages (user_id) where deleted_at is null;
create index if not exists pages_parent_idx    on public.pages (parent_id) where deleted_at is null;
create index if not exists pages_trash_idx     on public.pages (user_id) where deleted_at is not null;

-- updated_at automático
create or replace function public.notes_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists pages_updated_at on public.pages;
create trigger pages_updated_at
  before update on public.pages
  for each row execute function public.notes_set_updated_at();

-- 2. Cables página <-> entidad de Life OS --------------------
-- Une una página con cualquier cosa de tu app: un entreno, un
-- proyecto, una posición de trading, un día del diario...
-- entity_id es text a propósito: admite uuids ('a1b2...'),
-- ids numéricos ('42') o claves de fecha ('2026-07-09').
create table if not exists public.page_links (
  page_id     uuid not null references public.pages (id) on delete cascade,
  entity_type text not null,   -- 'workout' | 'project' | 'task' | 'position' | 'goal' | 'day' | ...
  entity_id   text not null,
  created_at  timestamptz not null default now(),
  primary key (page_id, entity_type, entity_id)
);

create index if not exists page_links_entity_idx on public.page_links (entity_type, entity_id);

-- 3. RLS ------------------------------------------------------
alter table public.pages      enable row level security;
alter table public.page_links enable row level security;

drop policy if exists "pages_own" on public.pages;
create policy "pages_own" on public.pages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "page_links_own" on public.page_links;
create policy "page_links_own" on public.page_links
  for all using (
    exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid())
  );

-- ============================================================
-- Preparado para v2 (sin migraciones futuras):
--  · search_text ya existe -> añadir índice trigram cuando el
--    buscador por contenido sea prioridad:
--      create extension if not exists pg_trgm;
--      create index pages_search_trgm on public.pages
--        using gin (search_text gin_trgm_ops);
--  · position ya es double precision -> drag & drop de páginas
--    solo requiere UI (insertar entre dos = media aritmética).
--  · page_links es N:M -> una página puede colgar de varios
--    entrenos/proyectos sin cambiar el esquema.
-- ============================================================
