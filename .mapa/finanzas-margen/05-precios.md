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
