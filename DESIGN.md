---
name: LifeApp — IMPULSO
description: Papel cálido, tinta y energía lima para el cuaderno de vida.
colors:
  volt: "#C9F43C"
  volt-deep: "#8FCE12"
  volt-soft: "#EFF8D2"
  ink: "#181B10"
  ink-soft: "#4A4E3C"
  paper: "#F4F3EB"
  surface: "#FFFFFF"
  surface-inset: "#ECE7DF"
  surface-deep: "#E3DDD2"
  muted: "#6B6E5C"
  onyx: "#0D0F08"
  onyx-surface: "#171B10"
  onyx-inset: "#22271A"
  abyss: "#000000"
  abyss-surface: "#0B0D08"
  teal: "#0E7B6E"
  amber: "#C77800"
  amber-text: "#9B5C00"
  acc-orange: "#B34F24"
  coral: "#C24338"
  night: "#6A4FC8"
  money: "#1F7A4D"
  primary: "var(--color-primary)"
  on-primary: "var(--color-on-primary)"
  current-surface: "var(--color-s1)"
  current-text: "var(--color-text)"
  current-sub: "var(--color-sub)"
typography:
  display:
    fontFamily: "Space Grotesk, Inter, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Space Grotesk, Inter, sans-serif"
    fontSize: "22px"
    fontWeight: 600
  section:
    fontFamily: "Space Grotesk, Inter, sans-serif"
    fontSize: "17px"
    fontWeight: 600
  body:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "15px"
    lineHeight: 1.5
  secondary:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
  meta:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
rounded:
  card: "24px"
  pill: "99px"
  button: "16px"
  field: "12px"
spacing:
  unit: "4px"
  gap: "8px"
  inline: "12px"
  section-inline: "16px"
  card-padding: "18px"
  roomy: "20px"
  section-top: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.button}"
    padding: "10px 16px"
  button-ghost:
    backgroundColor: "color-mix(in srgb, var(--color-volt) 18%, transparent)"
    textColor: "{colors.current-text}"
    rounded: "{rounded.button}"
    padding: "10px 16px"
  button-danger:
    backgroundColor: "color-mix(in srgb, var(--color-red) 8%, transparent)"
    textColor: "var(--color-red)"
    rounded: "{rounded.button}"
    padding: "10px 16px"
  input:
    backgroundColor: "{colors.current-surface}"
    textColor: "{colors.current-text}"
    rounded: "{rounded.field}"
    padding: "10px 14px"
  chip:
    textColor: "{colors.current-sub}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  navigation:
    rounded: "{rounded.card}"
    width: "calc(100% - 24px)"
  card:
    backgroundColor: "{colors.current-surface}"
    textColor: "{colors.current-text}"
    rounded: "{rounded.card}"
    padding: "18px"
  stat-strip:
    backgroundColor: "{colors.current-surface}"
    textColor: "{colors.current-text}"
    rounded: "{rounded.card}"
---
# Design System: LifeApp — IMPULSO

## Overview

**Creative North Star: "El cuaderno con impulso"**

El papel cálido, las superficies suaves y la tinta oscura hacen legibles las tareas diarias. La lima aporta energía y dirección sin convertir cada bloque en una llamada a la acción. La misma identidad se adapta a noche cálida y negro OLED, conservando contraste y jerarquía.

La referencia visual aprobada es IMPULSO en Guia_Visual/CLAUDE-PROMPT.md y sus capturas; el producto conserva el nombre LifeApp. Impeccable documenta el sistema y frontend-design de Anthropic aporta el método de composición, jerarquía y acabado: ninguno sustituye los tokens implementados. Las pantallas son una PWA real, sin carcasa de teléfono ni status bar simulada.

**Key Characteristics:**

- Superficies cálidas y esquinas amplias.
- Títulos y cifras geométricos; lectura y controles discretos.
- Lima como firma; colores semánticos para datos.
- Tema global y navegación móvil equivalente entre módulos.

## Colors

La paleta combina lima eléctrica, tinta vegetal y neutros cálidos. El frontmatter recoge los valores efectivos de Cream y los fondos oscuros reutilizados. Las rampas tonales del sidecar son vistas auxiliares sintetizadas en OKLCH; no añaden tokens de producción ni sustituyen las variantes de tema. Los colores `primary`, `on-primary` y `current-*` son enlaces vivos a variables CSS; no son copias de la paleta. `src/contexts/ThemeContext.tsx` define todas las variantes y `src/styles/globals.css` aporta los valores previos al montaje.

### Primary

Volt firma progresos, estados seleccionados y superficies protagonistas. Volt Deep acompaña gradientes; Volt Soft suaviza fondos. La tinta Ink y el blanco forman el CTA en Cream; en Onyx y Abyss el CTA cambia a Volt con tinta. Usar siempre la pareja `--color-primary` / `--color-on-primary`.

### Secondary

