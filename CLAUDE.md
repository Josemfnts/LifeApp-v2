@AGENTS.md

## Para el arquitecto
- Estado: ESTADO.md · Decisiones: DECISIONES.md (append-only) · Planes: .mapa/ y docs/relevos/.
- Historia y detalle de cada módulo (espejo vivo, conector de relojes, Margen, Conta, rediseño IMPULSO): docs/agentes/CONTEXTO.md, por tramos.
- AGENTS.md es del ejecutor: estable y ≤ 6.000 caracteres; dev-mcp no lanza encargos si no cumple el estándar (`node /home/josema/CompAI/dev-mcp/agents-lint.mjs .`). Lo fechado va a DECISIONES.md, el estado a ESTADO.md.
- Contratos: declara `rojo_esperado`; el pre-vuelo de dev-mcp devuelve sin gastar ejecutor la aceptación que no puede pasar.
- Trabajo a dos manos: GitHub es el punto de encuentro; commit por tarea lógica y push al terminar.
