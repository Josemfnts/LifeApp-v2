"""Adaptador Garmin — usa la librería no oficial `garminconnect` (sobre `garth`).

Entra con el email/contraseña de la cuenta de Garmin Connect del usuario y baja el
resumen diario + sueño de los últimos `days` días. Cachea la sesión (tokens garth) en
`session_dir` para no re-loguear en cada pasada (a Garmin no le gustan los logins en ráfaga).
"""
from __future__ import annotations

import os
import re
from datetime import date, timedelta

from providers.base import AuthError, Metric, ProviderError


def _safe(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_.-]", "_", name)


def _num(d: dict, *keys):
    """Primer valor numérico no nulo entre varias claves candidatas del resumen."""
    for k in keys:
        v = d.get(k)
        if isinstance(v, (int, float)):
            return v
    return None


def _classify(e: Exception) -> Exception:
    """Traduce el fallo de login de Garmin al error correcto para el conector.

    El orden importa. Comprobado en real: cuando Garmin limita la IP responde **429** y
    `garminconnect` acaba lanzando un error genérico; si lo tratásemos como credenciales malas,
    le diríamos al usuario que su contraseña está mal cuando no lo está (y, al ser AuthError,
    dejaríamos de reintentar). El rate limit es TRANSITORIO → ProviderError.
    """
    msg = str(e)
    low = msg.lower()
    if "429" in low or "rate limit" in low or "too many request" in low:
        return ProviderError("Garmin está limitando las peticiones; se reintentará más tarde")
    if any(t in low for t in ("mfa", "multi-factor", "multifactor", "two-factor", "two factor",
                              "verification code", "código de verificación")):
        return AuthError("La cuenta tiene verificación en dos pasos; desactívala para sincronizar")
    # Solo señales inequívocas de credenciales; "invalid" a secas es demasiado genérico
    # (p. ej. "invalid response") y acabaría culpando a la contraseña de un fallo de red.
    if any(t in low for t in ("401", "unauthorized", "invalid credential", "bad credential",
                              "incorrect password", "authentication failed", "invalid password")):
        return AuthError("Credenciales de Garmin incorrectas")
    return ProviderError(f"No se pudo entrar en Garmin: {msg[:180]}")


def fetch(email: str, secret: str, session_dir: str, days: int) -> list[Metric]:
    try:
        from garminconnect import Garmin
    except ImportError as e:  # pragma: no cover
        raise ProviderError("Falta la librería garminconnect (pip install)") from e

    tokenstore = os.path.join(session_dir, "garmin_" + _safe(email))
    client = _login(Garmin, email, secret, tokenstore)

    out: list[Metric] = []
    today = date.today()
    for i in range(days):
        cdate = (today - timedelta(days=i)).isoformat()
        out.extend(_day(client, cdate))
    return out


def _login(Garmin, email: str, secret: str, tokenstore: str):
    # 1) Intentar reanudar la sesión cacheada.
    try:
        client = Garmin()
        client.login(tokenstore)
        return client
    except Exception:  # noqa: BLE001 — sin sesión válida: login completo abajo
        pass
    # 2) Login con credenciales; si va, guardar los tokens.
    try:
        client = Garmin(email=email, password=secret)
        client.login()
    except Exception as e:  # noqa: BLE001
        raise _classify(e) from e
    try:
        client.garth.dump(tokenstore)
    except Exception:  # noqa: BLE001 — cachear es best-effort
        pass
    return client


def _day(client, cdate: str) -> list[Metric]:
    metrics: list[Metric] = []
    try:
        s = client.get_user_summary(cdate) or {}
    except Exception as e:  # noqa: BLE001
        raise ProviderError(f"Garmin no devolvió el resumen de {cdate}: {e}") from e

    steps = _num(s, "totalSteps")
    if steps is not None:
        metrics.append(Metric(cdate, "steps", steps))
    dist = _num(s, "totalDistanceMeters", "dailyStepGoalDistanceMeters")
    if dist is not None:
        metrics.append(Metric(cdate, "distance_m", dist))
    cal = _num(s, "totalKilocalories", "activeKilocalories")
    if cal is not None:
        metrics.append(Metric(cdate, "calories", cal))
    rhr = _num(s, "restingHeartRate")
    if rhr is not None:
        metrics.append(Metric(cdate, "resting_hr", rhr))
    stress = _num(s, "averageStressLevel")
    if stress is not None and stress >= 0:  # Garmin manda -1 si no hay dato
        metrics.append(Metric(cdate, "stress", stress))
    bb = _num(s, "bodyBatteryMostRecentValue", "bodyBatteryHighestValue")
    if bb is not None and bb >= 0:
        metrics.append(Metric(cdate, "body_battery", bb))
    spo2 = _num(s, "averageSpo2", "averageMonitoringSpo2")
    if spo2 is not None:
        metrics.append(Metric(cdate, "spo2", spo2))

    # Sueño en un endpoint aparte.
    try:
        sleep = client.get_sleep_data(cdate) or {}
        dto = sleep.get("dailySleepDTO") or {}
        secs = dto.get("sleepTimeSeconds")
        if isinstance(secs, (int, float)) and secs > 0:
            metrics.append(Metric(cdate, "sleep_minutes", round(secs / 60)))
    except Exception:  # noqa: BLE001 — el sueño no es crítico; si falla, seguimos
        pass

    return metrics
