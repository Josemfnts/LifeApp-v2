"""Capa Supabase del conector — habla con PostgREST usando la service_role.

La service_role salta la RLS: lee TODAS las cuentas (incluida `secret`, que el cliente
no puede leer) y escribe en `health_metrics` en nombre de cada usuario. Nunca se expone
al navegador; vive solo en el `.env` del mini PC.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timezone

import requests

from providers.base import Metric


@dataclass
class Account:
    user_id: str
    provider: str            # 'garmin' | 'zepp'
    email: str
    secret: str
    status: str              # 'pending' | 'connected' | 'error'
    last_sync: str | None       # última sincronización OK (la app la muestra)
    sync_requested_at: str | None
    last_attempt: str | None = None  # último intento, salga bien o mal (para el backoff)


class Store:
    def __init__(self, url: str | None = None, service_role: str | None = None, timeout: int = 30):
        self.url = (url or os.environ["SUPABASE_URL"]).rstrip("/")
        key = service_role or os.environ["SUPABASE_SERVICE_ROLE"]
        self.rest = f"{self.url}/rest/v1"
        self.timeout = timeout
        self._h = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    def list_accounts(self) -> list[Account]:
        r = requests.get(
            f"{self.rest}/wearable_accounts",
            headers=self._h,
            params={"select": "user_id,provider,email,secret,status,last_sync,sync_requested_at,last_attempt"},
            timeout=self.timeout,
        )
        r.raise_for_status()
        return [
            Account(
                user_id=row["user_id"], provider=row["provider"], email=row["email"],
                secret=row["secret"], status=row["status"],
                last_sync=row.get("last_sync"), sync_requested_at=row.get("sync_requested_at"),
                last_attempt=row.get("last_attempt"),
            )
            for row in r.json()
        ]

    def write_metrics(self, user_id: str, source: str, metrics: list[Metric]) -> int:
        """Upsert por (user_id, date, metric). Idempotente: re-sincronizar un día actualiza valores."""
        if not metrics:
            return 0
        rows = [
            {"user_id": user_id, "date": m.date, "metric": m.metric,
             "value": m.value, "source": source, "updated_at": _now_iso()}
            for m in metrics
        ]
        r = requests.post(
            f"{self.rest}/health_metrics",
            headers={**self._h, "Prefer": "resolution=merge-duplicates,return=minimal"},
            params={"on_conflict": "user_id,date,metric"},
            json=rows,
            timeout=self.timeout,
        )
        r.raise_for_status()
        return len(rows)

    def mark(self, acc: Account, status: str, error: str | None = None,
             set_last_sync: bool = False) -> None:
        # `last_attempt` se escribe SIEMPRE (salga bien o mal): es lo que permite espaciar los
        # reintentos de las cuentas en error. `last_sync` solo cuando la sincronización fue OK.
        patch: dict[str, object] = {"status": status, "error": error, "last_attempt": _now_iso()}
        if set_last_sync:
            patch["last_sync"] = _now_iso()
        r = requests.patch(
            f"{self.rest}/wearable_accounts",
            headers={**self._h, "Prefer": "return=minimal"},
            params={"user_id": f"eq.{acc.user_id}", "provider": f"eq.{acc.provider}"},
            json=patch,
            timeout=self.timeout,
        )
        r.raise_for_status()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
