-- Life OS — Comunidad v2 (red social de fitness/wellness)
-- Amplía el sistema social de la migración 005 con: perfiles públicos, seguidores,
-- comentarios, reposts, notificaciones y nuevos tipos de contenido compartible
-- (rutinas, recetas, dietas semanales, objetivos, resúmenes de entreno).
--
-- Mantiene la filosofía local-first: la nube es un espejo para lo social (esto SÍ
-- vive en Supabase por naturaleza multi-usuario, a diferencia del resto de dominios
-- que van por store_data). RLS en todo. Contadores desnormalizados por trigger.
-- Imágenes: data URL comprimido (ver social.ts). Migrar a Storage cuando crezca.

------------------------------------------------------------------------------
-- 1. Ampliar social_posts: nuevos tipos + contadores + repost
------------------------------------------------------------------------------
-- Nuevo set de tipos (añade routine, diet, goal, progress). Se recrea el CHECK.
ALTER TABLE social_posts DROP CONSTRAINT IF EXISTS social_posts_type_check;
ALTER TABLE social_posts ADD CONSTRAINT social_posts_type_check
  CHECK (type IN ('workout','pr','meal','recipe','photo','text','routine','diet','goal','progress'));

ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS repost_count INTEGER NOT NULL DEFAULT 0;
-- repost_of: si no es NULL, este post es un repost del post referenciado.
-- El snapshot del original se guarda en data.original para renderizar sin join.
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS repost_of BIGINT REFERENCES social_posts(id) ON DELETE SET NULL;

