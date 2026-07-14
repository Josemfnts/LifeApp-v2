"""Interfaz común de los adaptadores de reloj.

Un adaptador recibe las credenciales de una cuenta y devuelve una lista de `Metric`
(día + slug canónico + valor). Los slugs deben coincidir con los que pinta la app
(ver METRICS en src/lib/health.ts):

    steps · sleep_minutes · resting_hr · stress · body_battery
    calories · distance_m · spo2 · hr_avg

Errores:
- `AuthError`: credenciales incorrectas o 2FA → la cuenta pasa a status='error' con
  el mensaje, y NO se reintenta hasta que el usuario reescriba las credenciales.
- `ProviderError`: fallo transitorio (red, API caída, parseo) → status='error' pero
  se reintenta en la siguiente pasada; las credenciales se conservan.
"""
from __future__ import annotations

from dataclasses import dataclass

# Slugs canónicos que la app sabe pintar. Un adaptador puede emitir un subconjunto.
CANONICAL_METRICS = {
    "steps", "sleep_minutes", "resting_hr", "stress",
    "body_battery", "calories", "distance_m", "spo2", "hr_avg",
}


@dataclass(frozen=True)
class Metric:
    date: str      # 'YYYY-MM-DD' (día natural del usuario, no UTC crudo)
    metric: str    # slug canónico
    value: float


class AuthError(Exception):
    """Credenciales incorrectas / 2FA — no reintentar hasta re-alta."""


class ProviderError(Exception):
    """Fallo transitorio — reintentar en la siguiente pasada."""


def clean_metrics(raw: list[Metric]) -> list[Metric]:
    """Descarta métricas desconocidas, None/NaN o negativas, y deduplica por (día,métrica)."""
    seen: dict[tuple[str, str], Metric] = {}
    for m in raw:
        if m.metric not in CANONICAL_METRICS:
            continue
        v = m.value
        if v is None:
            continue
        try:
            v = float(v)
        except (TypeError, ValueError):
            continue
        if v != v or v < 0:  # NaN o negativo
            continue
        seen[(m.date, m.metric)] = Metric(m.date, m.metric, round(v, 3))
    return list(seen.values())
