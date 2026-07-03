-- Life OS — Sistema social (feed comunitario)
-- Posts públicos entre usuarios autenticados; solo el autor edita/borra los suyos.
-- Imágenes v1: data URL comprimido en image_url (columna text). Migrar a Supabase
-- Storage cuando crezca el volumen.

CREATE TABLE IF NOT EXISTS social_posts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  author TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('workout','pr','meal','recipe','photo','text')),
  title TEXT DEFAULT '',
  body TEXT DEFAULT '',
  data JSONB DEFAULT '{}'::jsonb,
  image_url TEXT,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_created ON social_posts(created_at DESC);

CREATE TABLE IF NOT EXISTS social_likes (
  post_id BIGINT REFERENCES social_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_likes ENABLE ROW LEVEL SECURITY;

-- Posts: cualquiera autenticado ve el feed; solo el autor escribe/edita/borra lo suyo.
DROP POLICY IF EXISTS social_posts_select ON social_posts;
CREATE POLICY social_posts_select ON social_posts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS social_posts_insert ON social_posts;
CREATE POLICY social_posts_insert ON social_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS social_posts_update ON social_posts;
CREATE POLICY social_posts_update ON social_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS social_posts_delete ON social_posts;
CREATE POLICY social_posts_delete ON social_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Likes: todos los ven, cada uno gestiona los suyos.
DROP POLICY IF EXISTS social_likes_select ON social_likes;
CREATE POLICY social_likes_select ON social_likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS social_likes_insert ON social_likes;
CREATE POLICY social_likes_insert ON social_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS social_likes_delete ON social_likes;
CREATE POLICY social_likes_delete ON social_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Contador de likes desnormalizado, mantenido por trigger (SECURITY DEFINER para
-- poder tocar posts de otros usuarios sin romper RLS).
CREATE OR REPLACE FUNCTION social_bump_likes() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE social_posts SET likes = likes + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE social_posts SET likes = GREATEST(0, likes - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_social_likes ON social_likes;
CREATE TRIGGER trg_social_likes
  AFTER INSERT OR DELETE ON social_likes
  FOR EACH ROW EXECUTE FUNCTION social_bump_likes();

-- Grants (el esquema perdió los defaults en 001; ver 003).
GRANT ALL ON social_posts TO anon, authenticated;
GRANT ALL ON social_likes TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE social_posts_id_seq TO anon, authenticated;
