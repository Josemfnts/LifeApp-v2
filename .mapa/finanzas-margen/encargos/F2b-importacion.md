# Encargo F2b — Importación de extractos N43 / CSV con revisión, dedupe y deshacer

Calidad: final. Requiere F0, F1 y F2a hechos.

LEE PRIMERO: AGENTS.md, .mapa/finanzas-margen/mapa.md, plan.md, 06-importacion.md, y §5.3 + §9.10
del teardown (`Pendiente implementar/FInanzas pro/margen-teardown-y-plan-life-app.md`).

## A — Motor puro `src/lib/finance/import/` (todo con tests)

### DTO común
`export interface ImportRow { date: string; valueDate?: string; amount: number /* euros, con signo: + abono, − cargo */; concept: string; balanceAfter?: number }`
`export interface ParseResult { format: 'n43' | 'csv'; rows: ImportRow[]; errors: string[]; check?: { ok: boolean; message: string }; finalBalance?: number; accountId?: string }`

### `n43.ts` — Norma 43 (AEB/CSB 43), líneas de 80 posiciones (tolera líneas más cortas rellenando con espacios y CRLF)
Posiciones 1-indexadas, importes de 14 dígitos con 2 decimales implícitos, fechas AAMMDD (años 00-79 → 20xx, 80-99 → 19xx):
- **11** cabecera de cuenta: 3-6 banco, 7-10 oficina, 11-20 nº cuenta, 21-26 fecha inicial,
  27-32 fecha final, 33 signo saldo inicial (1 = deudor/negativo, 2 = acreedor/positivo),
  34-47 saldo inicial, 48-50 divisa (978 = EUR), 51 modalidad, 52-77 nombre.
- **22** movimiento: 7-10 oficina origen, 11-16 fecha operación, 17-22 fecha valor, 23-24 concepto
  común, 25-27 concepto propio, 28 debe/haber (1 = cargo → importe negativo, 2 = abono → positivo),
  29-42 importe, 43-52 documento, 53-64 referencia 1, 65-80 referencia 2.
- **23** concepto complementario (0..5 por movimiento): 3-4 código dato, 5-42 concepto, 43-80 concepto.
  El `concept` del ImportRow = concatenación recortada de los 23 que siguen al 22 (si no hay 23,
  referencia 2 o referencia 1).
- **33** fin de cuenta: 21-25 nº apuntes debe, 26-39 total debe, 40-44 nº apuntes haber,
  45-58 total haber, 59 signo saldo final (1 deudor, 2 acreedor), 60-73 saldo final, 74-76 divisa.
- **88** fin de fichero.
`parseN43(text: string): ParseResult` → `check.ok` = (Σ cargos == total debe) && (Σ abonos == total
haber) && (saldo inicial + haber − debe == saldo final), todo en céntimos; `check.message` legible
en español con las cifras si falla. Varias cuentas en un fichero: devuelve todas las filas y avisa
en `errors` ("El fichero trae N cuentas; se importan todas en la cuenta elegida").
`isN43(text)`: primera línea no vacía empieza por `11` y la mayoría de líneas tiene 80±2 caracteres
y empiezan por 11/22/23/33/88.
Tests: construye en el test un fichero sintético con helpers de padding (1 cabecera, 3 movimientos
—uno con dos registros 23—, 33 que cuadra, 88) y otro con total que NO cuadra; año 99 vs 26; importes
con céntimos.

### `csv.ts`
- `splitCSV(text): string[][]` con comillas dobles, comillas escapadas `""`, saltos de línea dentro
  de comillas, CRLF, BOM.
- `detectDelimiter(sample)`: `;` `,` `\t` (el que dé nº de columnas más constante > 1).
- `parseAmountES(s)`: "1.234,56" → 1234.56; "-12,30" → -12.3; "12.30" → 12.3; "1,234.56" → 1234.56;
  "(12,00)" → -12; "12,00 €" / "EUR" → 12; vacío → NaN.
- `parseDateFlexible(s)`: dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy, dd/mm/yy, yyyy-mm-dd, yyyy-mm-dd HH:MM:SS
  → YYYY-MM-DD o null.
- `export interface CsvMapping { headerRow: number; date: number; concept: number; amount?: number; debit?: number; credit?: number; balance?: number }`
- `guessMapping(rows): CsvMapping | null` → busca la fila de cabecera en las 15 primeras (la que
  contenga un nombre de fecha y uno de importe/cargo); sinónimos sin tildes y en minúsculas:
  fecha: fecha, f. valor, fecha valor, fecha operacion, date, completed date, started date;
  concepto: concepto, descripcion, description, movimiento, detalle, beneficiario;
  importe: importe, amount, cantidad, importe (eur); cargo: cargo, debe, gastos; abono: abono,
  haber, ingresos; saldo: saldo, balance. Prioriza "completed date" sobre "started date".
