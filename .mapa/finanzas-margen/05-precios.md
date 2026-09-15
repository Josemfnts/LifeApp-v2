# ¿De dónde salen los precios de las inversiones?

Estado: resuelto
Tipo: investigar

Margen valora inversiones en vivo. Opciones del teardown: Twelve Data (clave), Alpha Vantage
(clave, 5/min), EODHD (pago), CoinGecko (cripto, gratis), BCE (FX).

## Respuesta
- **Cripto**: CoinGecko `simple/price` (vs_currencies=eur) llamado desde el navegador, sin clave,
  en lote, como mucho cada 60 s con la pestaña Patrimonio visible. Precio en EUR nativo → sin FX.
- **Acciones / ETF / fondos**: precio **manual** con fecha (`priceAt`) y marca de frescura
  ("precio del 12 sep"). Nunca se muestra 0 si falta precio: se usa el coste.
- Caché `finances_price_cache` **local-only** (no se sube a la nube: son datos públicos y cambian
  cada minuto; subirlo generaría escrituras de espejo constantes).

Por qué: sin claves ni coste, y cubre ya el caso más volátil. Proveedor de bolsa en vivo queda en
Niebla: requiere que Josema cree una clave (Twelve Data) y decidir si la llamada va por el
conector del mini PC para no exponerla en el cliente.

## Investigación 2026-09-15 (tarde): APIs para bolsa, ETF y fondos

Probado con curl desde el mini PC (IP doméstica) con `Origin: https://life-app-v2-ten.vercel.app`:

| Fuente | Resultado real | ¿Navegador (CORS)? | Clave | Cobertura útil |
|---|---|---|---|---|
| Yahoo v8 `chart/{símbolo}` | 200: VWCE.DE (XETRA), SAN.MC (Madrid), fondo 0P00000RQC.F = Vanguard Global Stock (62,06 €) | NO (sin `Access-Control-Allow-Origin`; preflight 429) | no | acciones, ETF y fondos UE/US, en EUR nativo |
| Yahoo `v1/finance/search?q={ISIN}` | 200: IE00B4L5Y983 → IWDA.L; IE00B03HCZ61 → 0P00000RQC.F | NO | no | ISIN → símbolo |
| FT tearsheet `markets.ft.com/data/funds/tearsheet/summary?s={ISIN}:EUR` | 200 HTML: 62,13 € «as of Sep 14 2026» | NO (HTML) | no | fondos por ISIN (valor liquidativo del día anterior) |
| Twelve Data | 200 con `apikey=demo` | SÍ | sí | gratis: 800/día, 8/min, solo EE. UU. + 3 bolsas; UE en Grow (79 $/mes) |
| Finnhub | 401 sin clave | SÍ | sí | gratis 60/min pero solo EE. UU. |
| Financial Modeling Prep | — | — | sí | gratis 250/día, solo EE. UU. |
| Alpha Vantage | — | — | sí | gratis 25/día, 5/min |
| EODHD | — | — | sí | gratis 20/día |
| Frankfurter (BCE) `api.frankfurter.dev/v1/latest` | 200 | SÍ | no | tipos de cambio USD/GBP→EUR |

Conclusión: ninguna fuente gratis cubre ETF UCITS y fondos españoles desde el navegador. Lo que
funciona (Yahoo + FT) exige un intermediario en servidor. Yahoo es no oficial: puede cambiar o
limitar sin aviso, y bloquea más a IPs de centros de datos (Vercel/AWS) que a la doméstica.

Recomendación (sin implementar): función de Vercel `api/prices` en el mismo repo (mismo origen, sin
clave, caché CDN `s-maxage`) → Yahoo `chart` por símbolo, búsqueda por ISIN al dar de alta, FT como
respaldo para fondos. Antes de construir la UI, comprobar que Yahoo no da 429 desde Vercel; si lo da,
plan B = el conector del mini PC (IP doméstica, ya probado) escribe una clave de precios cada 30 min.
El precio manual se mantiene siempre como último recurso.
