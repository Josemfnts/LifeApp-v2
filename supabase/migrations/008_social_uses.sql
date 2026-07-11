-- Life OS — Comunidad: "han usado tu contenido"
-- Cuando alguien importa una rutina/receta/menú del feed a sus propios datos
-- ("Usar esta rutina"), se registra en social_uses y un trigger notifica al
-- autor del post. Mismo patrón que likes/follows/comments de 005/007.

-- Nuevo tipo de notificación
ALTER TABLE social_notifications DROP CONSTRAINT IF EXISTS social_notifications_type_check;
ALTER TABLE social_notifications ADD CONSTRAINT social_notifications_type_check
  CHECK (type IN ('like','comment','follow','repost','use'));

-- Contador desnormalizado de usos
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS use_count INTEGER NOT NULL DEFAULT 0;

-- Registro de usos (quién importó qué). PK evita duplicar y re-notificar.
CREATE TABLE IF NOT EXISTS social_uses (
  post_id    BIGINT REFERENCES social_posts(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_social_uses_post ON social_uses(post_id);

ALTER TABLE social_uses ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados los ven; cada uno gestiona los suyos.
DROP POLICY IF EXISTS social_uses_select ON social_uses;
CREATE POLICY social_uses_select ON social_uses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS social_uses_insert ON social_uses;
CREATE POLICY social_uses_insert ON social_uses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS social_uses_delete ON social_uses;
CREATE POLICY social_uses_delete ON social_uses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Contador + notificación al autor del post (reutiliza social_actor_name de 007).
CREATE OR REPLACE FUNCTION social_on_use() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE social_posts SET use_count = use_count + 1 WHERE id = NEW.post_id
      RETURNING user_id INTO owner_id;
    IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN
      INSERT INTO social_notifications(user_id, actor_id, actor_name, type, post_id)
      VALUES (owner_id, NEW.user_id, social_actor_name(NEW.user_id), 'use', NEW.post_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE social_posts SET use_count = GREATEST(0, use_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_social_uses ON social_uses;
CREATE TRIGGER trg_social_uses AFTER INSERT OR DELETE ON social_uses
  FOR EACH ROW EXECUTE FUNCTION social_on_use();

-- Grants (mismo criterio que 005/007: anon+authenticated, RLS filtra).
GRANT ALL ON social_uses TO anon, authenticated;
