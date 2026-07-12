# Órdenes para OpenCode — Tanda 3: relojes (Garmin/Amazfit)

Definido por Claude Code, lo implementa OpenCode. Claude audita/pule después. Reglas en `AGENTS.md`.
**Verificación por tarea:** `npm run build` (tsc) + `npm run lint` verdes + E2E Playwright sobre `vite preview`
(mira las capturas). **Commit por tarea + push a main.** Invariantes: claves de localStorage desde
`src/lib/storageKeys.ts`; nada de `confirm()`/`prompt()` nativos (usa `<ConfirmDialog>`); colores `var(--color-*)`;
producto en ESPAÑOL.

## OBJETIVO: datos CONECTADOS (automáticos), no manuales
Josema quiere que actividades Y salud (sueño/pasos/FC/estrés) entren **conectados** del reloj, sin meterlos a mano.

### Realidad (investigado — respétala)
- **Conectado necesita BACKEND** (serverless): OAuth con secretos y webhooks NO caben en una PWA cliente. Sin backend
  no hay conexión automática. Ese backend + las credenciales los aporta Josema con Claude → **NO es tu parte (OpenCode).**
- Camino elegido para lo conectado (lo montan Josema + Claude, NO tú): **agregador de salud (Terra API o Vital)** →
  partner oficial de Garmin (nos saltamos su aprobación), unifica dispositivos; Garmin directo, Amazfit vía Google Fit;
  empuja los datos por webhook a una **Supabase Edge Function**, que los guarda en Supabase.

### TU PARTE AHORA (OpenCode) — solo W1
Lo único 100% cliente y útil ya. El resto (conexión) lo hacen Josema + Claude con el backend.

## W1 — Importar actividades desde fichero GPX/TCX (Físico > Running)
Vale como complemento (importar un entreno suelto) mientras montamos la sincronización automática.
**Qué:** botón "Importar actividad" en `RunningTab` (`src/pages/Fisico.tsx`) con `<input type="file" accept=".gpx,.tcx">`.
Parsear en cliente con `DOMParser` (sin deps) y crear `RunRecord`(s) en `fisicoStore` (clave `fisico_runs`).
**Cómo parsear:**
- **TCX**: `Activity` → tiempo = suma `Lap/TotalTimeSeconds`; distancia = suma `Lap/DistanceMeters` (o última
  `Trackpoint/DistanceMeters`); FC media = media de `Trackpoint/HeartRateBpm/Value`; desnivel+ = suma de subidas de
  `AltitudeMeters`; fecha = primer `Time`.
- **GPX**: `trk/trkseg/trkpt @lat @lon` con `time`, `ele`, FC en `extensions` (`gpxtpx:hr`/`hr`). Distancia = suma
  haversine; tiempo = último−primer `time`; desnivel+ = subidas de `ele`; FC media = media de hr; fecha = primer `time`.
- Mapear a `RunRecord`: `{ id: Date.now(), date, distance: km 1 decimal, timeSeconds, hr: media|undefined,
  elevation: desnivel+|undefined, type: 'easy', notes: 'Importado (fichero)' }`.
- **Previsualizar** (km, tiempo, ritmo/km, FC) y confirmar antes de guardar. **Evitar duplicados** (misma fecha y
  distancia ±0.1 km → avisar, no duplicar). **FIT** (binario): NO ahora; si eligen `.fit`, toast "exporta como GPX/TCX".
**Aceptación:** importar un GPX y un TCX de ejemplo (genéralos para el E2E) crea el run con distancia/tiempo/FC
correctos, evita duplicados, y avisa con `.fit`.

## NO EMPIECES (Josema + Claude, con backend + credenciales)
- **Conexión conectada** (Terra/Vital + Supabase Edge Function + tabla `health_metrics` con RLS): actividades y salud
  automáticas de Garmin y Amazfit. NO lo hagas: necesita las keys del agregador y el backend.
- **Strava directo, Garmin Health API directo, Apple Health, Google Fit REST**: descartados o pospuestos; no los toques.
- **Registro manual de salud**: descartado (Josema lo quiere conectado, no manual). NO lo implementes.

## Al terminar
Árbol limpio, W1 pusheado, y avisa a Josema para que Claude haga pull + auditoría.
