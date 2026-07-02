-- Life OS — store_data multi-tenant + restaurar grants del schema
-- Corrige dos hallazgos críticos de la auditoría:
--   1) store_data no tenía user_id y su RLS era USING(true): fuga entre usuarios.
--   2) El DROP SCHEMA CASCADE de 001_initial_schema.sql borró los grants por
--      defecto de Supabase: anon/authenticated recibían 42501 en TODAS las tablas.
--
-- IMPORTANTE: el backfill de abajo asume que solo tienes UNA cuenta confirmada.
-- Si has creado varias cuentas de prueba, revisa el resultado del SELECT antes
-- de confiar en el backfill, o hazlo a mano. Borra también la cuenta de prueba
-- audit.test.*@protonmail.com creada durante la auditoría (Authentication > Users)
-- antes de correr esto, para que no contamine el backfill.

-- 1) Añadir user_id (nullable primero, para no romper filas existentes)
ALTER TABLE store_data ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2) Backfill: atribuye filas huérfanas a la cuenta confirmada más antigua.
--    Si store_data está vacía (lo más probable, dado que los grants estaban
--    rotos y todo caía a localStorage), esto no hace nada.
UPDATE store_data
SET user_id = (SELECT id FROM auth.users WHERE email_confirmed_at IS NOT NULL ORDER BY created_at ASC LIMIT 1)
WHERE user_id IS NULL;

-- 3) A partir de aquí, todo registro debe tener dueño
ALTER TABLE store_data ALTER COLUMN user_id SET NOT NULL;

-- 4) Clave primaria compuesta: la misma "key" puede repetirse entre usuarios
ALTER TABLE store_data DROP CONSTRAINT IF EXISTS store_data_pkey;
ALTER TABLE store_data ADD PRIMARY KEY (user_id, key);

-- 5) RLS real: sustituye el USING(true) por aislamiento por usuario
DROP POLICY IF EXISTS "Users can manage their own store_data" ON store_data;
CREATE POLICY "Users can manage their own store_data" ON store_data
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6) Restaurar los grants por defecto de Supabase en TODO el schema public.
--    Sin esto, RLS nunca llega a evaluarse: Postgres deniega el permiso antes
--    (42501 permission denied), como se verificó contra la API real.
--    Es seguro aplicarlo después del punto 5: hasta que se ejecuta este GRANT,
--    nadie tiene acceso a store_data, así que no hay ventana en la que el
--    USING(true) antiguo quede expuesto con permisos ya restaurados.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
