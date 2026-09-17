# Margen — Teardown funcional y plan de construcción para Life App

---

## 0. Método: qué es verificado y qué es reconstrucción

**Leyenda que uso en todo el documento:**

- **[C] Confirmado** — sale literalmente de la web pública de Margen (getmargen.com), que he leído entera.
- **[R] Reconstrucción** — no lo he visto; es mi propuesta de cómo se implementa. Es lo que tú construirías. Trátalo como diseño, no como descripción.

**Lo que NO he podido ver, y conviene que lo sepas antes de leer:**

- No puedo instalar ni ejecutar la app. No he visto una sola pantalla en movimiento.
- Su ficha de App Store no está indexada aún (lanzamiento muy reciente), así que no tengo capturas, reseñas, tamaño del binario, historial de versiones ni la etiqueta de privacidad de Apple (que suele delatar el stack).
- No tengo sus páginas legales ni su política de privacidad (el buscador no las indexa todavía). Ahí es donde normalmente se lee qué subprocesadores usan — es decir, su stack real.

**Cómo cerrar ese hueco tú mismo, en 20 minutos:** descarga la app (es gratis), y mira estas cuatro cosas, que valen más que cualquier análisis externo:

1. **App Store → Privacidad de la app.** Te dice qué datos recogen y si hay tracking. Delata analytics y atribución.
2. **Ajustes → Suscripciones.** Si ves RevenueCat en el flujo de compra, sabes cómo gestionan el paywall.
3. **Proxy HTTPS** (Proxyman o Charles en el Mac, 15 min de setup). Con esto ves **las llamadas reales**: qué API de cotizaciones usan, cada cuánto refrescan, si hay WebSocket, si el backend es Supabase/Firebase, y la forma exacta de sus payloads. Esto es el teardown de verdad.
4. **Modo avión.** Te dice qué está cacheado en local y qué exige red — o sea, dónde vive el estado.

**Nota práctica sobre copiar (no es un sermón, es lo que te puede dar problemas):** las funcionalidades, los cálculos y la arquitectura no son propiedad de nadie — clónalos sin miedo, es práctica normal de la industria. Lo que sí está protegido y no debes reutilizar es el **copy literal** de su web, el **nombre y el logo**, sus **capturas** y sus **iconos/ilustraciones**. Como la app es para ti, esto es casi irrelevante, pero si algún día la publicas, ahí está la línea.

---

## 1. Inventario confirmado [C]

### 1.1 Posicionamiento

La tesis del producto en una frase: **tu dinero está repartido en 5 sitios y nunca ves el total**. Todo el producto orbita alrededor de una sola cifra —el patrimonio neto— actualizada en tiempo real. No es una app de gastos con patrimonio pegado; es una app de patrimonio con gastos pegados. Es una diferencia de arquitectura, no de marketing: define qué entidad es el centro del modelo de datos.

Enfoque explícito España y euros. Hecho en España, editor "Margen SL".

### 1.2 Bloques funcionales que anuncian

1. **Patrimonio neto en vivo** — banco + inversiones + cripto − deudas, en una cifra.
2. **Inversiones y cripto en tiempo real** — precios en directo, P&L y gráficas por periodo.
3. **Movimientos en segundos** — alta rápida con logo del comercio detectado automáticamente, sin escribir.
4. **Recurrentes y presupuestos** — control de gastos fijos mensuales.
5. **Simuladores** — préstamo, hipoteca y ahorro.
6. **Privacidad** — datos cifrados, sin conexión bancaria obligatoria.

### 1.3 Onboarding declarado: 3 pasos

1. Añades cuentas e inversiones (banco, bolsa, cripto, inmuebles).
2. La app las valora en vivo con precios de mercado.
3. Ves crecer el patrimonio: un número y una gráfica.

Esto implica **cero fricción de agregación bancaria**: nada de PSD2/Open Banking obligatorio. Entrada manual + importación de ficheros. Decisión de producto muy relevante (ver §6.1).

### 1.4 Pantallas que enseñan (nombres literales)

- **Análisis** — gastos por categoría.
- **Patrimonio** — el número y su evolución.
- **Activos** — la cartera de inversiones.

Más un **widget de iPhone** con el patrimonio total.

### 1.5 Importación bancaria

Mencionan explícitamente estos orígenes: **BBVA, Santander, CaixaBank, Sabadell, ING, Trade Republic, Revolut** y más. Nota que la lista mezcla bancos tradicionales con brokers/neobancos — o sea, el importador no es un parser por banco, es genérico con normalización posterior (ver §5.3).

En Premium lo llaman **importación con IA de cualquier banco**. Eso es un LLM normalizando extractos heterogéneos, no un parser fijo.

### 1.6 Matriz Free vs Premium — la mina de oro

Esto es lo más valioso de toda su web, y creo que no son conscientes: **los límites del plan gratis enumeran su modelo de datos completo.** Cada límite es una tabla.

| Concepto | Gratis | Premium |
|---|---|---|
| Patrimonio neto en vivo | Sí | Sí |
| Movimientos | Ilimitados | Ilimitados |
| Cuentas | Ilimitadas | Ilimitadas |
| Widget iPhone | Sí | Sí |
| Simuladores | Ilimitados | Ilimitados |
| **Activos de inversión** (acción, ETF, fondo o cripto) | **1** | Ilimitados |
| **Deudas** | **1** | Ilimitadas |
| **Presupuestos** | **2** | Ilimitados |
| **Recurrentes** | **2** | Ilimitados |
| **Amigos** | **1** | — |
| **Cuentas compartidas** | **1** | — |
| **Importaciones bancarias** | **1** (de prueba) | Ilimitadas, con IA |
| Inmuebles con evolución de valor | No | Sí |
| Compras recurrentes automáticas (DCA) | No | Sí |
| Recap y asesor con IA | No | Sí |
| Informe en PDF | No | Sí |
| Calendario y notificaciones premium | No | Sí |
| Compartir avanzado (partes iguales o %) | No | Sí |

