# Órdenes para OpenCode — Tanda 3: relojes (Garmin/Amazfit) — actividades + salud

Definido por Claude Code (arquitecto), lo implementa OpenCode. Claude audita/pule después.
Reglas del repo en `AGENTS.md` (léelo). **Verificación por tarea:** `npm run build` (tsc) + `npm run lint`
verdes, y E2E real con Playwright sobre `vite preview` (mira las capturas). **Commit por tarea + push a main.**
Invariantes: claves de localStorage desde `src/lib/storageKeys.ts` (nunca literales); nada de `confirm()`/
`prompt()` nativos (usa `<ConfirmDialog>` de components/ui); colores `var(--color-*)`; producto en ESPAÑOL.

## Contexto (investigación ya hecha — respeta estos límites, NO intentes más)
- **Amazfit/Zepp NO tiene API pública** (ni actividades ni salud). Solo exporta ficheros (GPX/TCX) y sincroniza
  a Strava/Apple Health/Google Fit.
- **Garmin** exige aprobación de partner + backend + webhooks para su API → NO se hace ahora.
- **Strava** (que cubriría ambos relojes) y **Garmin Health API** necesitan credenciales de Josema + un backend
  serverless → **NO los empieces**. Se montan aparte con Josema y Claude.
- **Apple Health**: una PWA en iOS no puede leerlo. **Google Fit REST**: deprecándose. No los uses.
- **Lo que SÍ se puede hacer ahora, solo cliente, sin backend ni credenciales → TUS TAREAS W1 y W2.**

Datos destino existentes: `RunRecord` en `src/stores/fisicoStore.ts` (`{id,date,distance(km),timeSeconds,hr?,
elevation?,type,notes}`, clave `fisico_runs`). El peso corporal ya vive en `nutriStore.bodyMetrics` (no lo dupliques).

---

## W1 — Importar actividades desde fichero GPX/TCX (Físico > Running)  ·  cubre Garmin Y Amazfit
**Qué:** botón "Importar actividad" en `RunningTab` (`src/pages/Fisico.tsx`) con `<input type="file" accept=".gpx,.tcx">`.
Al elegir fichero, parsear en cliente con `DOMParser` (sin dependencias) y crear uno o varios `RunRecord`.
**Cómo parsear:**
- **TCX** (XML): `Activity` → sumar `Lap/TotalTimeSeconds` (tiempo) y `Lap/DistanceMeters` (o última `Trackpoint/DistanceMeters`)
  para distancia; FC media = media de `Trackpoint/HeartRateBpm/Value`; desnivel+ = suma de subidas de `AltitudeMeters`;
  fecha = primer `Trackpoint/Time` (o `Lap@StartTime`).
- **GPX** (XML): `trk/trkseg/trkpt` con `@lat @lon`, `time`, `ele`, y FC en `extensions` (`gpxtpx:hr` o `hr`). Distancia =
  suma de haversine entre trkpts; tiempo = último `time` − primer `time`; desnivel+ = suma de subidas de `ele`;
  FC media = media de los hr; fecha = primer `time`.
- Mapear a `RunRecord`: `{ id: Date.now(), date: 'YYYY-MM-DD', distance: km con 1 decimal, timeSeconds, hr: media|undefined,
  elevation: desnivel+|undefined, type: 'easy', notes: 'Importado (nombre_fichero)' }`. Añadir con el add de runs del store.
- **Antes de guardar, previsualizar** (hoja/modal con km, tiempo, ritmo /km, FC) y confirmar. **Evitar duplicados**: si ya
  existe un run con misma fecha y distancia ±0.1 km, avisar y no duplicar.
- **FIT** (binario): NO ahora. Si el usuario elige `.fit`, toast "FIT aún no soportado; exporta la actividad como GPX o TCX".
**Aceptación:** importar un GPX y un TCX de ejemplo (genéralos tú para el E2E) crea el run con distancia/tiempo/FC correctos;
el duplicado se evita; el `.fit` avisa. Físico > Running muestra la carrera importada.

## W2 — Salud diaria manual (pasos, sueño, FC reposo, kcal activas)  ·  cualquier reloj, sin API
**Qué:** registro manual de salud diaria + tendencias. Es el baseline que funciona con cualquier reloj (lees el reloj y lo metes).
**Dónde/cómo:**
- `storageKeys.ts`: añadir `health_daily: 'health_daily'`.
- Store nuevo (`src/stores/healthStore.ts`, patrón Zustand como los demás, `loadFromStorage/saveToStorage`):
  `health: Record<string /*YYYY-MM-DD*/, { steps?: number; sleepHours?: number; restingHr?: number; activeKcal?: number }>`
  con `setHealth(date, patch)` que hace merge por fecha y persiste.
- UI: una tarjeta **"Salud de hoy"** en el Dashboard (`src/pages/Dashboard.tsx`), autocontenida, con inputs rápidos
  (Pasos, Sueño h, FC reposo, Kcal activas) que guardan el día de hoy, y **mini-gráficas de tendencia** de los últimos ~14
  días (sparkline SVG, mismo estilo que "Progreso por ejercicio" de Físico). Mostrar también el último **peso** desde
  `nutriStore.bodyMetrics` (solo lectura, con enlace a Nutrición para registrarlo; NO dupliques el peso).
**Aceptación:** meter pasos/sueño/FC de hoy persiste y aparece en la tendencia; el peso se lee de bodyMetrics; build+E2E OK.

---

## FUERA DE ESTA TANDA — NO EMPEZAR (necesitan a Josema + Claude)
- **Strava** (hub que cubre Garmin+Amazfit para ACTIVIDADES): OAuth2 + secretos + serverless. Lo montan Josema y Claude.
- **Garmin Health API** (única vía de SALUD automática, solo Garmin): partner approval + backend + webhooks. Josema debe
  solicitar el acceso de developer de Garmin cuanto antes (tarda). No lo implementes.
- **Amazfit salud automática**: no viable por API. No lo intentes.

## Al terminar
Deja el árbol limpio, todo pusheado, y dile a Josema qué cerraste (W1/W2) para que Claude haga pull + auditoría + pulido.
