-- 012: `last_attempt` en wearable_accounts — backoff de reintentos del conector.
--
-- POR QUÉ: `last_sync` solo se rellena cuando una sincronización TERMINA BIEN. Una cuenta con
-- credenciales malas nunca lo rellena → el conector la reintentaba en cada pasada (cada ~5 min),
-- martilleando al proveedor. Verificado en real: Garmin devolvió **429 IP rate limited** al probar
-- logins seguidos, y eso afecta a TODOS los usuarios que sincronizan desde ese mini PC.
--
-- Con `last_attempt` (se escribe SIEMPRE, salga bien o mal) el conector puede espaciar los
-- reintentos de las cuentas en error (ver ERROR_BACKOFF_HOURS en sync.py) sin dejar de atender
-- al instante las altas nuevas y el botón "Actualizar".
--
-- El front no necesita esta columna (no la selecciona); es de uso interno del conector.

alter table public.wearable_accounts
  add column if not exists last_attempt timestamptz;

comment on column public.wearable_accounts.last_attempt is
  'Último intento de sincronización (exitoso o no). Lo escribe el conector; sirve para el backoff de reintentos.';
