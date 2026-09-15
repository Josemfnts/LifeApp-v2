# ¿Cómo se prueba un motor financiero en una app sin tests?

Estado: resuelto
Tipo: investigar

## Respuesta
Tests con el **runner nativo de Node** (`node:test` + `node:assert/strict`, type stripping de
TypeScript), **sin dependencias**: `npm test` =
`node --test --experimental-strip-types "src/lib/finance/**/*.test.ts"`. Alcance limitado a
`src/lib/finance/**`: dinero, patrimonio, snapshots, amortización, parser N43/CSV, dedupe, P&L de
lotes, detección de recurrentes, reparto de gastos. La UI se verifica en navegador.

Consecuencias en el código de `src/lib/finance/`: imports relativos con extensión `.ts` (nunca el
alias `@/`), `import type` para tipos y solo sintaxis TS borrable (sin enums/namespaces). Los
`*.test.ts` se excluyen de `tsconfig.app.json`.

Por qué: el dinero tiene que cuadrar al céntimo y son funciones puras; los tests son la única
forma de que "hecho" signifique algo sin revisar a mano cada cálculo.

Historia: la primera versión de esta decisión elegía **vitest**. El 2026-09-15 el intento de F0 no
consiguió instalarlo en la máquina (npm lo declaraba en el lock pero no lo materializaba en
node_modules) y dejó node_modules borrado. Se cambió a `node:test` para no depender de instalar
nada.
