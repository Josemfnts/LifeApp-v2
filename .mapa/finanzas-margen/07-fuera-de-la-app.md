# ¿Qué funciones de Margen NO se construyen dentro de la app, y qué se hace en su lugar?

Estado: resuelto
Tipo: investigar

## Respuesta
- **Widget de iPhone** → una PWA no puede tener widgets. Lo cubrirá la idea "Atajos iOS" de
  `Pendiente implementar/` (un atajo que lee el patrimonio). No en este esfuerzo.
- **Recap y asesor con IA** → la app no llama a LLMs. Se entrega `buildFinanceContext()`
  (`lib/finance/context.ts`): JSON compacto (patrimonio, variación 1M/3M/1A, top categorías vs media
  6 meses, presupuestos desviados, tasa de ahorro, próximos cargos, composición). Lo consumirá
  CompAI / la idea "Agente personal", que cruza dinero + entreno + hábitos.
- **Importación con IA de PDFs** → CompAI, cuando exista la necesidad.
- **Amigos y cuentas compartidas** → no: la app es single-user. "Compartir gasto" se hace
  partiendo el movimiento y generando pufos (lo que ya existe).
- **Inmuebles con índice INE automático** → de momento % anual manual (Niebla).

Por qué: son las piezas que exigen servidor, claves o multiusuario; el resto de Margen es cómputo
local y cabe entero en la PWA.
