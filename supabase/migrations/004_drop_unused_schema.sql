-- Life OS — eliminar el esquema "clásico" (30+ tablas) nunca usado en runtime
-- Toda la app guarda datos reales en store_data (ver 003_store_data_multitenant.sql).
-- Estas tablas venían de una generación anterior de la app que iba a usar tablas
-- normalizadas por dominio; nunca se conectó (syncToSupabase/fetchFromSupabase no
-- se llaman desde ningún componente). Verificado antes de aplicar: las 31 tablas
-- tienen 0 filas.

BEGIN;

DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS travel_ideas CASCADE;
DROP TABLE IF EXISTS pufos CASCADE;
DROP TABLE IF EXISTS huchas CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS body_metrics CASCADE;
DROP TABLE IF EXISTS meal_logs CASCADE;
DROP TABLE IF EXISTS recipe_ingredients CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS foods CASCADE;
DROP TABLE IF EXISTS mobility_session_exercises CASCADE;
DROP TABLE IF EXISTS mobility_sessions CASCADE;
DROP TABLE IF EXISTS mobility_exercises CASCADE;
DROP TABLE IF EXISTS mobility_routines CASCADE;
DROP TABLE IF EXISTS run_plans CASCADE;
DROP TABLE IF EXISTS run_intervals CASCADE;
DROP TABLE IF EXISTS runs CASCADE;
DROP TABLE IF EXISTS session_sets CASCADE;
DROP TABLE IF EXISTS session_exercises CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS routine_exercises CASCADE;
DROP TABLE IF EXISTS routines CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS habit_logs CASCADE;
DROP TABLE IF EXISTS habits CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS pending_tasks CASCADE;
DROP TABLE IF EXISTS recurring_tasks CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS xp_entries CASCADE;

DROP FUNCTION IF EXISTS apply_owner_policy(text);

COMMIT;
