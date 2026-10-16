# LifeApp

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Josema, desarrollador senior en Zaragoza, usa una PWA personal desde el móvil y varios dispositivos. La app también admite cuentas independientes.

## Product Purpose

Reunir agenda, turnos, tareas, hábitos, notas, entrenamientos, nutrición, finanzas y comunidad en un cuaderno de vida conectado a su asistente CompAI.

## Operating Context

Uso frecuente desde móvil, incluida PWA instalada en iOS. La navegación principal contiene Agenda, Físico, Inicio, Nutrición y Finanzas. Hábitos, Notas y Comunidad siguen siendo accesibles. Las funciones existentes, incluidos XP, objetivos, importaciones, contabilidad por proyecto y cuotas, deben conservarse.

## Capabilities and Constraints

React 19, TypeScript, Vite, Tailwind 4, Zustand y Supabase. Arquitectura local-first con espejo vivo y control de versión; Notas, Comunidad y Salud requieren sesión. Este rediseño no modifica datos, formatos, sincronización, reglas de negocio ni esquemas. No migra a Next.js. Sin nuevas dependencias de runtime. El tema es GLOBAL: el usuario elige Claro / Oscuro / Negro OLED para toda la app y se respeta en todos los módulos, incluido Físico. Ningún módulo fuerza un tema por ruta.

## Brand Commitments

El 16/10/2026 Josema confirmó mantener el nombre LifeApp y todas las funciones, usando IMPULSO como referencia visual. Referencia entregada: Guia_Visual/CLAUDE-PROMPT.md y diez capturas de pantallas, más showcase. El idioma sigue siendo español.

## Evidence on Hand

Guia_Visual contiene un concepto visual con datos ficticios. Sus nombres, importes, clima, localizaciones y métricas no son datos de Josema ni deben aparecer como datos reales. AGENTS.md documenta capacidades y restricciones. No se incorporan datos reales de clientes al repo público.

## Product Principles

- Conservar las funciones y datos existentes durante el cambio visual.
- Priorizar tareas reales desde móvil sobre la presentación del mockup.
- Mostrar estados vacíos honestos cuando no existan datos.
- Mantener accesibles las funciones que no aparecen en las referencias.