**Lo que deduzco de esta tabla, y es fiable:**

- Las entidades del dominio son exactamente: `cuentas`, `movimientos`, `activos`, `deudas`, `presupuestos`, `recurrentes`, `inmuebles`, `importaciones`, `amigos`, `cuentas_compartidas`.
- **Lo gratis es lo barato de servir** (movimientos, cuentas, simuladores = puro cómputo local). **Lo limitado es lo que les cuesta dinero por unidad**: cada activo son llamadas a una API de cotizaciones; cada importación es una llamada a un LLM. La estructura de precios es literalmente su factura de infraestructura. Cuando construyas la tuya, tus límites serán los mismos, aunque no cobres a nadie.
- Inmuebles es Premium y se describe como "con su evolución de valor" — o sea, no es un número que tú metes a mano, hay una fuente de valoración detrás (ver §5.7).
- "Compartir avanzado (partes iguales o %)" indica gastos compartidos tipo Splitwise integrados en el modelo, no un módulo aparte.

### 1.7 Precios [C]

- Gratis para siempre, sin tarjeta.
- Premium: **4,99 €/mes** o **39,99 €/año** (−33 %, ≈3,33 €/mes). IVA incluido, sin permanencia.

### 1.8 Disclaimer legal [C]

Se declaran herramienta orientativa basada en datos del usuario; no asesoramiento financiero ni garantía de aprobación bancaria. **Cópialo.** En cuanto tengas simuladores de hipoteca y un "asesor con IA", este disclaimer deja de ser opcional y pasa a ser lo que te separa de estar dando asesoramiento financiero.

---

## 2. Arquitectura de decisión: las 4 elecciones que definen la app [R]

Antes del esquema, las cuatro decisiones estructurales. Si te equivocas aquí, reescribes todo después.

**1. La entidad central es el `snapshot` de patrimonio, no el movimiento.**
La tentación es calcular el patrimonio histórico agregando movimientos hacia atrás. No lo hagas. El patrimonio pasado depende de precios de mercado pasados, valoraciones de inmuebles pasadas y tipos de cambio pasados, que cambian y se revisan. **Guarda una foto diaria inmutable.** El histórico se lee, no se recalcula. Esto es lo que hace que la gráfica sea instantánea y coherente.

**2. Todo el dinero en enteros.** Céntimos, `BIGINT`. Nunca `FLOAT`, nunca `DOUBLE`. Las cantidades de activos sí necesitan decimales (`NUMERIC(28,10)`, porque hay cripto con 18 decimales), pero el dinero jamás. Un céntimo de deriva por redondeo en 3.000 movimientos y la cifra deja de cuadrar con el banco, y toda la credibilidad de la app depende de que cuadre.

**3. Moneda base fija (EUR) + tabla de FX con fecha.** Cada activo tiene su moneda nativa; el valor en EUR se calcula al tipo del día. Si guardas solo el valor en EUR, pierdes la capacidad de distinguir cuánto subió el activo y cuánto se movió el dólar.

**4. Separa el flujo del stock.** Los movimientos (flujo: entra/sale dinero) y las valoraciones (stock: cuánto vale lo que tengo) son dos sistemas distintos que se tocan en pocos puntos. Mezclarlos es el error clásico y el origen de casi todos los bugs contables de §9.

---

## 3. Esquema de base de datos [R]

Postgres. Adáptalo a lo que ya uses en Life App.

