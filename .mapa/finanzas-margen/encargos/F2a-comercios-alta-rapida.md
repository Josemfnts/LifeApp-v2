# Encargo F2a — Comercios, alta rápida y editar movimiento

Calidad: final. Requiere F0 y F1 hechos.

LEE PRIMERO: AGENTS.md (§Arquitectura de datos), .mapa/finanzas-margen/mapa.md, plan.md,
02-compatibilidad-compai.md, 09-ui.md, y el §5.2 de
`Pendiente implementar/FInanzas pro/margen-teardown-y-plan-life-app.md`.

## A — Motor puro `src/lib/finance/merchants.ts` (+ `merchants.test.ts`)
- `export interface Merchant { id: string; name: string; domain?: string; category?: string; patterns: string[] }`
- `normalizeConcept(raw: string): string` → mayúsculas, sin tildes (NFD + quitar diacríticos),
  quita fechas (`\d{1,2}[/.-]\d{1,2}([/.-]\d{2,4})?`), números de tarjeta (`\*{0,4}\d{4}` sueltos,
  `X{4}`), las palabras sueltas COMPRA, TARJ, TARJETA, RECIBO, PAGO, CARGO, ADEUDO, TRANSACCION,
  CONTACTLESS, EN, DE, CON, NUM, y sufijos societarios S.A., S.L., SA, SL, SAU, S.L.U.; colapsa
  espacios y recorta. Ej.: `COMPRA TARJ. 4589 MERCADONA S.A. 12/03 MADRID` → `MERCADONA MADRID`.
- `SEED_MERCHANTS: Merchant[]` (en código, NO en storage): ~60 comercios habituales en España con
  `id` estable (`seed:mercadona`), `domain`, `category` de las existentes en CAT_META y `patterns`
  normalizados. Mínimo: Mercadona, Carrefour, Lidl, Aldi, Dia, Eroski, Alcampo, Consum, Hipercor,
  El Corte Inglés, Amazon, AliExpress, Zara, Primark, H&M, Decathlon, IKEA, Leroy Merlin,
  MediaMarkt, PcComponentes, Netflix, Spotify, HBO Max, Disney+, Prime Video, Apple, Google,
  YouTube, Movistar, Vodafone, Orange, Digi, MásMóvil, Iberdrola, Endesa, Naturgy, Holaluz, Repsol,
  Cepsa, BP, Galp, Renfe, Uber, Cabify, Bolt, FREE NOW, Glovo, Just Eat, Uber Eats, McDonald's,
  Burger King, Telepizza, Starbucks, Ryanair, Vueling, Iberia, Booking, Airbnb, Basic-Fit, Mapfre,
  Mutua Madrileña, Farmacia (patrón FARMACIA → Salud), Bizum (patrón BIZUM, sin categoría).
- `matchMerchant(concept: string, merchants: Merchant[]): Merchant | null` → normaliza y busca el
  patrón contenido más LARGO (empate: el primero de la lista). Los merchants de usuario van antes
  que los seed al llamar.
- `merchantLogoUrl(domain?: string): string | null` → `https://www.google.com/s2/favicons?domain=${domain}&sz=64`.
- `suggestCategory(concept, type, merchants): string` → categoría del comercio si la hay y encaja
  con el tipo; si no, `'Otros ingresos'`/`'Otros gastos'`.
- `learnMerchant(userMerchants, { name, concept, category, domain? }): Merchant[]` → si ya hay uno
  de usuario con ese nombre, actualiza categoría y añade el patrón normalizado si no está; si no,
  lo crea (`id: 'user:' + randomUUID`). Si coincide con un seed por nombre, crea override de
  usuario con el MISMO id del seed (y matchMerchant da prioridad al de usuario).
- Tests: normalizeConcept con 6 literales bancarios reales distintos, match por patrón más largo,
  prioridad usuario>seed, suggestCategory ingreso vs gasto, learnMerchant crea/actualiza/override.

## B — Store
- Clave `finances_merchants` (merchants de usuario) en storageKeys.ts + estado `merchants` +
  recargador onRemoteChange.
- `addTx` rellena `merchantId` si el concepto hace match (usuario + seed).
- Acción `updateTxFull(idx, partial)`: como updateTx, pero si la tx tiene `linkId` (traspaso)
  aplica importe/fecha/concepto a TODAS las patas (sin cambiar type/cuenta de cada pata) y
  recalcula saldos. Si cambia la categoría y hay merchantId o nombre de comercio → `learnMerchant`.

## C — UI
1. `QuickAddSheet.tsx` (hoja `Modal`): orden de campos = **importe** (input grande, `inputMode="decimal"`,
   acepta coma decimal, autofocus) → **concepto** con autocompletado (sugerencias: merchants de
   usuario + seed + los 8 conceptos recientes distintos; cada sugerencia con logo favicon o icono
   de categoría) → **categoría** (chips horizontales de la lista del tipo, preseleccionada por
   `suggestCategory` al elegir/teclear) → cuenta (por defecto la del último movimiento con
   cuenta) y fecha (hoy, plegado bajo "Más opciones") → Guardar. Toggle Gasto/Ingreso arriba
   (por defecto Gasto). Guardar con Enter.
2. MovesTab: el formulario siempre abierto DESAPARECE. Arriba una fila compacta: contador
   "N movimientos" · botón 🔍 (despliega el buscador) · botón ⚙ (hoja de filtro por categoría y
   tipo) · botón "+ Añadir" (abre QuickAddSheet). El CSV export se queda en la cabecera del shell.
3. `EditTxSheet.tsx`: tocar una fila de TxRow abre la hoja con todos los campos (importe, tipo,
   concepto, categoría, cuenta, fecha, nota) → `updateTxFull`. Botón Borrar con `ConfirmDialog`
   (si es traspaso: "Se borrarán las dos patas"). El botón ✕ suelto de TxRow desaparece.
4. `MerchantAvatar.tsx`: en TxRow, si la tx tiene merchant con domain, muestra el favicon (38px,
   radio 11, fondo `var(--color-s2)`) con `onError` → icono de categoría actual.

## Criterios de aceptación
- `npm test` (nº), `npm run build`, `npm run lint` sin errores.
- `finances_merchants` en storageKeys.ts y con recargador.
- Sin `confirm(`/`prompt(` nativos; colores solo `var(--color-*)`.

## Cierre
Commits por tarea lógica con rutas explícitas (nunca `git add -A`/`.`), push a origin main,
marca `[x]` en la línea de F2 de plan.md SOLO si F2b también está hecho (si no, deja una nota
"F2a hecho"). Resumen: ficheros, nº tests, pendientes.
