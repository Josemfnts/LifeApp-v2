-- Life OS — Comunidad: imágenes en Supabase Storage
-- Antes las imágenes (posts y avatares) se guardaban como data URL base64 en la
-- fila (image_url / avatar_url), inflando el feed. Ahora se suben a un bucket y
-- se guarda solo la URL pública. Las imágenes viejas (data URL) siguen
-- renderizando igual: <img src> acepta data: y https:.

-- Bucket público (contenido social, visible por cualquiera que tenga la URL).
INSERT INTO storage.buckets (id, name, public)
VALUES ('social', 'social', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Cada usuario sube a su propia carpeta: social/{uid}/archivo.jpg
DROP POLICY IF EXISTS social_storage_insert ON storage.objects;
CREATE POLICY social_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'social' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Lectura pública (el bucket es público; esto habilita también la API REST).
DROP POLICY IF EXISTS social_storage_select ON storage.objects;
CREATE POLICY social_storage_select ON storage.objects
  FOR SELECT USING (bucket_id = 'social');

-- Borrado/actualización solo de lo propio.
DROP POLICY IF EXISTS social_storage_delete ON storage.objects;
CREATE POLICY social_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'social' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS social_storage_update ON storage.objects;
CREATE POLICY social_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'social' AND (storage.foldername(name))[1] = auth.uid()::text);