```sql
-- ============ NÚCLEO ============

CREATE TABLE accounts (              -- cuentas de dinero líquido
  id            UUID PRIMARY KEY,
  name          TEXT NOT NULL,          -- "Cuenta nómina BBVA"
  institution   TEXT,                   -- "BBVA"
  type          TEXT NOT NULL,          -- checking|savings|cash|ewallet
  currency      CHAR(3) NOT NULL DEFAULT 'EUR',
  balance_cents BIGINT NOT NULL DEFAULT 0,  -- saldo cacheado
  balance_at    TIMESTAMPTZ,            -- cuándo se confirmó por última vez
  include_in_nw BOOLEAN NOT NULL DEFAULT TRUE,
  color         TEXT,
  archived_at   TIMESTAMPTZ
);

CREATE TABLE categories (
  id        UUID PRIMARY KEY,
  parent_id UUID REFERENCES categories(id),
  name      TEXT NOT NULL,
  icon      TEXT,
  color     TEXT,
  kind      TEXT NOT NULL           -- expense|income|transfer
);

CREATE TABLE merchants (             -- comercios normalizados + logo
  id          UUID PRIMARY KEY,
  name        TEXT NOT NULL,           -- "Mercadona"
  domain      TEXT,                    -- "mercadona.es"  -> clave del logo
  logo_url    TEXT,
  default_category_id UUID REFERENCES categories(id)
);

CREATE TABLE merchant_patterns (     -- el motor de reconocimiento
  id          UUID PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  pattern     TEXT NOT NULL,           -- regex o substring normalizado
  priority    INT NOT NULL DEFAULT 0
);

CREATE TABLE transactions (
  id            UUID PRIMARY KEY,
  account_id    UUID NOT NULL REFERENCES accounts(id),
  booked_on     DATE NOT NULL,         -- fecha contable
  value_on      DATE,                  -- fecha valor (N43 las distingue)
  amount_cents  BIGINT NOT NULL,       -- negativo = gasto
  currency      CHAR(3) NOT NULL DEFAULT 'EUR',
  raw_concept   TEXT,                  -- literal del banco, intacto
  description   TEXT,                  -- lo que ve el usuario
  merchant_id   UUID REFERENCES merchants(id),
  category_id   UUID REFERENCES categories(id),
  transfer_id   UUID,                  -- une las 2 patas de un traspaso
  recurring_id  UUID REFERENCES recurring(id),
  import_id     UUID REFERENCES imports(id),
  dedupe_hash   TEXT,                  -- ver §5.3
  is_pending    BOOLEAN DEFAULT FALSE,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX ON transactions (account_id, dedupe_hash)
  WHERE dedupe_hash IS NOT NULL;
CREATE INDEX ON transactions (booked_on DESC);

-- ============ INVERSIONES ============

CREATE TABLE instruments (           -- catálogo global, compartido
  id           UUID PRIMARY KEY,
  kind         TEXT NOT NULL,         -- stock|etf|fund|crypto|bond|other
  symbol       TEXT,                  -- AAPL, VWCE.DE, BTC
  isin         TEXT,                  -- clave real en España (fondos)
  name         TEXT NOT NULL,
  currency     CHAR(3) NOT NULL,
  exchange     TEXT,                  -- XMAD, XETR, NASDAQ
  logo_url     TEXT,
  price_source TEXT,                  -- qué proveedor lo cotiza
  UNIQUE (kind, symbol, exchange)
);

CREATE TABLE holdings (              -- lo que posees de cada instrumento
  id            UUID PRIMARY KEY,
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  account_id    UUID REFERENCES accounts(id),  -- broker, opcional
  quantity      NUMERIC(28,10) NOT NULL,
  include_in_nw BOOLEAN DEFAULT TRUE
);

CREATE TABLE lots (                  -- cada compra, para el coste medio real
  id            UUID PRIMARY KEY,
  holding_id    UUID NOT NULL REFERENCES holdings(id) ON DELETE CASCADE,
  acquired_on   DATE NOT NULL,
  quantity      NUMERIC(28,10) NOT NULL,
  unit_cost     NUMERIC(28,10) NOT NULL,  -- en la moneda del instrumento
  fees_cents    BIGINT DEFAULT 0,
  fx_rate       NUMERIC(18,8)              -- a EUR el día de la compra
);

CREATE TABLE prices (                -- serie de precios, la tabla que crece
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  as_of         TIMESTAMPTZ NOT NULL,
  price         NUMERIC(28,10) NOT NULL,
  currency      CHAR(3) NOT NULL,
  source        TEXT,
  PRIMARY KEY (instrument_id, as_of)
);

CREATE TABLE fx_rates (
  base    CHAR(3) NOT NULL,
  quote   CHAR(3) NOT NULL,
  as_of   DATE NOT NULL,
  rate    NUMERIC(18,8) NOT NULL,
  PRIMARY KEY (base, quote, as_of)
);

-- ============ DEUDAS E INMUEBLES ============

CREATE TABLE debts (
  id                UUID PRIMARY KEY,
  name              TEXT NOT NULL,
  kind              TEXT NOT NULL,     -- mortgage|loan|card|personal
  principal_cents   BIGINT NOT NULL,   -- importe original
  balance_cents     BIGINT NOT NULL,   -- pendiente HOY
  annual_rate       NUMERIC(8,5),      -- 0.0325
  rate_type         TEXT,              -- fixed|variable
  reference_index   TEXT,              -- euribor_12m
  spread            NUMERIC(8,5),
  term_months       INT,
  started_on        DATE,
  payment_day       INT,
  monthly_payment_cents BIGINT,
  linked_asset_id   UUID,              -- la hipoteca apunta a la vivienda
  linked_account_id UUID REFERENCES accounts(id)  -- de dónde se paga
);

CREATE TABLE properties (
  id                UUID PRIMARY KEY,
  name              TEXT NOT NULL,
  kind              TEXT,              -- home|rental|garage|land
  purchase_price_cents BIGINT,
  purchase_date     DATE,
  surface_m2        NUMERIC(10,2),
  postal_code       TEXT,              -- clave para el índice de zona
  cadastral_ref     TEXT,
  valuation_mode    TEXT NOT NULL,     -- manual|index
  current_value_cents BIGINT NOT NULL,
  valued_at         DATE
);

CREATE TABLE property_valuations (   -- histórico, para la curva
  property_id  UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  as_of        DATE NOT NULL,
  value_cents  BIGINT NOT NULL,
  source       TEXT,                  -- manual|ine_ipv|idealista
  PRIMARY KEY (property_id, as_of)
);

-- ============ PLANIFICACIÓN ============

CREATE TABLE budgets (
  id            UUID PRIMARY KEY,
  category_id   UUID REFERENCES categories(id),
  name          TEXT,
  amount_cents  BIGINT NOT NULL,
  period        TEXT NOT NULL DEFAULT 'monthly',
  rollover      BOOLEAN DEFAULT FALSE,  -- ¿lo no gastado pasa al mes siguiente?
  starts_on     DATE NOT NULL
);

CREATE TABLE recurring (
  id             UUID PRIMARY KEY,
  name           TEXT NOT NULL,
  merchant_id    UUID REFERENCES merchants(id),
  account_id     UUID REFERENCES accounts(id),
  category_id    UUID REFERENCES categories(id),
  amount_cents   BIGINT NOT NULL,
  rrule          TEXT NOT NULL,          -- iCal RRULE, no reinventes esto
  next_due_on    DATE,
  kind           TEXT NOT NULL,          -- expense|income|dca
  instrument_id  UUID REFERENCES instruments(id),  -- solo si kind='dca'
  auto_create    BOOLEAN DEFAULT FALSE,
  notify_days_before INT DEFAULT 1,
  active         BOOLEAN DEFAULT TRUE
);

-- ============ LA TABLA CLAVE ============

CREATE TABLE net_worth_snapshots (
  as_of              DATE PRIMARY KEY,
  liquid_cents       BIGINT NOT NULL,
  investments_cents  BIGINT NOT NULL,
  crypto_cents       BIGINT NOT NULL,
  property_cents     BIGINT NOT NULL,
  debt_cents         BIGINT NOT NULL,   -- positivo, se resta
  net_worth_cents    BIGINT NOT NULL,
  breakdown          JSONB,             -- detalle por cuenta/activo
  computed_at        TIMESTAMPTZ DEFAULT now()
);

-- ============ IMPORTACIONES ============

CREATE TABLE imports (
  id            UUID PRIMARY KEY,
  account_id    UUID REFERENCES accounts(id),
  filename      TEXT,
  format        TEXT,                  -- n43|csv|pdf|xlsx
  status        TEXT,                  -- parsing|review|applied|failed
  rows_total    INT,
  rows_imported INT,
  rows_skipped  INT,                   -- duplicados detectados
  raw_sample    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. El motor: cómo se calcula "el número" [R]

### 4.1 La fórmula

```
patrimonio_neto =
    Σ saldos de cuentas líquidas (include_in_nw)
  + Σ (cantidad_activo × precio_actual × fx_a_eur)
  + Σ valor_actual de inmuebles
  − Σ saldos pendientes de deudas