Teal identifica salud y proteína; Amber, carbohidratos y aviso; el texto de macros usa `--color-amber-text`, una variante más profunda que la barra o el gráfico (`--color-amber`) en Cream y equivalente en Onyx/Abyss; Coral, grasa, gasto o peligro según contexto; Night añade el acento violeta; Money distingue ingresos positivos. Son variantes profundas en Cream y más luminosas en temas oscuros. El naranja heredado `acc-orange` conserva su función de acento de Físico y racha con una variante profunda legible en Cream. Los alias `acc-*` se mantienen por compatibilidad semántica; `acc-blue` ya no significa azul de marca. No extraer su antiguo nombre como una nueva identidad.

### Neutral

Paper y Surface forman el soporte claro; Surface Inset y Surface Deep agrupan campos y niveles interiores. Ink Soft y Muted rebajan información secundaria. Onyx usa noche vegetal y superficies cálidas; Abyss usa negro OLED y superficies casi negras. El borde tenue y el vidrio translúcido también cambian por tema.

La preferencia global es Claro (`cream`), Oscuro (`onyx`) o Negro OLED (`abyss`). Las instalaciones nuevas comienzan en Cream; se conserva una preferencia válida anterior. El proveedor publica variables, `data-theme` y `color-scheme` en `<html>` para que hojas, navegación y portales hereden la misma elección.

**The Tema Único Rule.** El tema elegido se aplica a toda la app y a los portales; Físico nunca fuerza oscuro por ruta.

## Typography

**Display Font:** Space Grotesk con Inter y sans-serif de respaldo.
**Body Font:** Inter con la pila del sistema.

Ambas familias se sirven en WOFF2 locales desde `public/fonts/`; Inter incluye las variantes latinas y extendidas. El alias heredado `--font-serif` apunta a la familia display. No implica una tercera familia. Inter usa las características `ss01` y `cv11`.

### Hierarchy

Display presenta el nombre y cifras protagonistas; Title, títulos de hoja; Section, grupos; Body, lectura; Secondary, contexto; Meta, anotaciones. Sus tamaños están en el frontmatter y corresponden a `--fs-*`. El título principal de página utiliza una variante observada (28 px, peso 600, interlínea 1.1) y se compacta al desplazarse (18 px). Los contadores de entrenamiento pueden superar la escala para facilitar la lectura durante una sesión. Los campos editables conservan un suelo propio (16 px).

**The Cifra Clara Rule.** Las cifras usan números tabulares; su significado se expresa con etiqueta y unidad, además del color.

La cabecera de Inicio presenta primero el nombre en display y debajo el saludo con fecha, en caja normal. Las tarjetas de programa presentan primero la rutina y después su contexto, con metadatos discretos (12 px, peso 500), sin convertirlos en un antetítulo.

Formato español en importes, fechas y unidades. Las etiquetas de datos compactas pueden usar mayúsculas; no convertirlas en encabezados decorativos añadidos.

## Layout

Contenido móvil en una columna, desde el ancho de referencia mínimo (360 px). El contenedor de desplazamiento `#sw` ocupa el espacio disponible, se centra y limita el ancho útil (880 px). La escala de separación parte de una unidad (4 px); las secciones combinan márgenes laterales compactos, aire vertical y tarjetas con relleno moderado según el frontmatter. Las rejillas de accesos y los campos emparejados conviven con listas y bloques de anchura completa.

La cabecera de módulo permanece visible y se compacta durante el scroll. Inicio conserva su cabecera de saludo en el flujo. La barra inferior flota centrada; su ancho máximo pasa de (480 px) a (520 px) en escritorio desde (720 px). El contenido reserva un colchón inferior (96 px más safe-area y `--nav-inset`). Las safe areas se resuelven en navegación y contenido, sin sumarlas otra vez a `<html>`.

Las hojas inferiores se portalan a `document.body`, limitan el ancho (480 px) y la altura (88dvh), permiten scroll propio y dejan espacio para el indicador inferior del sistema. En horizontal con poca altura (máximo 600 px), el chrome se compacta. No estirar una tarjeta a todo el escritorio ni incorporar un marco de dispositivo.

## Elevation & Depth

La profundidad mezcla niveles de superficie, bordes sutiles y sombras ambientales. Las tarjetas utilizan `--shadow-impulso`; su relieve es suave y cálido, sin desplazamiento duro. La navegación combina vidrio, blur (24 px), saturación y sombra flotante; las hojas incorporan velo y sombra superior. Las sombras exactas están en el sidecar, junto con su procedencia.

**The Superficie Compartida Rule.** Las cifras relacionadas viven en una superficie con divisores, sin multiplicar tarjetas por cada valor.

Los cambios de pestaña duran (0.22 s), las entradas de hoja usan desplazamiento breve y las entradas escalonadas usan la curva `cubic-bezier(0.22,1,0.36,1)`. La preferencia de movimiento reducido desactiva entradas y transiciones del chrome. Los detalles de progreso deben acompañar datos reales; no esconder contenido detrás de una animación.

