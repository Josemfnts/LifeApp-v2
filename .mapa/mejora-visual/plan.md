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

- [ ] **V1 · Chrome que reacciona al scroll** (global, sin tocar cada página)
      `.page-header` sticky dentro de `#sw`; al bajar >48 px se compacta (título 26→17 px, menos padding)
      y la barra inferior se desliza fuera al bajar y vuelve al subir / arriba / al final.
      Estado en `data-` del `<html>` (CSS puro, sin re-render). Inicio (TopBar) no es sticky.
      Lógica de dirección con histéresis en `src/lib/ui/scrollChrome.ts` con tests. `prefers-reduced-motion`.
- [ ] **V2 · Navegación compacta y sin duplicados**
      Componente `ChipTabs` (línea de chips/pestañas, sin tarjetas ni bordes gruesos). Físico: categorías y
      sub-pestañas pasan de botones con borde a una línea compacta. Finanzas: CSV sale de la cabecera a Movs.
- [ ] **V3 · Buscador y filtros bajo demanda**: donde haya buscador + filtros permanentes → icono 🔍 / ⚙ y
      hoja inferior (Movs ya lo hace: patrón a copiar). Revisar Físico › Ejercicios y Nutrición › Platos.
- [ ] **V4 · Inicio compacto**: saludo en una línea, nivel/racha como chips; el bloque editorial fuera.
- [ ] **V5 · Superficies**: menos tarjeta dentro de tarjeta; listas planas para información relacionada.
- [ ] **V6 · Tipografía y motion**: escala 28/22/16/14/12/11 en tokens; transiciones cortas de pestaña y hojas.

Cada fase: build + lint + tests, captura antes/después en 390×844 y prueba en prod. Commit y push por fase.