```

Sencilla. Lo difícil no es la fórmula: es que cada término tenga una **frescura distinta** y que la cifra no parpadee.

### 4.2 Cómo se hace que esté "en vivo" sin arruinarte

Cada componente cambia a un ritmo radicalmente distinto:

| Componente | Cambia | Estrategia de refresco |
|---|---|---|
| Cuentas líquidas | Cuando el usuario mete un movimiento | Instantáneo, local |
| Cripto | Cada segundo, 24/7 | Poll 30-60 s en primer plano; WebSocket si te apetece |
| Acciones / ETF | En horario de mercado | Poll 60 s en mercado abierto; congelado fuera |
| Fondos (ISIN) | 1 valor liquidativo al día | 1 llamada diaria, post-cierre |
| Inmuebles | Trimestralmente, en el mejor caso | Recalcular al publicarse el índice |
| Deudas | Mensualmente, al pagar cuota | Recalcular al registrar el pago |

**El patrón correcto:** mantén un *baseline* calculado en servidor (o al arrancar) con todo lo estático, y en cliente solo revalúa la porción de mercado. Así una llamada de precios actualiza el número sin recomputar nada más.

```
número_mostrado = baseline_estático + Σ(cantidad × precio_en_vivo × fx)
```

**El detalle que lo hace sentir vivo:** no reemplaces el número, **anímalo**. Interpola entre el valor viejo y el nuevo con una animación de ~600 ms y dígitos de ancho fijo (`tabular-nums`, o `SF Mono` / `Roboto Mono`). Sin ancho fijo, el número tiembla lateralmente y parece roto. Con ancho fijo y transición, "late". Esa es toda la magia de su claim, y cuesta 20 líneas.

**Cuando el precio está viejo** (fin de semana, mercado cerrado, API caída): no ocultes nada ni muestres cero. Enseña el último precio con una marca discreta de "cierre del viernes". Una app de patrimonio que a veces muestra cifras raras pierde toda su razón de ser.

### 4.3 Snapshots: el trabajo nocturno

Un cron a las 03:00 hora local:

1. Trae precios de cierre y FX del día.
2. Calcula cada componente.
3. `INSERT` en `net_worth_snapshots` para `as_of = ayer`. **Nunca actualices snapshots pasados** salvo que el usuario corrija un dato histórico a mano.

De aquí sale la gráfica, el "+6,4 % este mes" y el informe PDF. Coste de lectura: cero.

**Backfill inicial:** cuando el usuario mete un activo hoy, el histórico está vacío y la gráfica sale plana y triste. Solución: al añadir el primer activo, reconstruye los últimos 12-24 meses con precios históricos (la mayoría de APIs dan EOD histórico gratis) asumiendo la cantidad actual constante. Es una aproximación, y debes etiquetarla como "estimado" antes de la fecha de alta, pero convierte una gráfica vacía en una gráfica útil desde el minuto uno.

### 4.4 P&L: la decisión que casi todos hacen mal

Necesitas distinguir **tres** cosas que la gente confunde:

1. **Rentabilidad de una posición** = `(valor_actual − coste_total) / coste_total`. Para esto necesitas los **lotes** (tabla `lots`). Con coste medio ponderado sirve para mostrar; con FIFO por lotes sirve para calcular la fiscalidad española (que usa FIFO). Guarda lotes desde el día uno: reconstruirlos después es imposible.

2. **Rentabilidad de la cartera** = aquí hay trampa. Si metes 1.000 € nuevos, tu cartera "sube" 1.000 € sin que hayas ganado nada. Necesitas **TWR** (time-weighted return) para medir cómo lo has hecho, o **MWR/XIRR** para medir cuánto has ganado tú. Muestra TWR en la gráfica de rendimiento, y la ganancia en euros aparte.

3. **Variación del patrimonio** = incluye ahorro nuevo + rendimiento. Es lo que sale en la portada, y está bien que sea así, pero **no la llames rentabilidad**.

Un "+6,4 % este mes" en portada es variación de patrimonio, no rentabilidad. Que la etiqueta lo diga.

---

## 5. Módulo por módulo [R]

### 5.1 Cuentas y saldos

Modelo mínimo: el usuario declara el saldo, y los movimientos lo mueven desde ahí. Añade un botón **"Ajustar saldo"** que cree un movimiento de conciliación de la diferencia contra una categoría `Ajuste`. Sin esto, en cuanto se le escape un movimiento, la cifra deja de cuadrar con su banco y abandona la app. Es la función más importante y la que nadie pone.

### 5.2 Movimientos y reconocimiento de comercios

El claim de "movimientos en segundos con logo automático" se implementa en tres capas, en cascada:

**Capa 1 — Normalización del literal.** Los conceptos bancarios españoles son un desastre: `COMPRA TARJ. 4589 MERCADONA S.A. 12/03 MADRID`. Limpia: mayúsculas, quita fechas, quita `TARJ`/`COMPRA`/`RECIBO`/`PAGO`, quita numeración de tarjeta, quita sufijos societarios (`S.A.`, `S.L.`), colapsa espacios.

**Capa 2 — Match contra `merchant_patterns`.** Índice trigram de Postgres (`pg_trgm`) o simple `LIKE` sobre el literal normalizado. Rápido, determinista, gratis. Cubre el 80 % con 200 patrones que puedes sembrar tú mismo con los comercios españoles habituales.

**Capa 3 — LLM como fallback.** Solo para lo que no matchea. Le pasas el literal y te devuelve `{nombre_comercial, dominio, categoría}`. **Y guardas el resultado como un nuevo `merchant_pattern`**, para no volver a pagar por ese literal nunca más. El coste tiende a cero con el uso.

**El logo.** Aquí hay un hallazgo concreto y muy útil: la Logo API de **Brandfetch** resuelve logos por dominio, **por ticker bursátil, por ISIN y por símbolo cripto**, y tiene una **Transaction API** específica para enriquecer movimientos con la marca del comercio. O sea, cubre las dos necesidades de esta app (logo de comercio y logo de activo) con un solo proveedor. Su tier gratuito es muy amplio.

Contexto que importa: la Clearbit Logo API, que era el estándar de facto, **se apagó en diciembre de 2025**. Si encuentras tutoriales que usen `logo.clearbit.com`, están muertos. Las alternativas vivas son **Brandfetch** y **Logo.dev** (este último es el sucesor recomendado oficialmente por Clearbit, con tier gratuito amplio pero con atribución obligatoria en el plan gratis — a tener en cuenta si algún día publicas).

**Alta rápida:** el flujo de "segundos" es cantidad → comercio (con autocompletado sobre tus merchants) → categoría preseleccionada por el comercio → guardar. Tres toques. Precarga la categoría por defecto del comercio, y guarda la última cuenta usada.

### 5.3 Importación de extractos — el módulo más subestimado

Este es el que más valor te va a dar y el que más trabajo tiene.

**Formato N43 primero.** Casi nadie lo sabe, y es la clave para España: existe un formato estándar de extracto bancario español, la **Norma 43** (también Cuaderno 43, AEB 43 o CSB 43), definida por la Asociación Española de Banca. Prácticamente todos los bancos españoles —BBVA, Santander, CaixaBank, Sabadell— permiten descargar el extracto en este formato desde la banca online. Es texto de ancho fijo con registros tipados (cabecera de cuenta, movimientos, conceptos ampliados, saldo final con verificación de totales, fin de fichero).

Ventajas sobre CSV: está estandarizado, incluye fecha contable **y** fecha valor, trae códigos de concepto, y **el registro final permite verificar que la suma cuadra**. Si tu import valida contra el saldo final del fichero, sabes con certeza que no has perdido ni duplicado nada. Eso no lo consigues con un CSV.

Hay parsers open source ya hechos: `norma43` y `csb43` en PyPI, y el módulo N43 de la OCA para Odoo si quieres una referencia de implementación bien probada. **Empieza por aquí, no por el LLM.** Es determinista, gratis y exacto.

**Pipeline completo:**

```
fichero
  → detección de formato (N43 por estructura de ancho fijo / CSV / XLSX / PDF)
  → parseo
      · N43  → parser determinista
      · CSV  → detectar separador, decimal (coma en ES), formato de fecha, encoding
      · PDF  → extracción de texto → LLM estructurador
  → normalización a un DTO común
      {fecha, fecha_valor, importe_céntimos, concepto_bruto, saldo_tras}
  → deduplicación
  → enriquecimiento (merchant, categoría)
  → PANTALLA DE REVISIÓN  ← obligatoria
  → aplicar