- `applyMapping(rows, m): { rows: ImportRow[]; errors: string[] }` → descarta filas vacías o con fecha
  inválida (cuenta en errors cuántas), importe = amount o (credit − debit).
- Tests: CSV estilo BBVA (`;`, coma decimal, cabecera en fila 4), Revolut (`,`, "Completed Date",
  punto decimal), cargo/abono separados, comillas con `;` dentro.

### `dedupe.ts`
- `hashString(s)`: FNV-1a síncrono → string base36.
- `dedupeKey(cuenta, date, amountEuros, concept, ordinal)` = hash de
  `${cuenta}|${date}|${toCents(amount)}|${normalizeConcept(concept).slice(0,40)}|${ordinal}`.
- `markDuplicates(incoming: ImportRow[], existing: Tx[], cuenta: string): { row: ImportRow; key: string; duplicate: boolean }[]`
  → ordinal = nº de filas idénticas (misma fecha/céntimos/concepto normalizado) anteriores DENTRO del
  mismo lote; para los existentes de esa cuenta usa su `dedupe` si lo tienen o calcúlalo con el
  mismo esquema (importe con signo: income +, expense −). Dos cafés iguales el mismo día en el
  fichero NO se marcan como duplicados entre sí; reimportar el mismo fichero marca TODO duplicado.
- Tests: reimportación completa, dos cafés, manual previo idéntico detectado.

### `decode.ts`
`decodeBankFile(buf: ArrayBuffer): string` → UTF-8 (fatal: false); si aparece `�`, re-decodifica con `iso-8859-1`.

## B — Store
- Claves `finances_imports` y `finances_import_maps` en storageKeys.ts + estado + recargadores.
- `ImportRecord { id: string; date: string; cuenta: string; filename: string; format: 'n43'|'csv'; total: number; imported: number; skipped: number; undone?: boolean }`
- `applyImport({ cuenta, filename, format, rows: {row, key, category, merchantId?, concept}[], skipped })`
  → crea todas las Tx (type por signo, amount = |importe|, `importId`, `dedupe`, `merchantId`,
  `note: ''`) en UNA escritura de finances_tx y UNA de finances_cuentas, añade ImportRecord y
  llama a recordSnapshot. Devuelve el record.
- `undoImport(importId)` → borra las tx con ese importId revirtiendo saldos, marca `undone: true`.
- `saveImportMap(bankName, mapping)`.

## C — UI (`src/components/finanzas/import/`)
1. En MovesTab, junto a "+ Añadir", botón "⬆ Importar" que abre `ImportSheet` (hoja `Modal`, pasos):
   **1. Cuenta** (select obligatorio de cuentas; si no hay, invita a crear una) y fichero
   (`<input type="file" accept=".n43,.q43,.aeb,.txt,.csv">`) →
   **2. Mapeo** (solo CSV sin mapeo adivinado o si el usuario pulsa "Cambiar columnas"): selects por
   rol con muestra de 3 filas + "Guardar para este banco" (nombre) — y al cargar un CSV se prueban
   primero los mapeos guardados →
   **3. Revisión**: resumen arriba ("32 nuevos · 5 omitidos por duplicados · ✓ totales cuadran" o
   aviso amarillo si `check.ok === false`), lista de filas nuevas (fecha, concepto, importe con
   color, chip de categoría sugerida con `suggestCategory` tocable para cambiarla, logo de comercio),
   duplicados plegados y en gris; seleccionar varias + "Cambiar categoría" en bloque; si N43 trae
   saldo final, casilla "Ajustar el saldo de la cuenta al saldo final del extracto (X €)" que tras
   aplicar llama a `adjustBalance` →
   **4. Aplicar** → toast "✓ 32 movimientos importados" y cierra.
2. `ImportsHistorySheet`: accesible desde un enlace "Importaciones" en MovesTab; lista de
   ImportRecord con "Deshacer" (ConfirmDialog: "Se borrarán N movimientos") → `undoImport`.

## Criterios de aceptación
- `npm test` (nº), `npm run build`, `npm run lint` sin errores.
- Claves nuevas en storageKeys.ts con recargador.
- Importar dos veces el mismo fichero en la misma cuenta = 0 nuevos (probado en test de dedupe).

## Cierre
Commits por tarea lógica, rutas explícitas en git add, push a origin main. Marca `[x] F2` en plan.md.
Resumen: ficheros, nº tests, pendientes.
