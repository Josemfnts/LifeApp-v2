# Órdenes para OpenCode — Tanda 4: conector de relojes (mini PC)

Definido por Claude Code, lo implementa OpenCode. Claude audita/pule después. Reglas en `AGENTS.md`.
**Esto NO es código del repo web** (no toca React/Vite): es un **servicio Python que corre en el mini PC**
de Josema y habla con Supabase. Ponlo en una carpeta nueva `connector/` del repo (para versionarlo) pero
**no lo importa la app**. Verificación: que el script arranque, valide un login y escriba en Supabase.

## Contexto (LÉELO)
Josema decidió (2026-07-12) que el reloj se registra **dentro de la app**: el usuario guarda las credenciales
de su cuenta Garmin/Zepp desde la pestaña Físico > Salud. Claude ya dejó hecho el lado web + la base de datos:

- **Tabla `wearable_accounts`** (migración 011, APLICADA): `user_id, provider('garmin'|'zepp'), email, secret,
  status('pending'|'connected'|'error'), error, last_sync, sync_requested_at, created_at`. PK `(user_id, provider)`.
  El cliente escribe `secret` pero NO puede leerlo (privilegio por columna); **tú lo lees con la `service_role`**.
- **Tabla `health_metrics`** (migración 010, APLICADA): `user_id, date, metric, value, unit, source, payload, updated_at`.
  PK `(user_id, date, metric)`. Ahí escribes las métricas. Métricas canónicas que la app pinta (usa estos slugs):
  `steps`, `sleep_minutes`, `resting_hr`, `stress`, `body_battery`, `calories`, `distance_m`, `spo2`, `hr_avg`.
- La app ya muestra estado (Conectando/Conectado/Error), `last_sync` y un botón **Actualizar** que pone
  `sync_requested_at = now()`.

## TU PARTE — el conector (servicio Python en `connector/`)
Un proceso que corre en bucle (o por cron cada ~5 min) en el mini PC. **Nada de Docker** (RAM sagrada): script
ligero, `pip install` normal, systemd timer o cron. Secretos por variables de entorno (`.env` local, gitignored).

### Config / secretos (env)
- `SUPABASE_URL=https://plgwbctxseuuujuepmfe.supabase.co`
- `SUPABASE_SERVICE_ROLE=<la service_role>` — Claude la pondrá en el `.env` del mini PC; NO la commitees.
  (Se saca con el token Management de la memoria de Claude; no la incrustes en código.)

### Ciclo (cada pasada)
1. Leer de `wearable_accounts` (con service_role, salta RLS) todas las cuentas.
2. Para cada cuenta, decidir si toca sincronizar:
   - `status = 'pending'` (alta nueva o credenciales recién cambiadas) → validar login y sincronizar.
   - `sync_requested_at > last_sync` (o `last_sync` null) → el usuario pulsó Actualizar → sincronizar.
   - Sincronización diaria: si la última fue hace > ~20 h → sincronizar (para la pasada de la mañana; puedes
     además tener un cron a las 07:00 que fuerce a todos).
   - Si no, saltar (no re-loguear en cada pasada — a las APIs no oficiales no les gusta).
3. Sincronizar una cuenta:
   - **Garmin** (`provider='garmin'`): librería `garminconnect` (pip). Login con `email`/`secret`.
     Traer de los **últimos ~7 días**: pasos (`get_steps_data`/daily summary), sueño (`get_sleep_data` → minutos
     totales), FC reposo (`get_rhr_day`/daily), estrés (`get_stress_data` → media o valor diario), body battery,
     calorías. Mapear cada día a filas `health_metrics` con `source='garmin'`.
   - **Zepp/Amazfit** (`provider='zepp'`): API no oficial Huami (mira `huami-token` / cómo lo hace Gadgetbridge:
     login con cuenta Zepp → access token → endpoints de band data). MVP: **pasos y sueño** (es lo fiable);
     FC/estrés si el endpoint los da. `source='zepp'`. Si el login/endpoint falla, marca error (ver abajo) — es
     esperable que Zepp sea frágil; no rompas el ciclo por ello.
   - Upsert en `health_metrics` con `on_conflict=(user_id,date,metric)` (PostgREST: `Prefer: resolution=merge-duplicates`,
     o `upsert` del cliente `supabase-py`). Una fila por (día, métrica).
4. Actualizar la cuenta: si fue bien → `status='connected'`, `error=null`, `last_sync=now()`. Si el login falla por
   credenciales → `status='error'`, `error='Credenciales incorrectas'` (mensaje corto y legible, se muestra tal cual
   en la app). Si falla por otra cosa (red, API caída) → `status='error'`, `error` explicativo, pero **no borres**
   las credenciales; reintenta en la siguiente pasada.

### Detalles
- **2FA de Garmin**: si la cuenta tiene verificación en dos pasos, `garminconnect` puede pedir MFA y fallará el
  login automático → marca `error='La cuenta tiene verificación en dos pasos; desactívala para sincronizar'`.
- **Sesiones**: cachea el token/sesión de Garmin en disco (`connector/.sessions/`) para no re-loguear cada pasada
  (garminconnect soporta `garth` dump/load). Gitignora esa carpeta.
- **Zona horaria**: las fechas `date` de `health_metrics` son día natural del usuario; usa la fecha local del dato
  que da la API, no UTC cruda, para no descuadrar el "ayer".
- **Idempotencia**: como es upsert por (user_id,date,metric), re-sincronizar el mismo día solo actualiza valores.
- **Logs**: a stdout/fichero, sin volcar secretos.

### Entregables
- `connector/sync.py` (o módulo), `connector/requirements.txt`, `connector/README.md` (cómo arrancarlo + systemd/cron
  de ejemplo), `connector/.env.example`. `.gitignore` para `.env` y `.sessions/`.
- **Aceptación**: con una cuenta de prueba en `wearable_accounts`, una pasada valida el login, escribe filas en
  `health_metrics` del día, y deja `status='connected'` + `last_sync`. Con credenciales malas deja `status='error'`
  con mensaje. El botón Actualizar de la app (pone `sync_requested_at`) dispara una sincronización en la pasada siguiente.

## NO TOQUES
- El front de Salud, `src/lib/health.ts` ni las migraciones (ya hechos por Claude).
- No metas la `service_role` en el repo. No añadas Docker.

## Al terminar
Árbol limpio, `connector/` pusheado (sin secretos), y avisa a Josema para que Claude audite y ayude a Josema a
arrancarlo en el mini PC con las dos cuentas reales (Amazfit de Josema + Garmin de su pareja).
