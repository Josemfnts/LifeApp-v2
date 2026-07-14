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
  - el usuario pulsó **⟳ Actualizar** en la app (`sync_requested_at` > `last_sync`),
  - o toca la **pasada diaria** (más de `DAILY_HOURS` desde la última).
- Entra en el proveedor (Garmin con `garminconnect`; Amazfit con la API no oficial de Zepp/Huami),
  baja los últimos `SYNC_DAYS` días y hace **upsert** en `health_metrics` (idempotente por día+métrica).
- Actualiza el estado de la cuenta: `connected` + `last_sync`, o `error` con un mensaje legible que la
  app muestra tal cual.

Métricas que emite (slugs que la app entiende): `steps`, `sleep_minutes`, `resting_hr`, `stress`,
`body_battery`, `calories`, `distance_m`, `spo2`, `hr_avg`. Garmin da casi todas; Zepp da
pasos/distancia/calorías/sueño.

## Instalación (mini PC)
```bash
cd connector
python -m venv .venv && source .venv/bin/activate   # o .venv\Scripts\activate en Windows
pip install -r requirements.txt
cp .env.example .env      # y rellena SUPABASE_SERVICE_ROLE
```
La `service_role` sale del panel de Supabase (Project Settings → API) o de la Management API. **No
se versiona** y **no va nunca al navegador**.

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
- **Garmin con verificación en dos pasos (2FA)**: el login automático falla → la cuenta queda en
  `error` con *"La cuenta tiene verificación en dos pasos; desactívala para sincronizar"*. Hay que
  desactivar el 2FA en Garmin para que sincronice.
- **Zepp/Amazfit es frágil**: API no oficial que Huami puede cambiar sin aviso; solo cuentas con
  **email** (no teléfono ni login social) y servidor internacional. Si falla, la cuenta queda en
  `error` y se reintenta en la siguiente pasada.
- La sesión de Garmin se cachea en `SESSION_DIR` (tokens garth) para no re-loguear cada vez.
- Idempotente: re-sincronizar el mismo día solo actualiza valores; no duplica.
