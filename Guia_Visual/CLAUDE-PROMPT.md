# IMPULSO — Especificación completa para reconstruir la app

> **Qué es esto:** documento de referencia para que una IA (Claude, Claude Code, etc.)
> reconstruya o continúe **IMPULSO**, un concepto de "Life OS" móvil con 5 pantallas
> de alta fidelidad. Incluye sistema de diseño, estructura, datos exactos de cada
> pantalla y requisitos de interacción. **Adjunta siempre las capturas de la carpeta
> `capturas/` como referencia visual** — este texto las complementa con los valores exactos.

---

## 1. Cómo usar este kit

**Opción A — Claude Code (recomendado si quieres el código real):**
1. Descomprime `impulso-codigo-fuente.zip` (proyecto Next.js completo y funcional).
2. `npm install` y `npm run dev` → la app ya funciona en `localhost:3000`.
3. Pega este documento en Claude Code y pide cambios concretos sobre ese código
   (ej.: "añade una pantalla de Sueño respetando el sistema de diseño").

**Opción B — claude.ai (chat web, sin ejecutar código):**
1. Sube las capturas de `capturas/` (son ~1100 px de ancho, se leen perfecto).
2. Pega el contenido de este documento como mensaje.
3. Pide: *"Construye la app descrita usando Next.js 16 + Tailwind CSS 4 +
   TypeScript. Usa las capturas como referencia visual exacta."*

## 2. Stack técnico del original

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4** (`@theme inline` en CSS)
- Iconos: **lucide-react** (nada de emojis en la UI)
- Fuentes: **Space Grotesk** (display/números, `font-display`) + **Inter** (texto,
  con `font-feature-settings: "ss01","cv11"`) vía `next/font/google`
- Sin librería de estados ni backend: todo son componentes con `useState`
- Animaciones: CSS (keyframes + transitions) y un hook propio con IntersectionObserver

## 3. Sistema de diseño (tokens exactos)

### Colores
| Token | Hex | Uso |
|---|---|---|
| `volt` | `#C9F43C` | Color de marca: CTAs, acentos, pestaña activa |
| `volt-deep` | `#8FCE12` | Volt más oscuro (gradientes, hover) |
| `volt-soft` | `#EFF8D2` | Fondos suaves lima |
| `ink` | `#181B10` | Texto principal y superficies oscuras cálidas |
| `ink-soft` | `#4A4E3C` | Texto secundario |
| `paper` | `#F4F3EB` | Fondo crema de las pantallas claras |
| `teal` | `#2FB8A6` | Datos "salud/proteína" |
| `amber` | `#F0A22E` | Datos "carbos/aviso" |
| `coral` | `#F26D5B` | Datos "grasa/gasto" |
| `night` | `#9B7BF0` | Acento lila (sueño, pasos) |
| `money` | `#1FA45B` | Verde para ingresos positivos |
| fondo noche | `#0D0F08` | Físico (dark) y showcase |
| showcase bg | `#0B0D08` | Fondo de la página de presentación |

### Tipografía y utilidades CSS clave
- `.font-display` → Space Grotesk (títulos, cifras grandes, `tracking-tight`)
- `.num` → `font-variant-numeric: tabular-nums; letter-spacing: -0.02em` (SIEMPRE en cifras)
- `.card-impulso` → tarjeta blanca `border-radius: 1.5rem` con sombra suave
  triple: `0 1px 2px rgba(24,27,16,.04), 0 8px 24px -12px rgba(24,27,16,.12), 0 0 0 1px rgba(24,27,16,.05)`
- `.rise-in` → entrada `translateY(18px)→0` con `cubic-bezier(.22,1,.36,1)`
- `.tilt-l / .tilt-r / .tilt-hero` → perspectiva Apple en el showcase:
  `perspective(1500px) rotateY(∓9deg) rotateX(2.5deg) rotateZ(∓1deg)`; hover las endereza
- Estética: esquinas muy redondeadas (24–56px), glassmorphism en la tab bar
  (`backdrop-blur-xl`), glows difusos de color detrás de elementos clave

## 4. Estructura del proyecto

```
src/
  app/
    layout.tsx            # fuentes Google + metadata
    globals.css           # tokens @theme + utilidades del sistema
    page.tsx              # showcase web estilo Apple (página pública)
    export/page.tsx       # ruta interna: las 5 pantallas rectas para capturar
  components/impulso/
    phone-frame.tsx       # marco iPhone + status bar + tab bar flotante
    notification-banner.tsx  # push estilo iOS (entra 1.4s, se retira a los 7.4s)
    use-in-view.ts        # hook IntersectionObserver (anima gráficos al scroll)
    inicio.tsx agenda.tsx fisico.tsx nutricion.tsx finanzas.tsx
public/food/              # 3 fotos reales de comida (desayuno, comida, merienda)
```

## 5. Componente transversal: PhoneFrame

