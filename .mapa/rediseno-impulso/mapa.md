# Rediseño visual basado en IMPULSO

## Destino

LifeApp aplica la identidad visual de Guia_Visual a su interfaz real, con todas sus funciones conservadas y validación móvil y escritorio. Build, lint y tests verdes, cambios revisados y publicados.

## Notas

Referencia vinculante: Guia_Visual/CLAUDE-PROMPT.md y capturas 01–10. El showcase es presentación y los marcos de teléfono no forman parte de la app. OpenCode implementa por entregas pequeñas; Codex define, revisa y verifica. No cambiar persistencia ni motores. No incorporar datos ficticios de la referencia como datos del usuario.

## Decisiones tomadas

- [Identidad y alcance](01-identidad.md): LifeApp mantiene nombre y todas las funciones (Josema, 16/10/2026).
- [Aplicación de la referencia](02-aplicacion.md): crema/lima, fuentes y geometría de IMPULSO; tema GLOBAL elegible (Claro / Oscuro / Negro OLED); las funciones adicionales heredan el sistema.

## Entregas

- [x] Base visual (2026-10-16): tokens, tipografía, temas, shell, navegación y componentes comunes.
- [ ] Inicio y Agenda: nueva jerarquía y componentes usando datos y acciones reales.
- [ ] Físico y Nutrición: aplicación de las capturas a estados y flujos existentes.
- [ ] Finanzas y cobertura: seis pestañas, Hábitos, Comunidad, Notas y Login.
- [ ] Revisión final: capturas móvil/escritorio, navegación, acciones representativas, build/lint/tests y documentación.

## Niebla

Ninguna decisión de producto bloquea la ejecución. Las diferencias entre mockup y datos reales se resuelven conservando los flujos actuales y sin inventar capacidades (clima, recomendaciones médicas o push simulados).

## Verificado por entrega

- Base `a92b597` y corrección `c6430bd`: contratos build/lint/306 tests verdes. La corrección elimina el tema por ruta y adapta los tres temas a IMPULSO. Revisión de código y comprobación visual pendientes de cierre.
- Inicio y Agenda en ejecución: `job_mvb9e50tal8d`. El ejecutor no modifica memoria ni planes; los actualiza Codex arquitecto.
