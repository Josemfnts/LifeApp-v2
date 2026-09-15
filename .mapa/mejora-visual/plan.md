# Plan — Mejora visual global ("la interfaz se adapta al contexto y al scroll")

Fecha: 2026-09-15 · Autor: Claude · Decide: Josema · Fuente: `Pendiente implementar/Mejora visual/MejoravisualInforme.txt`

## Diagnóstico (medido en prod, iPhone 390×844, 2026-09-15)

| Pantalla | Cabecera | Barra inferior | Chrome fijo | Notas |
|---|---|---|---|---|
| Inicio | 187 px | 67 px | 30 % | saludo + racha + nivel + fecha: bloque editorial grande |
| Físico | 114 px | 67 px | 21 % + sub-pestañas | categorías como 4 botones grandes con borde + 5 sub-pestañas también en botones con borde |
| Finanzas | 110 px | 67 px | 21 % | pestañas + botón CSV en la cabecera + segmentos internos |
| Agenda / Nutrición | 110 px | 67 px | 21 % | pestañas en línea (ya correctas) |

Hoy la cabecera se va con el scroll (no es sticky) y la barra inferior está SIEMPRE: al bajar pierdes
las pestañas y la barra sigue comiendo 67 px. Físico apila dos filas de "botones" para navegar.

## Principio

En reposo orienta; al hacer scroll se compacta; al volver arriba reaparece. Ninguna función se quita.

## Fases

- [x] **V1 · Chrome que reacciona al scroll** (global, sin tocar cada página)
      (2026-09-15, 0a8c632. Verificado en local con página larga y en prod en Finanzas con datos: al bajar la cabecera
      110→79 px y la barra sale de pantalla; al subir vuelve; arriba se expande; al final la barra se ve.)
      `.page-header` sticky dentro de `#sw`; al bajar >48 px se compacta (título 26→17 px, menos padding)
      y la barra inferior se desliza fuera al bajar y vuelve al subir / arriba / al final.
      Estado en `data-` del `<html>` (CSS puro, sin re-render). Inicio (TopBar) no es sticky.
      Lógica de dirección con histéresis en `src/lib/ui/scrollChrome.ts` con tests. `prefers-reduced-motion`.
- [x] **V2 · Navegación compacta y sin duplicados**
      (2026-09-15, 51980d0. Físico en local; CSV en Movs verificado en prod: descarga lifeos-finanzas-*.csv.)
      Componente `ChipTabs` (línea de chips/pestañas, sin tarjetas ni bordes gruesos). Físico: categorías y
      sub-pestañas pasan de botones con borde a una línea compacta. Finanzas: CSV sale de la cabecera a Movs.
- [x] **V3 · Buscador y filtros bajo demanda**: donde haya buscador + filtros permanentes → icono 🔍 / ⚙ y
      hoja inferior (Movs ya lo hace: patrón a copiar). Hecho en Físico › Rutinas › Biblioteca (3 selects + buscador
      fijos → 🔍 y ⚙ con insignia y hoja de chips). Revisados y se quedan: el selector de ejercicio (ya es una hoja),
      los grupos de Ejercicios (una línea de chips) y Nutrición › Platos (un solo buscador, es el contenido).
- [x] **V4 · Inicio compacto**: saludo + fecha en una línea, ajustes a la derecha, racha y nivel como chips.
      Cabecera 187 → 125 px. V3 y V4 verificados en prod (753d5e4): Inicio 125 px; filtro Gimnasio 16 → 8 rutinas, 0 errores.
- [x] **V5 · Superficies**: menos tarjeta dentro de tarjeta; listas planas para información relacionada.
      `.stat-strip` (varias cifras = una superficie con divisores): Físico › Hoy (kg/series/sesiones) y el resumen de
      mes/última sesión. «Mis rutinas» de Iniciar sesión pasa a lista plana con divisores. Finanzas › Inicio: el
      selector de mes sin tarjeta y ingresos/gastos como columnas dentro del balance. Verificado en local.
- [x] **V6 · Tipografía y motion**: tokens `--fs-display/title/section/body/secondary/meta` (28/24/16/14/12/11) y
      `.page-title` a 24 px. `.animate-tab`, `.animate-fadeIn` y `.animate-slideUp` se usaban SIN definir (ni el cambio
      de pestaña ni las hojas se animaban): definidas; contenido de pestaña con `key` + fade corto en Finanzas,
      Físico, Nutrición, Agenda y Hábitos; `:active` en pestañas; todo desactivado con `prefers-reduced-motion`.
      Verificado en local (animationName tabIn / slideUp, 0 errores).

Cada fase: build + lint + tests, captura antes/después en 390×844 y prueba en prod. Commit y push por fase.