Cada pantalla se renderiza dentro de un marco de iPhone fijo de **352×814 px**:
- Carcasa oscura `rounded-[56px]` con degradado y borde interior; pantalla `rounded-[47px]`
- Isla dinámica centrada arriba; status bar con "9:41", señal, wifi y batería (lucide)
- **Tab bar flotante** `inset-x-3.5 bottom-[18px] h-[62px]` con 5 pestañas:
  Agenda (Calendar), Físico (Zap), **Inicio (Home, centro)**, Nutrición (UtensilsCrossed),
  Finanzas (Euro). Pestaña activa: chip oscuro con icono lima (claro) o chip lima (oscuro)
- Prop `dark` invierte status bar, tab bar y fondo (`#0D0F08`)
- Indicador home inferior de 104×4 px
- La pestaña activa SIEMPRE coincide con la pantalla mostrada

## 6. Pantallas (datos exactos)

### 6.1 Inicio — captura `01-inicio-push.png` (fondo paper, claro)
1. **Push iOS** (se superpone arriba): app "IMPULSO" + "hace 2 min" ·
   título "Tu entrenamiento empieza a las 18:00" · cuerpo "Full Body Iniciación · GymFit Centro"
2. Saludo "Buenos días, Álex" + avatar
3. **Clima**: 17° "Nublado · Madrid" con forecast horario 13°/15°/17°/16°/14° (barras teal)
4. **Tarjeta "Tu día"** con chip "Progreso 68%" y 3 widgets con mini-barra:
   1.420 KCAL · 67% (teal) · 18:00 ENTRENO (volt) · 8.432 PASOS · 84% (night)
5. **Grid 2×2**: AGENDA "2 eventos · Próximo · 18:00" · FÍSICO "Full Body · 2 de 6 ejercicios" ·
   FINANZAS "+640 € · Presupuesto 72%" · SUEÑO "7 h 12 min · Calidad 86%"
6. **Racha** (banda oscura): "Racha de **12 días**" + "Entrenando y registrando comidas
   sin fallar" + 8 barras verticales (última encendida en volt)
7. CTA ancho oscuro "+ Registro rápido"

### 6.2 Agenda — captura `02-agenda.png` (claro)
- Cabecera "Agenda" + subtítulo "Organiza tu día", botones "Mes anterior/Mes siguiente"
- Calendario octubre 2026 en grid de 7; cada día puede llevar **turno** con código de color:
  `L` (libre), `TM` (mañana), `TT` (tarde), `TN` (noche) — chips pequeños con colores distintos
- Día **13 seleccionado** (chip oscuro `bg-ink text-volt`); hoy marcado con contorno
- Leyenda de turnos bajo el calendario
- **Eventos del día**: "Entrenamiento · Full Body · Gimnasio · 18:00" y
  "Finanzas · Mensual · Revisar presupuesto · 20:00" con punto de color por categoría
- CTA "+ Añadir evento"

### 6.3 Físico — capturas `03/04/05` (**modo noche**, tabs clicables)
Cabecera "Físico · Entreno de hoy · GymFit Centro". 4 tabs: **Fuerza · Running · Movilidad · Salud**.
- **Fuerza**: tarjeta con "FULL BODY · INICIACIÓN", chip "● En curso", cronómetro **32:18**
  (Space Grotesk gigante), "2 de 6 ejercicios" y 6 segmentos de progreso (2 en volt).
  Tarjeta ejercicio: "Sentadilla con barra · Piernas · Barra olímpica", chips
  "Tempo 3-1-1" "RPE 8" "1RM est. 92 kg"; tabla de series — 1: 40 kg (RPE 7) × 10 ✓,
  2: 40 kg (RPE 7,5) × 10 ✓, 3: 45 kg (RPE 8) × 8 (pendiente, círculo punteado);
  fila punteada "+ Añadir serie"; CTA lima "▶ Finalizar entrenamiento";
  banda "SIGUIENTE EJERCICIO · Press de banca →"
- **Running**: 6,2 km · ritmo 5:18/km en el Retiro, splits por kilómetro, mapa simplificado
- **Movilidad**: rutina de 12 min con lista de ejercicios y checks
- **Salud**: "Anillos de actividad" — 3 anillos SVG (Pasos 8.432 lila · Calorías 612 lima ·
  Sueño 7 h 12 teal); tarjeta "Frecuencia en reposo" con chip "-2 ppm este mes",
  cifra **58 ppm · media 7 días**, sparkline teal y nota "Buena recuperación. Momento
  ideal para subir cargas un 5 %."; CTA outline "Ver informe semanal" anclado al fondo
  (⚠ el contenedor de este tab necesita `min-h-[639px]` para que el CTA absoluto
  no solape el contenido)

### 6.4 Nutrición — captura `06-nutricion.png` (claro)
- Cabecera "Nutrición · Hoy, 13 de octubre"
- **Tarjeta de calorías**: 1.420 "de 2.106 kcal", chip "● Quedan 686 kcal", anillo SVG
  al 67% (HOY) que **se anima al hacer scroll** (stroke-dashoffset con IntersectionObserver)
