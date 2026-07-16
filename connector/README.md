# Conector de relojes — LifeApp

Servicio Python que corre **en el mini PC** (no en la app web ni en Vercel). Lee los relojes
que los usuarios registran en la app (Físico → Salud → *Conectar reloj*) y baja su salud diaria
a Supabase para que la app la pinte.

```
app (usuario mete credenciales) ──► tabla wearable_accounts
                                          │  (este servicio la lee con service_role)
                                          ▼
        Garmin Connect / Zepp  ──►  sync.py  ──►  tabla health_metrics  ──►  pestaña Salud
```

## Qué hace
- Cada pasada lee `wearable_accounts` y decide qué cuentas sincronizar:
  - **alta nueva** (`status='pending'`),
  - el usuario pulsó **⟳ Actualizar** en la app (`sync_requested_at` > `last_attempt`),
  - toca la **pasada diaria** (más de `DAILY_HOURS` desde la última sincronización OK),
  - o una cuenta **en error** cuyo último intento fue hace más de `ERROR_BACKOFF_HOURS`.
- Entra en el proveedor (Garmin con `garminconnect`; Amazfit con la API no oficial de Zepp/Huami),
  baja los últimos `SYNC_DAYS` días y hace **upsert** en `health_metrics` (idempotente por día+métrica).
- Actualiza el estado de la cuenta: `connected` + `last_sync`, o `error` con un mensaje legible que la
  app muestra tal cual.

Métricas que emite (slugs que la app entiende): `steps`, `sleep_minutes`, `resting_hr`, `stress`,
`body_battery`, `calories`, `distance_m`, `spo2`, `hr_avg`. Garmin da casi todas; Zepp da
pasos/distancia/calorías/sueño.

## Puesta en marcha (mini PC) — de cero a sincronizando

**1. Traer el código y crear el entorno**
```bash
cd /ruta/a/LifeApp-v2 && git pull
cd connector
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

**2. Crear el `.env`** (no viaja por git: hay que crearlo aquí)
```bash
cp .env.example .env
nano .env      # pegar la service_role en SUPABASE_SERVICE_ROLE
```
La `service_role` sale del panel de Supabase (Project Settings → API → `service_role`). **No se
versiona** y **no va nunca al navegador**.

**3. Comprobar que conecta** (con 0 relojes registrados debe decir `0 cuentas sincronizadas`)
```bash
python sync.py --once
```
Si dice `KeyError: 'SUPABASE_SERVICE_ROLE'` → el `.env` no está o está mal escrito.

**4. Registrar los relojes desde la app** (cada usuario en su móvil): Físico → Salud → *Conectar
reloj* → Garmin o Amazfit (Zepp) → email y contraseña **de esa cuenta del fabricante**.

**5. Primera sincronización de verdad**
```bash
python sync.py --once      # debe decir "N cuentas sincronizadas"
```
En la app, el reloj debe pasar de *Conectando…* a *✓ Conectado* y aparecer los datos. Si sale
*Error*, el mensaje de la app dice qué pasa (contraseña, 2FA o rate limit).

**6. Dejarlo automático**: activar el timer de systemd (abajo) o el cron.

## Ejecución
```bash
python sync.py --once     # una pasada (para cron)
python sync.py            # bucle cada POLL_INTERVAL segundos
```

### systemd (recomendado en Linux)
`/etc/systemd/system/lifeapp-connector.service`:
```ini
[Unit]
Description=LifeApp wearable connector
After=network-online.target

[Service]
Type=oneshot
WorkingDirectory=/ruta/a/LifeApp-v2/connector
ExecStart=/ruta/a/LifeApp-v2/connector/.venv/bin/python sync.py --once
```
`/etc/systemd/system/lifeapp-connector.timer`:
```ini
[Unit]
Description=Ejecuta el conector de LifeApp cada 5 min

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
```
```bash
sudo systemctl enable --now lifeapp-connector.timer
```
(Alternativa cron: `*/5 * * * * cd /ruta/connector && .venv/bin/python sync.py --once >> sync.log 2>&1`)

### Bucle propio (sin systemd)
`python sync.py` a secas se queda en bucle; útil bajo un supervisor simple. Sin Docker
(la RAM del mini PC es limitada): el proceso pesa unos MB y despierta cada `POLL_INTERVAL`.

## Notas y límites
- **Rate limiting de Garmin (429)**: Garmin limita por **IP**, y eso afecta a *todos* los usuarios que
  sincronizan desde este mini PC. Por eso las cuentas en error esperan `ERROR_BACKOFF_HOURS` (6 h por
  defecto) antes de reintentar, y las sesiones se cachean. **No bajes el backoff ni el `POLL_INTERVAL`**
  sin una buena razón. Si ves *"Garmin está limitando las peticiones"*, no es culpa de la contraseña:
  espera y se recupera solo.
- **Garmin con verificación en dos pasos (2FA)**: el login automático falla → la cuenta queda en
  `error` con *"La cuenta tiene verificación en dos pasos; desactívala para sincronizar"*. Hay que
  desactivar el 2FA en Garmin para que sincronice.
- **Zepp/Amazfit es frágil**: API no oficial que Huami puede cambiar sin aviso; solo cuentas con
  **email** (no teléfono ni login social) y servidor internacional. Si falla, la cuenta queda en
  `error` y se reintenta en la siguiente pasada.
- La sesión de Garmin se cachea en `SESSION_DIR` (tokens garth) para no re-loguear cada vez.
- Idempotente: re-sincronizar el mismo día solo actualiza valores; no duplica.
