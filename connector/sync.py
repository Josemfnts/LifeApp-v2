"""Conector de relojes de LifeApp — servicio del mini PC.

Lee las cuentas registradas en la app (`wearable_accounts`), entra en Garmin/Zepp con
las credenciales de cada usuario, baja los últimos días de salud y los escribe en
`health_metrics`. NO forma parte de la app web: corre aparte (systemd timer o cron).

Uso:
    python sync.py --once      # una pasada y salir (ideal para cron)
    python sync.py             # bucle cada POLL_INTERVAL segundos

Config por entorno (.env):
    SUPABASE_URL, SUPABASE_SERVICE_ROLE   (obligatorias)
    POLL_INTERVAL   (s, def. 300)   SYNC_DAYS (def. 7)   DAILY_HOURS (def. 20)
    SESSION_DIR     (def. ./.sessions)
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
import time
from datetime import datetime, timezone

from store import Account, Store
from providers.base import AuthError, ProviderError, clean_metrics
from providers import garmin, zepp

log = logging.getLogger("connector")

# Horas de espera antes de reintentar una cuenta que falló (override: env ERROR_BACKOFF_HOURS).
# Sin esto, una cuenta en error (p. ej. contraseña mal) se reintentaría en cada pasada y el
# proveedor banea la IP del mini PC (Garmin responde 429 IP rate limited). El botón "Actualizar"
# del usuario se salta este backoff.
ERROR_BACKOFF_HOURS = 6.0

# Registro de adaptadores. `run_once` acepta otro dict (tests con proveedor fake).
PROVIDERS = {
    "garmin": garmin.fetch,
    "zepp": zepp.fetch,
}


def _parse_iso(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None


def should_sync(acc: Account, now: datetime, daily_hours: float,
                error_backoff_hours: float = ERROR_BACKOFF_HOURS) -> bool:
    """¿Toca sincronizar esta cuenta en esta pasada?

    Orden: alta nueva → botón "Actualizar" → backoff si está en error → pasada diaria.

    El backoff es importante: una cuenta que falla NO rellena `last_sync`, así que sin él se
    reintentaría en cada pasada (~5 min) y el proveedor acaba baneando la IP del mini PC
    (verificado: Garmin devuelve 429 IP rate limited). Por eso usamos `last_attempt`, que se
    escribe pase lo que pase.
    """
    if acc.status == "pending":          # alta nueva o credenciales recién cambiadas
        return True

    attempt = _parse_iso(acc.last_attempt)
    req = _parse_iso(acc.sync_requested_at)
    # Botón "Actualizar": lo pedimos si la petición es posterior al último intento.
    if req and (attempt is None or req > attempt):
        return True

    if acc.status == "error":
        # Reintento espaciado; si nunca se intentó (raro), adelante.
        if attempt is None:
            return True
        return (now - attempt).total_seconds() >= error_backoff_hours * 3600

    last = _parse_iso(acc.last_sync)
    if last is None:
        # Sin sincronización previa: intentar, pero respetando el hueco entre intentos.
        return attempt is None or (now - attempt).total_seconds() >= error_backoff_hours * 3600
    return (now - last).total_seconds() >= daily_hours * 3600


def sync_account(acc: Account, store: Store, providers: dict, session_dir: str, days: int) -> None:
    fetch = providers.get(acc.provider)
    if fetch is None:
        log.warning("proveedor desconocido: %s (%s)", acc.provider, acc.email)
        store.mark(acc, "error", error=f"Proveedor no soportado: {acc.provider}")
        return
    try:
        metrics = clean_metrics(fetch(acc.email, acc.secret, session_dir, days))
    except AuthError as e:
        log.info("auth fallo %s/%s: %s", acc.provider, acc.email, e)
        store.mark(acc, "error", error=str(e) or "Credenciales incorrectas")
        return
    except ProviderError as e:
        log.warning("fallo transitorio %s/%s: %s", acc.provider, acc.email, e)
        store.mark(acc, "error", error=str(e) or "No se pudo sincronizar, se reintentará")
        return
    except Exception as e:  # noqa: BLE001 — cualquier fallo inesperado no debe tumbar el loop
        log.exception("error inesperado %s/%s", acc.provider, acc.email)
        store.mark(acc, "error", error="Error inesperado al sincronizar")
        return

    n = store.write_metrics(acc.user_id, acc.provider, metrics)
    store.mark(acc, "connected", error=None, set_last_sync=True)
    log.info("ok %s/%s: %d métricas", acc.provider, acc.email, n)


def run_once(store: Store, providers: dict = PROVIDERS, session_dir: str = ".sessions",
             days: int = 7, daily_hours: float = 20.0,
             error_backoff_hours: float = ERROR_BACKOFF_HOURS) -> int:
    os.makedirs(session_dir, exist_ok=True)
    now = datetime.now(timezone.utc)
    try:
        accounts = store.list_accounts()
    except Exception:  # noqa: BLE001
        log.exception("no se pudieron leer las cuentas")
        return 0
    done = 0
    for acc in accounts:
        if not should_sync(acc, now, daily_hours, error_backoff_hours):
            continue
        sync_account(acc, store, providers, session_dir, days)
        done += 1
    return done


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        stream=sys.stdout,
    )
    _load_dotenv()
    parser = argparse.ArgumentParser(description="Conector de relojes de LifeApp")
    parser.add_argument("--once", action="store_true", help="Una pasada y salir")
    args = parser.parse_args()

    interval = int(os.environ.get("POLL_INTERVAL", "300"))
    days = int(os.environ.get("SYNC_DAYS", "7"))
    daily_hours = float(os.environ.get("DAILY_HOURS", "20"))
    backoff = float(os.environ.get("ERROR_BACKOFF_HOURS", ERROR_BACKOFF_HOURS))
    session_dir = os.environ.get("SESSION_DIR", os.path.join(os.path.dirname(__file__), ".sessions"))
    store = Store()

    if args.once:
        n = run_once(store, session_dir=session_dir, days=days, daily_hours=daily_hours,
                     error_backoff_hours=backoff)
        log.info("pasada única: %d cuentas sincronizadas", n)
        return

    log.info("conector arrancado (cada %ds)", interval)
    while True:
        try:
            run_once(store, session_dir=session_dir, days=days, daily_hours=daily_hours,
                     error_backoff_hours=backoff)
        except Exception:  # noqa: BLE001 — el loop nunca muere por un fallo puntual
            log.exception("fallo en la pasada")
        time.sleep(interval)


def _load_dotenv() -> None:
    """Carga connector/.env sin depender de python-dotenv (KEY=VALUE, ignora # y vacías)."""
    path = os.path.join(os.path.dirname(__file__), ".env")
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


if __name__ == "__main__":
    main()
