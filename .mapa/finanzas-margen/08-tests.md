# ¿Cómo se prueba un motor financiero en una app sin tests?

Estado: resuelto
Tipo: investigar

## Respuesta
Se añade **vitest** (devDependency, `npm test` = `vitest run`) con alcance limitado a
`src/lib/finance/**/*.test.ts`: dinero, patrimonio, snapshots, amortización, parser N43/CSV,
dedupe, P&L de lotes, detección de recurrentes, reparto de gastos. La UI se verifica en navegador.

Por qué: el dinero tiene que cuadrar al céntimo y son funciones puras; los tests son la única
forma de que "hecho" signifique algo sin revisar a mano cada cálculo. No se testea UI para no
meter jsdom/RTL en una app que no los tenía.
