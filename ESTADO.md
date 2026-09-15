# ESTADO — lifeapp

> Por donde va el proyecto AHORA. Lo reescribe quien termina una fase (Claude, OpenCode
> o Josema). Si algo de aqui ya no es verdad, se corrige: este fichero manda sobre la
> memoria de cualquier agente. Sembrado el 2026-09-09.

## Que es
LifeApp v2 — el cuaderno de vida de Josema (turnos, tareas, finanzas, habitos, diario, nutricion) y futura casa de su asistente personal. FUENTE DE VERDAD de su vida: CompAI la lee via life-mcp. PRIORIDAD ALTA.
Stack real: React 19 + Vite 8 + Zustand + Supabase (store_data key-value). Ver AGENTS.md.

## Piezas
- (una sola app) + `connector/` (Python, relojes, corre en el mini PC)

## Hecho
- Modulos Agenda/Notas/Habitos/Fisico/Nutricion/Finanzas/Comunidad, espejo vivo con CompAI, conector de relojes (ver AGENTS.md §Estado).

## A medias
- **Finanzas "Margen"** (2026-09-15): replicar todas las funciones de Margen en Finanzas.
  Plan y decisiones en `.mapa/finanzas-margen/` (mapa.md = indice, plan.md = fases F0-F6 con casillas).

## Lo siguiente
- Ejecutar F0→F6 del plan de Finanzas (la primera casilla sin marcar en plan.md).
- Ideas aparcadas en `Pendiente implementar/`: Agente personal, Atajos iOS, Mejora visual global.

## Cuidado con
- life-mcp (fuera del repo) lee/escribe finances_*: no cambiar la forma de campos existentes; lo nuevo va en campos opcionales o claves nuevas.