------------------------------------------------------------------------------
-- 2. Perfiles públicos
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS social_profiles (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  username     TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  bio          TEXT NOT NULL DEFAULT '',
  avatar_url   TEXT,
  -- stats públicos que el usuario decide publicar (nivel XP, entrenos, racha, insignias…)
  stats        JSONB NOT NULL DEFAULT '{}'::jsonb,
  follower_count  INTEGER NOT NULL DEFAULT 0,
  following_count INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_social_profiles_username ON social_profiles(lower(username));

------------------------------------------------------------------------------
-- 3. Seguidores
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS social_follows (
  follower_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX IF NOT EXISTS idx_social_follows_following ON social_follows(following_id);

------------------------------------------------------------------------------
-- 4. Comentarios
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS social_comments (
  id         BIGSERIAL PRIMARY KEY,
  post_id    BIGINT REFERENCES social_posts(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  author     TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_social_comments_post ON social_comments(post_id, created_at);

------------------------------------------------------------------------------
-- 5. Notificaciones
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS social_notifications (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- destinatario
  actor_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- quién la provoca
  actor_name TEXT NOT NULL DEFAULT '',
  type       TEXT NOT NULL CHECK (type IN ('like','comment','follow','repost')),
  post_id    BIGINT REFERENCES social_posts(id) ON DELETE CASCADE,
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_social_notif_user ON social_notifications(user_id, created_at DESC);

------------------------------------------------------------------------------
-- RLS
------------------------------------------------------------------------------
ALTER TABLE social_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_follows       ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_notifications ENABLE ROW LEVEL SECURITY;

-- Perfiles: todos los ven; cada uno gestiona el suyo.
DROP POLICY IF EXISTS social_profiles_select ON social_profiles;
CREATE POLICY social_profiles_select ON social_profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS social_profiles_insert ON social_profiles;
CREATE POLICY social_profiles_insert ON social_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS social_profiles_update ON social_profiles;
CREATE POLICY social_profiles_update ON social_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Follows: todos los ven; cada uno crea/borra los suyos (como follower).
DROP POLICY IF EXISTS social_follows_select ON social_follows;
CREATE POLICY social_follows_select ON social_follows FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS social_follows_insert ON social_follows;
CREATE POLICY social_follows_insert ON social_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS social_follows_delete ON social_follows;
CREATE POLICY social_follows_delete ON social_follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- Comentarios: todos los ven; el autor escribe/borra los suyos.
DROP POLICY IF EXISTS social_comments_select ON social_comments;
CREATE POLICY social_comments_select ON social_comments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS social_comments_insert ON social_comments;
CREATE POLICY social_comments_insert ON social_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS social_comments_delete ON social_comments;
CREATE POLICY social_comments_delete ON social_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Notificaciones: solo el destinatario las ve y las marca leídas. Se insertan por
-- trigger (SECURITY DEFINER), nunca directamente desde el cliente.
DROP POLICY IF EXISTS social_notif_select ON social_notifications;
CREATE POLICY social_notif_select ON social_notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS social_notif_update ON social_notifications;
CREATE POLICY social_notif_update ON social_notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS social_notif_delete ON social_notifications;
CREATE POLICY social_notif_delete ON social_notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

------------------------------------------------------------------------------
-- Triggers: contadores desnormalizados + notificaciones
------------------------------------------------------------------------------
-- Nombre visible del actor a partir de su perfil (fallback 'Alguien').
CREATE OR REPLACE FUNCTION social_actor_name(uid UUID) RETURNS TEXT
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(display_name, ''), username, 'Alguien') FROM social_profiles WHERE user_id = uid;
$$;

-- Likes: contador + notificación al autor del post.
CREATE OR REPLACE FUNCTION social_on_like() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE social_posts SET likes = likes + 1 WHERE id = NEW.post_id
      RETURNING user_id INTO owner_id;
    IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN
      INSERT INTO social_notifications(user_id, actor_id, actor_name, type, post_id)
      VALUES (owner_id, NEW.user_id, social_actor_name(NEW.user_id), 'like', NEW.post_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE social_posts SET likes = GREATEST(0, likes - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_social_likes ON social_likes;
CREATE TRIGGER trg_social_likes AFTER INSERT OR DELETE ON social_likes
  FOR EACH ROW EXECUTE FUNCTION social_on_like();

-- Comentarios: contador + notificación al autor del post.
CREATE OR REPLACE FUNCTION social_on_comment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE social_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id
      RETURNING user_id INTO owner_id;
    IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN
      INSERT INTO social_notifications(user_id, actor_id, actor_name, type, post_id)
      VALUES (owner_id, NEW.user_id, social_actor_name(NEW.user_id), 'comment', NEW.post_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE social_posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_social_comments ON social_comments;
CREATE TRIGGER trg_social_comments AFTER INSERT OR DELETE ON social_comments
  FOR EACH ROW EXECUTE FUNCTION social_on_comment();

-- Follows: contadores en ambos perfiles + notificación al seguido.
CREATE OR REPLACE FUNCTION social_on_follow() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE social_profiles SET follower_count = follower_count + 1 WHERE user_id = NEW.following_id;
    UPDATE social_profiles SET following_count = following_count + 1 WHERE user_id = NEW.follower_id;
    INSERT INTO social_notifications(user_id, actor_id, actor_name, type)
    VALUES (NEW.following_id, NEW.follower_id, social_actor_name(NEW.follower_id), 'follow');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE social_profiles SET follower_count = GREATEST(0, follower_count - 1) WHERE user_id = OLD.following_id;
    UPDATE social_profiles SET following_count = GREATEST(0, following_count - 1) WHERE user_id = OLD.follower_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_social_follows ON social_follows;
CREATE TRIGGER trg_social_follows AFTER INSERT OR DELETE ON social_follows
  FOR EACH ROW EXECUTE FUNCTION social_on_follow();

-- Reposts: al insertar un post con repost_of, sube el contador del original y
-- notifica a su autor.
CREATE OR REPLACE FUNCTION social_on_repost() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id UUID;
BEGIN
  IF NEW.repost_of IS NOT NULL THEN
    UPDATE social_posts SET repost_count = repost_count + 1 WHERE id = NEW.repost_of
      RETURNING user_id INTO owner_id;
    IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN
      INSERT INTO social_notifications(user_id, actor_id, actor_name, type, post_id)
      VALUES (owner_id, NEW.user_id, social_actor_name(NEW.user_id), 'repost', NEW.repost_of);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_social_repost ON social_posts;
CREATE TRIGGER trg_social_repost AFTER INSERT ON social_posts
  FOR EACH ROW EXECUTE FUNCTION social_on_repost();

------------------------------------------------------------------------------
-- Grants (el esquema perdió defaults en 001; ver 003/005).
------------------------------------------------------------------------------
GRANT ALL ON social_profiles      TO anon, authenticated;
GRANT ALL ON social_follows       TO anon, authenticated;
GRANT ALL ON social_comments      TO anon, authenticated;
GRANT ALL ON social_notifications TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE social_comments_id_seq      TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE social_notifications_id_seq TO anon, authenticated;