La compactación de cabecera cambia sus medidas sin interpolar padding, margen o tamaño de letra. Las barras de datos conservan el movimiento pedido por la guía. El detector registra excepciones justificadas para estas barras y para las dos fuentes exigidas por la referencia; no son permiso para animar medidas estructurales en superficies nuevas.

## Shapes

Las tarjetas usan el radio amplio Card y las pestañas compactas la silueta Pill. Los controles React compartidos tienen radio Button y los campos compartidos radio Field; variantes CSS existentes usan radios intermedios (14–18 px) según densidad. No homogeneizar todos los objetos a una sola silueta. Los círculos quedan para controles de icono y anillos, las hojas redondean solo las esquinas superiores y los divisores siguen la geometría de su contenedor.

## Components

### Buttons

Acciones firmes con relleno y contraste global. El componente React compartido usa tamaño medio (10 px × 16 px), peso 600 y borde; sus variantes Ghost y Danger tiñen el fondo mediante la marca o el rojo semántico. Los CTAs de Físico y Nutrición son más amplios (14 px × 18 px). Hover reduce brillo, pulsación comprime ligeramente y el teclado recibe anillo de foco visible. La acción principal siempre usa la pareja de tokens del tema.

### Chips

Pestañas compactas en una fila con scroll horizontal. El estado seleccionado combina tinte y texto del color asignado; `aria-selected` expresa la selección. La variante de línea subraya la pestaña activa. Los chips de estado son informativos y no deben recibir efectos de botón si carecen de acción.

### Cards / Containers

Superficie del tema, borde tenue, esquinas amplias y sombra ambiental. El relleno común es moderado; las tarjetas con cabecera separan título y cuerpo mediante un divisor. Las estadísticas forman una rejilla de dos o tres columnas dentro de una sola superficie. Sus estados sin datos muestran guiones o un mensaje honesto, nunca métricas de muestra. El patrimonio utiliza una superficie Volt con tinta; su estado vacío ofrece añadir una cuenta sin inventar una evolución financiera.

### Inputs / Fields

Campos sobre Surface o Surface Inset, texto del tema, borde tenue y placeholder atenuado. El foco refuerza el borde y añade un halo de marca por `color-mix()`. El texto editable conserva tamaño suficiente para evitar zoom automático en iOS. La etiqueta visible explica el campo antes de que se escriba. Los objetivos táctiles mínimos son una exigencia del producto; algunos controles compactos heredados aún requieren revisión y no se convierten en patrón recomendado.

### Navigation

Cinco destinos equivalentes: Agenda, Físico, Inicio, Nutrición y Finanzas. Cada uno combina SVG de Lucide y etiqueta; el seleccionado usa la pareja primaria del tema. Inicio no sobresale ni cambia de tamaño. Hover refuerza texto, foco marca el acceso y pulsación comprime. Tocar de nuevo un módulo vuelve a su pantalla inicial. El chrome se retira al bajar y vuelve al subir sin afectar el centrado horizontal.

### Data surfaces and sheets

Nutrición agrupa calorías, anillo y macros; Físico agrupa sesión, cronómetro, ejercicios y series; Finanzas conserva su patrimonio y datos relacionados. Los acentos representan significado, no valores arbitrarios de la captura. Los accesos de áreas del Inicio usan Lucide; Biblioteca en Nutrición usa BookOpen. Estos iconos conservan su etiqueta visible. Las confirmaciones usan la hoja compartida; nunca diálogos nativos como sustituto del sistema visual. Los snippets del sidecar son muestras estáticas de primitivas reales; no conectan datos ni simulan lógica de producto.

## Do's and Don'ts

### Do:

- **Do** conservar LifeApp y todas las funciones al extender la identidad IMPULSO.
- **Do** usar las variables de tema para texto, superficies, CTAs y gráficos; aplicar color-mix() a los tintes.
- **Do** mantener inputs legibles (≥16 px), foco visible y objetivos táctiles (≥44 px).
- **Do** representar la falta de datos con estados vacíos y usar fotos del usuario solo cuando existan.
- **Do** mantener accesibles Hábitos, Notas, Comunidad, Útiles, Conta y todas las subpestañas existentes.

### Don't:

- **Don't** fijar un tema claro u oscuro por módulo; Físico respeta la preferencia global.
- **Don't** trasladar nombres, importes, métricas, clima, fotos o notificaciones ficticias de la guía a los datos de LifeApp.
- **Don't** usar lima como texto pequeño sobre blanco ni asumir que un acento de gráfico garantiza contraste de texto.
- **Don't** volver a familias DM hardcodeadas, emojis como iconos de navegación o un Inicio elevado sobre sus vecinos.
- **Don't** atrapar elementos fixed con -webkit-overflow-scrolling:touch ni contar dos veces la safe-area inferior.
