# LifeApp — sistema visual IMPULSO

Estado: dirección aprobada el 16/10/2026; implementación por fases en `.mapa/rediseno-impulso/mapa.md`. La guía elegida por Josema manda sobre alternativas generadas. No se cambia el producto.

## Referencias

`Guia_Visual/CLAUDE-PROMPT.md` aporta los tokens. Las capturas 01–10 aportan composición, jerarquía y estados. La 11 es un showcase, no una pantalla de producto. No construir una carcasa de teléfono ni una landing.

## Tokens y temas

- Marca volt: `#C9F43C`; profundidad `#8FCE12`; superficie suave `#EFF8D2`.
- Tinta: `#181B10`; secundaria `#4A4E3C`; papel: `#F4F3EB`; superficie clara `#FFFFFF`.
- Noche Físico: `#0D0F08`; superficies oscuras cálidas `#171B10` y `#22271A`.
- Datos: teal `#2FB8A6`, amber `#F0A22E`, coral `#F26D5B`, night `#9B7BF0`, ingreso `#1FA45B`.
- Los acentos de datos tienen variantes de texto con contraste AA sobre papel. La lima nunca se usa como texto pequeño sobre blanco. CTA claro: tinta con texto blanco/lima; CTA nocturno: lima con tinta. Aliases legacy deben mantener su semántica y legibilidad.
- Cream adopta el papel; Onyx/Abyss siguen disponibles con la misma marca. **Ningún módulo fuerza tema**: el usuario elige Claro / Oscuro / Negro OLED para TODA la app, incluido Físico. La captura de Físico en la guía es solo un ejemplo del tono oscuro, no una regla. Las portales a body (modales, toast, nav-bar fija) heredan el tema GLOBAL vía `color-scheme` + `data-theme` en `<html>`.

## Tipografía

Inter para texto/controles; Space Grotesk para títulos, cifras, cronómetros y balances. Fuentes en woff2 locales si es viable; sin dependencia de Next.js ni nueva librería. El alias legacy serif pasa a display para cubrir utilidades existentes; sustituir familias DM hardcodeadas en las superficies intervenidas. Cifras tabulares. Jerarquía aproximada móvil: título 28–32 px, sección 17–18, cuerpo 14–15, secundario 12–13. Inputs ≥16 px para evitar zoom iOS. No reducir legibilidad para calcar capturas.

## Geometría y profundidad

Tarjetas blancas de radio 24 px, padding 16–20 px, sombra suave de la referencia. Superficies agrupadas para cifras relacionadas. Píldoras para pestañas y navegación. Separación entre secciones 20–24 px. No apilar nuevas reglas contradictorias al final de globals.css: editar reglas existentes o añadir clases específicas del componente.

## Navegación y estados

Barra flotante de cinco destinos equivalentes: Agenda, Físico, Inicio, Nutrición, Finanzas. Todos, incluido Inicio, usan estado activo y aria-current correctos; sin botón Inicio elevado ni emoji. Navegación compacta interna por ChipTabs. Conservar el comportamiento de volver al inicio del módulo al tocar su acceso.

Foco visible, etiquetas accesibles para iconos, objetivos táctiles ~44 px y estados vacíos honestos. Respeto de prefers-reduced-motion. Conservar chrome al scroll, lazy-loading, safe areas y modales fuera de contenedores que atrapan fixed. El contenido termina por encima de la barra flotante.

## Contrato por superficie (modo Operate)

- Inicio: saludo y acceso a ajustes; resumen real del día con progreso y accesos 2×2; racha/XP y registro rápido real; Hábitos/Notas/Comunidad claramente accesibles. Conservar objetivos y herramientas existentes. No añadir clima o pasos sin fuente real.
- Agenda: calendario sobre papel, selección tinta/lima, códigos de turno y lista del día; conservar edición de turnos, semana, estadísticas, Kanban, Planes y Notas.
- Físico: noche cálida, pestañas lima, entrenamiento y series legibles, CTAs lima; conservar historial, rutinas, ejercicios, running, movilidad y Salud sin inventar métricas.
- Nutrición: calorías y macros protagonistas, lista de comidas real; usar fotos del usuario cuando existan y estados sin foto cuidados; conservar scanner, alimentos, platos, menús y progreso.
- Finanzas: hero lima de patrimonio real, balance/ingreso/gasto agrupados, categorías y listas ordenadas; seis pestañas incluidas Útiles y Conta. Cálculos permanecen en el motor existente.
- Hábitos, Comunidad, Notas, Login y hojas: misma identidad; mantener editor full-screen, gates, preferencias, auth y acciones.

## Adaptación y movimiento

La referencia representa contenido de una PWA móvil, sin status bar artificial. Móvil desde 360 px, escritorio a 1440 px con contenido centrado y ancho útil razonable; nada de estirar una tarjeta a toda la pantalla. Transiciones cortas en pestañas, hojas y progreso. No simular push de eventos inexistentes ni secuencias decorativas que oculten contenido.

## Verificación

Build, oxlint y suite node:test. Inspección conjunta móvil/escritorio con captura de Inicio, Agenda, Físico, Nutrición y Finanzas; estados activo/vacío, scroll y hojas representativas. Revisión de código independiente. El alcance financiero no toca stores, motores, persistencia, tipos de datos ni formatos consumidos por CompAI.
