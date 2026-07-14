"""Adaptador Amazfit/Zepp — API no oficial de Huami (la que usan Gadgetbridge / huami-token).

Zepp NO tiene API pública: se hace login con la cuenta Zepp (email), se obtiene un
`app_token` y se piden los resúmenes diarios de banda (`band_data.json`), que traen pasos,
distancia, calorías y sueño. Es FRÁGIL (endpoints no oficiales que Huami puede cambiar):
ante cualquier fallo lanzamos ProviderError y la cuenta queda en 'error' para reintentar.

Limitaciones conocidas:
- Solo cuentas con **email** (no número de teléfono ni login con Google/terceros).
- Servidor internacional (`*.huami.com`). Cuentas de China (`huami.com` CN) no cubiertas.
- FC/estrés no vienen en el resumen de banda → solo pasos/distancia/calorías/sueño.
"""
from __future__ import annotations

import json
from datetime import date, timedelta
from urllib.parse import parse_qs, quote, urlparse

import requests

from providers.base import AuthError, Metric, ProviderError

_TIMEOUT = 30
_UA = "MiFit/6.3.3 (android 12)"


def fetch(email: str, secret: str, session_dir: str, days: int) -> list[Metric]:  # noqa: ARG001 (session_dir: interfaz común; Zepp no cachea sesión)
    app_token, user_id = _login(email, secret)
    return _band_data(app_token, user_id, days)


def _login(email: str, password: str) -> tuple[str, str]:
    # 1) Access token (redirect 303 con ?access=...&country=... en Location).
    try:
        r = requests.post(
            f"https://api-user.huami.com/registrations/{quote(email, safe='')}/tokens",
            data={
                "state": "REDIRECTION",
                "client_id": "HuaMi",
                "password": password,
                "redirect_uri": "https://s3-us-west-2.amazonaws.com/hm-registration/successsignin.html",
                "token": "access",
            },
            headers={"User-Agent": _UA},
            allow_redirects=False,
            timeout=_TIMEOUT,
        )
    except requests.RequestException as e:
        raise ProviderError(f"No se pudo contactar con Zepp: {e}") from e

    location = r.headers.get("Location", "")
    qs = parse_qs(urlparse(location).query)
    access = qs.get("access", [None])[0]
    country = qs.get("country", ["US"])[0]
    if not access:
        # Sin código de acceso = credenciales rechazadas.
        raise AuthError("Credenciales de Zepp incorrectas (o la cuenta no usa email)")

    # 2) Login → app_token + user_id.
    try:
        r = requests.post(
            "https://account.huami.com/v2/client/login",
            data={
                "app_name": "com.xiaomi.hm.health",
                "app_version": "6.3.3",
                "code": access,
                "country_code": country,
                "device_id": "02:00:00:00:00:00",
                "device_model": "android_phone",
                "grant_type": "access_token",
                "third_name": "huami",
                "source": "com.xiaomi.hm.health",
            },
            headers={"User-Agent": _UA},
            timeout=_TIMEOUT,
        )
        info = (r.json() or {}).get("token_info") or {}
    except (requests.RequestException, ValueError) as e:
        raise ProviderError(f"Login de Zepp falló: {e}") from e

    app_token = info.get("app_token")
    user_id = info.get("user_id")
    if not app_token or not user_id:
        raise ProviderError("Zepp no devolvió sesión válida (API cambiada o cuenta no soportada)")
    return app_token, str(user_id)


def _band_data(app_token: str, user_id: str, days: int) -> list[Metric]:
    today = date.today()
    from_date = (today - timedelta(days=days - 1)).isoformat()
    to_date = today.isoformat()
    try:
        r = requests.get(
            "https://api-mifit.huami.com/v1/data/band_data.json",
            headers={"apptoken": app_token, "User-Agent": _UA},
            params={
                "query_type": "summary",
                "device_type": "android_phone",
                "userid": user_id,
                "from_date": from_date,
                "to_date": to_date,
            },
            timeout=_TIMEOUT,
        )
        payload = r.json() or {}
    except (requests.RequestException, ValueError) as e:
        raise ProviderError(f"Zepp no devolvió los datos de banda: {e}") from e

    out: list[Metric] = []
    for entry in payload.get("data", []) or []:
        cdate = entry.get("date_time")
        summary_raw = entry.get("summary")
        if not cdate or not summary_raw:
            continue
        try:
            summary = json.loads(summary_raw)
        except (ValueError, TypeError):
            continue
        out.extend(_parse_summary(cdate, summary))
    return out


def _parse_summary(cdate: str, summary: dict) -> list[Metric]:
    metrics: list[Metric] = []
    stp = summary.get("stp") or {}
    if isinstance(stp.get("ttl"), (int, float)):
        metrics.append(Metric(cdate, "steps", stp["ttl"]))
    if isinstance(stp.get("dis"), (int, float)):
        metrics.append(Metric(cdate, "distance_m", stp["dis"]))
    if isinstance(stp.get("cal"), (int, float)):
        metrics.append(Metric(cdate, "calories", stp["cal"]))

    slp = summary.get("slp") or {}
    deep = slp.get("dp") if isinstance(slp.get("dp"), (int, float)) else 0
    light = slp.get("lt") if isinstance(slp.get("lt"), (int, float)) else 0
    rem = slp.get("rem") if isinstance(slp.get("rem"), (int, float)) else 0
    total = deep + light + rem
    if total <= 0 and isinstance(slp.get("st"), (int, float)) and isinstance(slp.get("ed"), (int, float)):
        # Fallback: duración = fin - inicio (epochs en segundos).
        total = max(0, round((slp["ed"] - slp["st"]) / 60))
    if total > 0:
        metrics.append(Metric(cdate, "sleep_minutes", total))
    return metrics