- Macros con barras de color animadas escalonadas: Proteína 102/154 g (teal) ·
  Carbos 164/240 g (amber) · Grasa 44/59 g (coral)
- CTA "+ Registrar alimento" + botón búsqueda redondo
- **Comidas con FOTO REAL** (`public/food/`): Desayuno 08:10 "Avena con plátano y arándanos"
  380 kcal · Comida 14:05 "Pollo a la plancha con arroz" 650 kcal · Merienda 17:30
  "Yogur griego con frutos rojos" 390 kcal — cada fila con hora, kcal y chevron
- "KCAL ÚLTIMOS 7 DÍAS": gráfico de barras X J V S D L **M** (hoy en lima) + tile "MEDIA 1.890 kcal"

### 6.5 Finanzas — capturas `07/08/09/10` (claro, 4 tabs clicables)
Cabecera "Finanzas · Octubre 2026 · Cuentas al día". Tabs: **Resumen · Movimientos · Patrimonio · Plan**.
- **Resumen**: hero lima "PATRIMONIO NETO **24.850,00 €**" + chip "+3,2 % este mes" +
  sparkline oscuro con eje 1 oct→31 oct; fila de 3 tiles: BALANCE OCT. **+640,00 €**
  (mes en curso) · INGRESOS 2.450,00 € (4 movimientos) · GASTOS 1.810,00 € (11 movimientos);
  "Gastos por categoría · Ver todas": Vivienda 740,00 € 41% (teal) · Alimentación 320,00 €
  18% (amber) · Transporte 180,00 € 10% (coral), con barras
- **Movimientos**: "Últimos movimientos · Ver todos" — Mercadona −62,40 € (Supermercado ·
  hoy 12:40) · Gasolinera Repsol −45,10 € (Transporte · ayer 19:05) · Nómina Academia
  **+1.850,00 €** (Ingreso · 12 oct, en money) · GymFit Centro −29,99 € (Suscripción · 10 oct) ·
  Cafetería La Rustica −4,80 € (Ocio · 8 oct); cada uno con icono en pastilla de color
- **Patrimonio**: cuentas BBVA (nómina), Revolut (resto) y "Fondo Indexado MSCI World ·
  Vanguard · Plan largo plazo · 17.430,00 €"
- **Plan**: objetivos con anillos — Fondo de emergencia 72% · Viaje a Japón
  1.050 € de 3.000 € (35%, ETA abr. 2027) + regla 50/30/20
- **Push de esta pantalla**: "Presupuesto de octubre al 72 %" / "Te quedan 690,00 € para acabar el mes"
- **CTA cambia según el tab**: "Añadir movimiento / Buscar movimiento / Añadir cuenta / Crear objetivo"

### 6.6 Showcase web — captura `11-showcase-completo.png`
Página pública en fondo `#0B0D08` con glows difusos y grid sutil:
- Header con logo rayo en chip lima + "IMPULSO · Tu Life OS"
- Título: "Cinco pantallas. **Cero sensación de demo.**" (segunda línea en gradiente lima)
- Swatches del sistema con nombre + hex
- **Inicio como hero** con tilt `rotateX(4deg) scale(1.03)`, resto de pantallas alternando
  `tilt-l/tilt-r`; hover endereza (`straighten`)
- 3 chips de características: "Fotografías reales", "Push de verdad", "Tu banca, dentro"
- Footer: "IMPULSO v3 · Mockup conceptual de alta fidelidad · Todos los datos son de ejemplo"

## 7. Interactividad obligatoria

1. **Tabs funcionales**: los 4 tabs de Físico y los 4 de Finanzas cambian de contenido
   con `useState` (no son decorativos)
2. **Push estilo iOS**: componente reutilizable — entra a los 1,4 s (700 ms de
   transición `translateY(-32px)→0 + opacity`), permanece 6 s y se retira solo;
   clic para cerrarlo; se superpone sobre el contenido (z-50)
3. **Animación al scroll**: anillo de calorías y barras de macros se llenan cuando
   entran en viewport (IntersectionObserver + transición de stroke-dashoffset/width)
4. **Showcase**: tilt 3D con hover para enderezar (deshabilitado bajo 900 px)
5. Datos con formato español: coma decimal (24.850,00 €), punto de millar (1.420)

## 8. Checklist de aceptación

- [ ] Las 5 pantallas renderizan dentro de PhoneFrame sin overflow ni solapamientos
- [ ] Nada queda tapado por la tab bar flotante (dejar ≥96 px libres al fondo)
- [ ] Pestaña activa correcta en cada pantalla
- [ ] Tabs de Físico y Finanzas operativos
- [ ] Push entra y se retira solo en Inicio y Finanzas
- [ ] Anillo de Nutrición anima al scroll y queda en 67%
- [ ] Fotos reales visibles en las 3 comidas
- [ ] Dark mode de Físico con status bar y tab bar oscuras
- [ ] Formato numérico español en todas las cifras
- [ ] Sin emojis: solo iconos lucide-react
