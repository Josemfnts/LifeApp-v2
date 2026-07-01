-- Life OS — Schema inicial
-- Ejecutar en Supabase SQL Editor

-- XP Log
CREATE TABLE IF NOT EXISTS xp_entries (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  area TEXT NOT NULL CHECK (area IN ('disc', 'fuerza', 'intel', 'riqueza')),
  amount INTEGER NOT NULL,
  concept TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_xp_user_date ON xp_entries(user_id, date);
CREATE INDEX idx_xp_user_area ON xp_entries(user_id, area);

-- Goals / Objetivos
CREATE TABLE IF NOT EXISTS goals (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  area TEXT NOT NULL CHECK (area IN ('disc', 'fuerza', 'intel', 'riqueza')),
  current_val NUMERIC DEFAULT 0,
  goal_val NUMERIC NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME,
  color TEXT DEFAULT 'blue',
  done BOOLEAN DEFAULT FALSE,
  is_overdue BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recurring_tasks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  color TEXT DEFAULT 'blue',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pending_tasks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  color TEXT DEFAULT 'blue',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shifts
CREATE TABLE IF NOT EXISTS shifts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL UNIQUE,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('TM', 'TT', 'TN', 'L')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habits
CREATE TABLE IF NOT EXISTS habits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '⭐',
  color TEXT DEFAULT '#9b7fe0',
  type TEXT DEFAULT 'bool' CHECK (type IN ('bool', 'count')),
  freq TEXT DEFAULT 'daily' CHECK (freq IN ('daily', 'weekdays', 'weekend', 'custom')),
  goal INTEGER DEFAULT 1,
  unit TEXT DEFAULT '',
  note TEXT DEFAULT '',
  days SMALLINT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id BIGSERIAL PRIMARY KEY,
  habit_id BIGINT REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  value NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(habit_id, date)
);

CREATE INDEX idx_habit_logs_date ON habit_logs(date);
CREATE INDEX idx_habit_logs_habit ON habit_logs(habit_id, date);

-- Training Sessions
CREATE TABLE IF NOT EXISTS exercises (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  "group" TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routines (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routine_exercises (
  id BIGSERIAL PRIMARY KEY,
  routine_id BIGINT REFERENCES routines(id) ON DELETE CASCADE NOT NULL,
  exercise_id BIGINT REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  sets INTEGER DEFAULT 3,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  routine_id BIGINT REFERENCES routines(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration INTEGER DEFAULT 0,
  total_kg NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_exercises (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  exercise_id BIGINT REFERENCES exercises(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  "group" TEXT DEFAULT '',
  color TEXT DEFAULT '#e07a5f',
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS session_sets (
  id BIGSERIAL PRIMARY KEY,
  session_exercise_id BIGINT REFERENCES session_exercises(id) ON DELETE CASCADE NOT NULL,
  set_number INTEGER NOT NULL,
  weight NUMERIC DEFAULT 0,
  reps INTEGER DEFAULT 0,
  done BOOLEAN DEFAULT FALSE
);

-- Running
CREATE TABLE IF NOT EXISTS runs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  distance_km NUMERIC NOT NULL,
  time_seconds INTEGER NOT NULL,
  hr_avg INTEGER,
  elevation_gain INTEGER DEFAULT 0,
  type TEXT DEFAULT 'easy',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS run_intervals (
  id BIGSERIAL PRIMARY KEY,
  run_id BIGINT REFERENCES runs(id) ON DELETE CASCADE NOT NULL,
  rep_number INTEGER NOT NULL,
  distance_m NUMERIC,
  pace TEXT,
  recovery_seconds INTEGER
);

CREATE TABLE IF NOT EXISTS run_plans (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  goal TEXT DEFAULT 'general',
  weeks INTEGER DEFAULT 8,
  days_per_week INTEGER DEFAULT 3,
  target_time TEXT,
  start_date DATE,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mobility
CREATE TABLE IF NOT EXISTS mobility_routines (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  focus TEXT DEFAULT 'full',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mobility_exercises (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  focus TEXT DEFAULT 'full',
  duration_seconds INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mobility_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  routine_id BIGINT REFERENCES mobility_routines(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mobility_session_exercises (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES mobility_sessions(id) ON DELETE CASCADE NOT NULL,
  exercise_id BIGINT REFERENCES mobility_exercises(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ
);

-- Nutrition
CREATE TABLE IF NOT EXISTS foods (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  kcal NUMERIC DEFAULT 0,
  protein NUMERIC DEFAULT 0,
  fat NUMERIC DEFAULT 0,
  carbs NUMERIC DEFAULT 0,
  is_custom BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recipes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Comida',
  servings INTEGER DEFAULT 1,
  kcal NUMERIC DEFAULT 0,
  protein NUMERIC DEFAULT 0,
  fat NUMERIC DEFAULT 0,
  carbs NUMERIC DEFAULT 0,
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id BIGSERIAL PRIMARY KEY,
  recipe_id BIGINT REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  food_id BIGINT REFERENCES foods(id) ON DELETE CASCADE NOT NULL,
  grams NUMERIC DEFAULT 100
);

CREATE TABLE IF NOT EXISTS meal_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT DEFAULT 'Comida',
  food_id BIGINT REFERENCES foods(id) ON DELETE SET NULL,
  recipe_id BIGINT REFERENCES recipes(id) ON DELETE SET NULL,
  grams NUMERIC DEFAULT 100,
  kcal NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS body_metrics (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight NUMERIC,
  fat_percent NUMERIC,
  muscle_percent NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finances
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT DEFAULT 'Otros',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS huchas (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target NUMERIC NOT NULL,
  current NUMERIC DEFAULT 0,
  color TEXT DEFAULT '#c9a84c',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pufos (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  total NUMERIC NOT NULL,
  paid NUMERIC DEFAULT 0,
  creditor TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Travel ideas & Activities (from agenda planning)
CREATE TABLE IF NOT EXISTS travel_ideas (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  destin TEXT NOT NULL,
  when_text TEXT DEFAULT '',
  type TEXT DEFAULT 'city',
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activities (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  when_text TEXT DEFAULT '',
  category TEXT DEFAULT 'other',
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE xp_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobility_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobility_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE huchas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pufos ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Helper: apply RLS policy
CREATE OR REPLACE FUNCTION apply_owner_policy(tbl text) RETURNS void AS $$
BEGIN
  EXECUTE format('CREATE POLICY "Users can manage their own %I" ON %I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', tbl, tbl);
END;
$$ LANGUAGE plpgsql;

SELECT apply_owner_policy('xp_entries');
SELECT apply_owner_policy('goals');
SELECT apply_owner_policy('tasks');
SELECT apply_owner_policy('recurring_tasks');
SELECT apply_owner_policy('pending_tasks');
SELECT apply_owner_policy('shifts');
SELECT apply_owner_policy('habits');
SELECT apply_owner_policy('habit_logs');
SELECT apply_owner_policy('exercises');
SELECT apply_owner_policy('routines');
SELECT apply_owner_policy('sessions');
SELECT apply_owner_policy('session_exercises');
SELECT apply_owner_policy('session_sets');
SELECT apply_owner_policy('runs');
SELECT apply_owner_policy('run_plans');
SELECT apply_owner_policy('mobility_routines');
SELECT apply_owner_policy('mobility_sessions');
SELECT apply_owner_policy('meal_logs');
SELECT apply_owner_policy('body_metrics');
SELECT apply_owner_policy('transactions');
SELECT apply_owner_policy('huchas');
SELECT apply_owner_policy('pufos');
SELECT apply_owner_policy('travel_ideas');
SELECT apply_owner_policy('activities');

-- Public foods and recipes (shared by all users, is_custom=false)
CREATE POLICY "Public foods visible to all" ON foods FOR SELECT USING (is_custom = FALSE OR user_id = auth.uid());
CREATE POLICY "Users can insert their own foods" ON foods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own foods" ON foods FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Public recipes visible to all" ON recipes FOR SELECT USING (is_custom = FALSE OR user_id = auth.uid());
CREATE POLICY "Users can insert their own recipes" ON recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recipes" ON recipes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Recipe ingredients visible to owner" ON recipe_ingredients FOR ALL USING (
  EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_id AND (recipes.is_custom = FALSE OR recipes.user_id = auth.uid()))
);

-- Public exercises
CREATE POLICY "Public exercises visible to all" ON exercises FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Users can insert their own exercises" ON exercises FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own exercises" ON exercises FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Mobility exercises visible to all" ON mobility_exercises FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Users can insert their own mobility exercises" ON mobility_exercises FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Routine exercises: users can manage if they own the routine
CREATE POLICY "Owners can manage routine_exercises" ON routine_exercises FOR ALL USING (
  EXISTS (SELECT 1 FROM routines WHERE routines.id = routine_id AND routines.user_id = auth.uid())
);

-- Routine exercises inherit routine owner
CREATE POLICY "Owners can manage routine_exercises" ON routine_exercises FOR ALL USING (
  EXISTS (SELECT 1 FROM routines WHERE routines.id = routine_id AND routines.user_id = auth.uid())
);

-- Session sets inherit session owner
CREATE POLICY "Owners can manage session_sets" ON session_sets FOR ALL USING (
  EXISTS (SELECT 1 FROM session_exercises JOIN sessions ON sessions.id = session_exercises.session_id WHERE session_exercises.id = session_exercise_id AND sessions.user_id = auth.uid())
);

-- Run intervals inherit run owner
CREATE POLICY "Owners can manage run_intervals" ON run_intervals FOR ALL USING (
  EXISTS (SELECT 1 FROM runs WHERE runs.id = run_id AND runs.user_id = auth.uid())
);

-- Mobility session exercises inherit session owner
CREATE POLICY "Owners can manage mobility_session_exercises" ON mobility_session_exercises FOR ALL USING (
  EXISTS (SELECT 1 FROM mobility_sessions WHERE mobility_sessions.id = session_id AND mobility_sessions.user_id = auth.uid())
);