```

**Deduplicación** (crítica: la gente importa el mismo mes dos veces, siempre):

```
dedupe_hash = sha256(account_id | booked_on | amount_cents | normalize(raw_concept)[:40])
```

Con índice único parcial. Si el mismo comercio, mismo importe, mismo día aparece dos veces de verdad (dos cafés), añade un contador ordinal al hash. La pantalla de revisión debe mostrar explícitamente **"N movimientos omitidos por duplicados"** — si los omites en silencio, el usuario cree que el import falló.

**La pantalla de revisión no es opcional.** Nunca apliques un import directamente. Muestra qué va a entrar, qué se descarta y qué categoría ha asignado, con posibilidad de corregir en bloque. Y haz el import **reversible**: como todo movimiento importado lleva `import_id`, deshacer es un `DELETE WHERE import_id = ?`. Esta única decisión de diseño te ahorra un mundo de dolor.

**El LLM solo donde aporta:** PDFs y CSVs de formato desconocido. Envía las primeras 20 filas, pide un mapeo de columnas en JSON (`{columna_fecha: 0, columna_importe: 3, formato_fecha: "DD/MM/YYYY", decimal: ","}`), **y luego parsea el fichero entero tú, en código, con ese mapeo**. No le pases 2.000 filas al modelo: es caro, lento y alucina importes. El LLM decide la estructura; tu código hace el trabajo. Guarda el mapeo asociado a la institución para reutilizarlo la próxima vez.

### 5.4 Inversiones

**Búsqueda de instrumentos.** El usuario busca "Vanguard FTSE All-World" o pega un ISIN. En España el ISIN es la clave real, sobre todo para fondos. Guarda un catálogo local de instrumentos que crezca con el uso, para no golpear la API de búsqueda cada vez.

**Precios.** Panorama actual de proveedores (verifica precios antes de comprometerte, esto cambia rápido):

| Proveedor | Tier gratis | Fuerte en | Aviso |
|---|---|---|---|
| **Twelve Data** | ~800 req/día | Acciones, FX, cripto, ETF, una sola API para todo | Streaming en planes altos |
| **Alpha Vantage** | ~5 req/min, EOD | Fiable, aburrido, buena docu | Sin cripto en gratis, 5/min es muy poco |
| **EODHD** | De pago | +30 años de histórico, 60+ mercados, buena cobertura europea | Ideal para el backfill de §4.3 |
| **CoinGecko** | Sí, generoso | Cripto, precios en EUR directos | Solo cripto |
| **BCE (SDW)** | Gratis, oficial | FX oficial diario EUR | Solo FX, 1 valor/día |

Para una app española: **Twelve Data** para renta variable y ETFs, **CoinGecko** para cripto (da precios en EUR nativamente, te ahorras un FX), **BCE** para tipos de cambio oficiales. Fondos españoles por ISIN son lo más difícil de cubrir gratis — plantéate permitir el valor liquidativo manual como fallback y no morir en el intento.

**Presupuesto de llamadas:** el usuario medio tendrá 5-15 instrumentos distintos. Una llamada por instrumento cada 60 s son 900 llamadas/hora — te comes cualquier tier gratis en un día. **Usa endpoints batch** (varios símbolos por llamada) y **cachea en servidor, no en cliente**: los precios son globales, no por usuario. Un solo fetch de BTC sirve para todos. Con caché de 60 s en Redis, tu factura es constante aunque tengas 1.000 usuarios.

**Gráficas.** Periodos 1D / 1S / 1M / 1A / Todo. Para 1D necesitas intradía (caro); las demás salen de la serie EOD que ya guardas en `prices`. Empieza por 1M/1A/Todo, que salen gratis de tus propios snapshots.

### 5.5 Deudas y amortización

La tabla de amortización francesa (la de las hipotecas españolas):

```
cuota = P × i / (1 − (1 + i)^(−n))
   P = capital pendiente
   i = tipo nominal anual / 12
   n = meses restantes
```

Cada cuota se descompone: `interés = P × i`, `amortizado = cuota − interés`, `P_nuevo = P − amortizado`.

**El punto contable clave, y es el que casi todo el mundo se salta:** cuando pagas una cuota de hipoteca, **solo la parte de intereses es un gasto**. La parte de capital es un traslado de activo a pasivo: sale dinero de la cuenta y baja la deuda en la misma cantidad. **Tu patrimonio neto no cambia.** Si contabilizas la cuota entera como gasto, tu app dice que la gente se empobrece al pagar la hipoteca, que es exactamente al revés.

Implementación: al registrar el pago, genera dos apuntes ligados — el interés a categoría `Intereses` (gasto real) y el capital como transferencia contra `debts.balance_cents`.

**Hipoteca variable:** guarda `reference_index` + `spread` y aplica revisión anual. El Euríbor es público y publicado a diario; idealista lo publica en abierto entre sus estadísticas, y el Banco de España lo da como serie oficial.

### 5.6 Simuladores

Puramente locales, sin backend, sin coste. Tres:

- **Préstamo:** importe, plazo, TIN → cuota, total intereses, coste total, tabla de amortización.
- **Hipoteca:** lo anterior + entrada, gastos de compra (~10-12 % en España entre ITP/IVA, notaría, registro, gestoría), y **el impacto en patrimonio neto** — que es lo que diferencia esta app de una calculadora cualquiera: "si compras esto, tu patrimonio pasa de X a Y y tu ratio deuda/activos de A a B".
- **Ahorro / interés compuesto:** aportación inicial, aportación mensual, rentabilidad, años → curva.

El simulador es el mejor gancho de la app: es útil sin haber metido ni un dato, funciona sin login y es 100 % offline. Ponlo accesible desde el primer arranque.

### 5.7 Inmuebles

Dos modos, y ofrece los dos:

- **Manual:** el usuario pone el valor y lo actualiza cuando quiere. Simple, honesto, cero coste.
- **Indexado:** valor de compra × variación acumulada del índice de precios de su zona desde la fecha de compra. Esto genera la "evolución de valor" automáticamente.

Fuentes para el modo indexado, de más a menos accesible:

1. **INE — Índice de Precios de Vivienda (IPV).** Oficial, gratuito, con API JSON pública, trimestral y desglosado por comunidad autónoma. Es la opción sensata para empezar.
2. **Catastro** (Sede Electrónica) — servicios públicos gratuitos para resolver una referencia catastral y obtener superficie y año. No da valor de mercado, pero sí datos del inmueble.
3. **idealista** — publica índices de precios por zona y el índice idealista 50 en su sala de prensa; su división de datos (idealista/data) es comercial y cara. Para uso personal, el dato publicado te vale.

Sé transparente en la UI: **"valor estimado por índice, no tasación"**. Un patrimonio que se mueve por una estimación de vivienda sin avisar es engañoso, y en tu caso concreto —que estás planificando una construcción— la diferencia entre valor de índice y valor real te importa de verdad.

### 5.8 Presupuestos, recurrentes y notificaciones

**Presupuestos:** por categoría y periodo, con la decisión de diseño de si el sobrante pasa al mes siguiente (`rollover`). Cálculo trivial: suma de movimientos de la categoría en el periodo contra el importe.

**Recurrentes:** usa **RRULE de iCal** (RFC 5545) para la recurrencia. Hay librerías en todos los lenguajes y te evita reimplementar "el último día hábil del mes". `next_due_on` se recalcula al confirmarse cada ocurrencia.

**Detección automática de recurrentes** (esto sí impresiona): agrupa movimientos por `merchant_id`, busca 3+ apariciones con importes similares (±10 %) y separación regular (28-31 días), y **sugiere** crear el recurrente. No lo crees solo: propón.

**Calendario:** vista mensual con los cargos previstos, y el saldo proyectado día a día. La pregunta que responde es "¿llego a fin de mes?", que es la más útil de toda la app.

**Notificaciones:** cargo próximo (N días antes), presupuesto al 80 % y al 100 %, y un resumen semanal o mensual. Tres tipos, no más — es muy fácil pasarse y que las desactive todas.

### 5.9 DCA / compras recurrentes automáticas

Es un `recurring` con `kind='dca'` e `instrument_id`. Al vencer, genera un movimiento de salida en la cuenta **y** un nuevo `lot` en el holding. Es de las funciones que más se agradecen si aportas a un indexado todos los meses, porque mantiene el coste medio correcto sin trabajo manual.

### 5.10 Compartir gastos

Modelo: `expense_shares (transaction_id, person_id, share_pct | share_cents)`. El movimiento entra completo en tus gastos, pero el patrimonio solo cuenta tu parte, y la diferencia se convierte en un saldo a cobrar contra esa persona. El "avanzado (partes iguales o %)" que anuncian es exactamente esto.

Si la app es solo para ti, esto probablemente sobre — salvo que compartas gastos de casa.

### 5.11 Recap y asesor con IA

Aquí es donde tú tienes ventaja real, y lo desarrollo en §7.

Diseño correcto: **no le des la base de datos al modelo**. Precalcula un contexto compacto en JSON (patrimonio actual, variación 1M/3M/1A, top 5 categorías del mes vs media de 6 meses, presupuestos desviados, tasa de ahorro, próximos cargos, composición de cartera) y pásale eso. Son ~500 tokens en vez de miles de filas, es más barato, más rápido y alucina infinitamente menos.

El "Recap" es un resumen mensual generado sobre ese contexto. Es un cron mensual + una push, no una función interactiva.

### 5.12 Informe PDF

Snapshot del mes: cifra, gráfica de evolución, desglose por clase de activo, resumen de gastos, tasa de ahorro. Genera desde HTML con un renderizador headless. Es cosmético, pero da sensación de producto serio y es barato de hacer.

### 5.13 Widget

Widget de pantalla de inicio con el patrimonio total. En iOS, los widgets tienen presupuesto de refresco limitado: **no intentes que sea en tiempo real**. Escribe el último valor conocido en un App Group compartido cada vez que la app se abre o se refresca en background, y el widget lee de ahí. Refresco real cada 15-30 min como mucho.

---

## 6. Decisiones de producto que conviene copiar (y por qué) [R]

### 6.1 No conectar con bancos es una decisión, no una limitación

Podrían haber integrado PSD2 (Tink, GoCardless/Nordigen, Plaid). No lo han hecho, y lo venden como privacidad. Los motivos reales son buenos y te aplican todos:

- Coste por usuario/mes de los agregadores.
- Fricción brutal en el alta: SCA, redirecciones, consentimientos que **caducan cada 90 días** y hay que renovar.
- Mantenimiento eterno: cada banco rompe su integración cada pocos meses.
- Riesgo regulatorio y de datos.

A cambio: el usuario debe mantener los saldos. Lo compensan con la importación de extractos, que da el 80 % del beneficio con el 5 % del coste. **Para tu app personal esto es evidentemente lo correcto.** No mires siquiera a PSD2.

### 6.2 Lo gratis es lo que no cuesta servir

Ya lo vimos en §1.6, pero merece la pena internalizarlo aunque no cobres: **tu arquitectura debe hacer que las funciones caras sean acotables**. Un activo = llamadas recurrentes a una API. Una importación = una llamada a un LLM. Si construyes sin ese límite en mente, un día descubres una factura absurda por una app que usas tú solo.

### 6.3 Una sola cifra como identidad del producto

Es la mejor decisión de diseño que han tomado. Una app de finanzas puede enseñar 40 métricas; ellos enseñan una y todo lo demás la explica. Si copias una sola cosa de Margen, copia esto: **decide cuál es tu número y subordínale toda la jerarquía visual.**

---

## 7. Cómo adaptarlo a Life App — dónde tienes ventaja [R]

Tú ya tienes en Life App gastos y entrenamiento, y estás montando un asistente con contexto propio. Eso cambia el plan: no estás construyendo un clon de Margen, estás **añadiendo la capa de patrimonio a algo que ya tiene la capa de flujo**.

**Lo que ya tienes y no hay que rehacer:** movimientos/gastos, categorías, y presumiblemente autenticación, notificaciones push y la base de datos.

**El delta real a construir**, en orden de valor por esfuerzo:

1. `accounts` + `net_worth_snapshots` + la cifra. Es el 60 % del valor de Margen y es una tarde de trabajo si ya tienes movimientos.
2. Importación N43. Es lo que hace que la app se mantenga viva sin disciplina manual.
3. `instruments` + `holdings` + `lots` + precios. La parte de inversión.
4. `debts` con desglose interés/capital correcto.
5. Recurrentes + calendario + notificaciones.
6. Inmuebles (te interesa especialmente por la construcción que estás planificando).
7. Simuladores.

**Tu ventaja competitiva sobre Margen, que es real:** ellos tienen un asesor de IA que solo ve dinero. **El tuyo ve dinero, entrenamiento y hábitos a la vez.** Ese cruce no lo puede hacer ninguna app de finanzas del mercado, porque nadie tiene los tres dominios en la misma base de datos. Cosas que solo tu app puede decir:

- Correlación entre gasto en restauración y semanas sin entrenar.
- Coste real por sesión de gimnasio según lo que pagas y lo que realmente vas.
- Impacto en la tasa de ahorro de los meses en que cumples tus propósitos.
- Un recap mensual que junte las tres dimensiones en un solo texto.

Cuando montes el contexto del asistente (§5.11), **incluye los tres dominios en el mismo JSON**. Ahí está tu producto, no en clonar la pantalla de patrimonio.

---

## 8. Plan por fases

**Fase 1 — El número (1 semana).**
`accounts`, saldos manuales, el cálculo de patrimonio, snapshot diario, gráfica de evolución, widget. Sin inversiones todavía. Ya tienes algo que usas a diario.

**Fase 2 — Que se mantenga solo (1-2 semanas).**
Importador N43 con parser open source, deduplicación, pantalla de revisión, reversibilidad. Merchants + patrones + logos vía Brandfetch. A partir de aquí la app deja de depender de tu disciplina.

**Fase 3 — Inversiones (1-2 semanas).**
`instruments`, `holdings`, `lots`, caché de precios en servidor, P&L con coste medio, gráficas por periodo, backfill histórico.

**Fase 4 — Deudas e inmuebles (1 semana).**
Amortización francesa con desglose correcto, hipoteca variable con Euríbor, inmuebles con índice del INE.

**Fase 5 — Planificación (1 semana).**
Presupuestos, recurrentes con RRULE, detección automática, calendario, notificaciones.

**Fase 6 — La capa que te diferencia.**
Simuladores. Asistente con contexto cruzado dinero + entrenamiento + hábitos. Recap mensual. Informe PDF.

---

## 9. Las trampas contables — léelo antes de escribir código

Estas son las que hunden este tipo de apps. Casi todas vienen de mezclar flujo y stock (§2, decisión 4).

1. **Una transferencia entre tus cuentas no es un gasto.** Si mueves 500 € de la nómina al ahorro, tu app no puede decir que has gastado 500 €. Marca ambas patas con el mismo `transfer_id` y excluye las transferencias de todas las estadísticas de gasto. Autodetección: mismo importe con signo opuesto, ±2 días, cuentas distintas.

2. **Una aportación a inversión tampoco es un gasto.** Sale de la cuenta y entra en el holding. Patrimonio neto sin cambios. Si lo cuentas como gasto, quien más ahorra peor sale en su propia app.

3. **La cuota de hipoteca se divide en interés (gasto) y capital (traslado).** Ver §5.5. Es el error más frecuente y el más grave.

4. **Que suba la bolsa no es un ingreso.** Las plusvalías latentes suben el patrimonio pero no entran en el cash flow ni en la tasa de ahorro. Son dos gráficas distintas.

5. **La tasa de ahorro se calcula sobre flujo, no sobre patrimonio.** `(ingresos − gastos) / ingresos`, sin tocar revalorizaciones.

6. **Zonas horarias en los snapshots.** El snapshot es "el día D en hora de Madrid". Si tu servidor está en UTC y lo lanzas a medianoche, en verano estás cerrando el día a las 02:00 del siguiente. Fija la zona explícitamente.

7. **Splits de acciones.** Un split 4:1 cuadruplica tu cantidad y divide el precio. Si tu API te devuelve precios ajustados y tú tienes la cantidad vieja, tu cartera pierde el 75 % de la noche a la mañana. Usa siempre series **ajustadas** y prevé un ajuste manual de cantidad.

8. **Dividendos.** Entran como ingreso en la cuenta del broker, con retención (19 % en España para el primer tramo). No modifican el coste de los lotes. Si los reinviertes, es un lote nuevo.

9. **Céntimos y redondeo.** Enteros siempre. Si aun así tienes que repartir (splits de gasto), reparte el resto al primer participante en vez de redondear cada parte — si no, la suma de las partes no da el total.

10. **Duplicados en la importación.** Ver §5.3. Pasa siempre. Diseña para ello desde el principio.

11. **Precios stale.** Fin de semana, festivos de mercado, API caída. Nunca muestres 0 ni ocultes. Último precio conocido + marca de frescura.

12. **Cripto: staking, airdrops y comisiones de red.** El staking incrementa la cantidad sin coste de adquisición, lo que rompe el cálculo de coste medio si no lo modelas como lote a coste 0. Las comisiones de red reducen cantidad sin ser una venta.

---

## 10. Resumen accionable

**Para completar el teardown real:** descarga la app y ponle un proxy HTTPS 15 minutos. Eso te dará el stack, las APIs y las cadencias exactas, que es justo lo único que no he podido darte.

**Lo que puedes empezar a construir ya, sin esperar a nada:**

- El esquema de §3, tal cual.
- La decisión de snapshots inmutables (§4.3) — es la que más difícil es de cambiar después.
- Dinero en enteros (§2).
- El parser N43 (§5.3) — hay librerías hechas, es la mejor relación valor/esfuerzo de todo el proyecto.
- Brandfetch para logos, que cubre comercios y activos a la vez.

**Lo que no debes copiar:** el paywall, los límites del plan gratis, la conexión bancaria que ellos tampoco tienen, y la idea de que el asistente de IA solo vea dinero. Ahí está tu diferencia.
