# Órdenes para OpenCode — tanda de mejoras (2026-07-11)

Estas tareas las define Claude Code (arquitecto) y las implementa OpenCode. Al terminar cada una:
**commit por tarea** con mensaje claro + **push a main**. Claude Code hará una **auditoría y pulido
final** de todo después. Reglas del repo en `AGENTS.md` (léelo antes).

**Verificación obligatoria por tarea** (no marques "hecho" sin esto):
- `npm run build` verde (hace `tsc -b`; si falla, no compila) y `npm run lint` sin errores nuevos.
- Smoke E2E real con Playwright sobre `vite preview` (no `dev`) y **mirar las capturas**.
- Para flujos con sesión (Comunidad): usuario confirmado por admin API de Supabase, y **borrarlo al terminar**
  (receta en `AGENTS.md` §Gotchas). Token `sbp_` y ref del proyecto en la memoria de CompAI.

**Invariantes que NO se rompen** (causa de bugs pasados):
- Claves de `localStorage` SIEMPRE desde `src/lib/storageKeys.ts` (`STORE_KEYS`), nunca literales.
- Nada de `confirm()`/`prompt()` nativos: usar `<ConfirmDialog>` (`components/ui`) o una hoja propia.
- Colores por `var(--color-*)`, no hex sueltos.
- Producto y comentarios en **español**.

---

## T1 — Nutrición: etiquetas de dificultad legibles  ·  RÁPIDA
**Qué:** las recetas muestran la dificultad cruda (`facil`, `muy_facil`, `media`, `dificil`). Debe verse
`Fácil`, `Muy fácil`, `Media`, `Difícil` (sin guión bajo, primera en mayúscula).
**Dónde:** `src/data/recipesDB.ts` (o donde estén las dificultades) + `src/pages/Nutricion.tsx`
(pestaña **Platos** > Biblioteca: el desplegable de dificultad y la línea de la tarjeta "5min · muy_facil · …").
**Cómo:** crear un mapa `DIFFICULTY_LABELS: Record<string,string>` y un helper `difficultyLabel(x)`; usarlo en
el `<option>` del filtro y en el render de la tarjeta. NO cambiar los valores guardados, solo la presentación.
**Aceptación:** el desplegable dice "Muy fácil" y la tarjeta también; el filtrado sigue funcionando.

## T2 — Login: logo grande e integrado, sin subtítulo  ·  RÁPIDA (visual)
**Qué:** el logo del login se ve pequeño y "pegado" (cuadro negro que desentona). Debe ser **mucho más grande**
y con el fondo del icono **del mismo color que la pantalla** para que se integre. Eliminar el texto
**"Tu sistema de vida"**.
**Dónde:** `src/pages/Login.tsx`.
**Cómo:** aumentar el tamaño del logo (usar el png del icono a mayor tamaño, sin recuadro de fondo distinto —
o fondo transparente/`var(--color-bg)`); quitar el `<div>`/texto del subtítulo. Mantener "Life OS".
**Aceptación:** logo grande, sin recuadro que desentone, sin "Tu sistema de vida". Login sigue funcionando.

## T3 — Físico > Running: campo de fecha proporcionado  ·  RÁPIDA (visual)
**Qué:** en "Registrar carrera" el `<input type="date">` ocupa todo el ancho y queda desproporcionado.
**Dónde:** `src/pages/Fisico.tsx`, componente `RunningTab`.
**Cómo:** meterlo en la rejilla con los demás campos (o darle el mismo alto/estilo compacto que Distancia/Tiempo).
Que visualmente cuadre con el resto del formulario.
**Aceptación:** la fecha se ve del mismo tamaño y estilo que los otros campos, sin destacar.

## T4 — Finanzas: mover calculadora de interés compuesto a "Análisis" + etiquetas  ·  RÁPIDA
**Qué:** la calculadora de interés compuesto está fuera de sitio (en Presupuesto/recurrentes). Moverla a la
pestaña **Análisis**. Y cada casilla debe tener su **etiqueta** (hoy son 4 inputs sueltos: 1000 / 7 / 10 / 100).
**Dónde:** `src/pages/Finanzas.tsx` (buscar el bloque "INTERÉS COMPUESTO"; mover al componente de la pestaña Análisis).
**Cómo:** etiquetas: **Capital inicial (€)**, **Interés anual (%)**, **Años**, **Aportación mensual (€)**
(confirmar el orden real de los inputs en el código y etiquetar en consecuencia). Poner un `<label>`/título encima
de cada input, estilo `sec-label`/`Field`.
**Aceptación:** la calculadora aparece en Análisis (no en Presupuesto) y cada casilla dice qué es.

## T5 — Comunidad: mostrar todos los usuarios al abrir el buscador  ·  MEDIA
**Qué:** al abrir 🔍 "Buscar usuarios" está vacío hasta escribir. Debe listar **todos los usuarios registrados**
de primeras (más nuevos primero), y el buscador filtra sobre eso.
**Dónde:** `src/lib/social.ts` (+ `src/components/social/UserSearch.tsx`).
**Cómo:** añadir `listAllUsers(limit = 50): Promise<Profile[]>` → `social_profiles` `order('created_at',{ascending:false}).limit(50)`.
En `UserSearch`, cargarla al montar y mostrarla; al escribir, usar `searchUsers` (ya existe y está saneado).
Mantener el debounce ya presente.
**Aceptación:** al abrir el buscador aparecen los perfiles; al teclear, filtra; sin errores de consola.

## T6 — Nutrición > Metas: calculadora de macros + kg/semana  ·  MEDIA
**Qué:** en **Metas** añadir una calculadora de macros según parámetros (peso, altura, edad, sexo, actividad,
objetivo) que rellene kcal/proteína/carbos/grasa; y que estime los **kg perdidos/ganados por semana** según el déficit/superávit.
**Dónde:** `src/pages/Nutricion.tsx` (pestaña **Metas** = `GoalsTab`). Reutilizar la lógica que YA existe en
`src/stores/nutriStore.ts` (`setMacroCalc` calcula TDEE/macros con Mifflin-St Jeor; hoy vive en Herramientas).
**Cómo:** UI en Metas con los inputs; al calcular, mostrar kcal/P/C/G y un botón "Aplicar a mis metas"
(`setGoals`). Añadir el cálculo de kg/semana: `(TDEE - kcal_objetivo) * 7 / 7700` (≈7700 kcal por kg de grasa);
mostrar "≈ X kg/semana" con signo. Mantener la de Herramientas o moverla, a tu criterio, pero que en Metas esté.
**Aceptación:** en Metas se pueden meter parámetros, calcula macros y kg/semana, y se aplican a las metas.

## T7 — Nutrición > Menú: detectar todos los platos + día aleatorio ±5%  ·  MEDIA/ALTA
**Qué:** al montar el menú semanal, el selector de platos solo ve tus platos propios. Debe detectar **todos**:
tus platos (`nutri_dishes`) + recetas de la **biblioteca** (`RECIPES` de `recipesDB`) + las **guardadas de la
comunidad** (las que se importan con "Guardar receta" ya caen en `nutri_dishes`, confírmalo). Además, botón
**"Día aleatorio"** que rellene un día con comidas cuyos macros sumen **±5% de las metas** (`nutri_goals`).
**Dónde:** `src/pages/Nutricion.tsx`, `MenuTab`.
**Cómo:** unificar la fuente de platos (propios + biblioteca) para el picker. Para el día aleatorio: algoritmo
simple — elegir combinación de platos por comida (Desayuno/Comida/Cena/Snack) que aproxime kcal objetivo; validar
que el total quede dentro de ±5% de kcal (y a poder ser de proteína); reintentar N veces y quedarse con la mejor.
Guardar con `setMenuDay`. Si no logra ±5% tras N intentos, avisar con toast y poner la mejor aproximación.
**Aceptación:** el picker del menú muestra platos propios + biblioteca; "Día aleatorio" genera un día que cumple
±5% de kcal (o avisa si no puede).

## T8 — Nutrición > Buscar: alimentos y escáner de código de barras  ·  GRANDE (hablar con Claude antes de rematar)
**Qué:** (a) la base local de alimentos es corta (54); (b) el **escáner de código de barras no funciona** y (c)
tampoco la **búsqueda por número de código de barras**.
**Dónde:** `src/pages/Nutricion.tsx`, `SearchTab`.
**Cómo (enfoque recomendado):**
- **No** mantener a mano una BD gigante: apoyarse en **OpenFoodFacts** (ya hay un botón "Buscar en OpenFoodFacts").
  Búsqueda por código de barras: `GET https://world.openfoodfacts.org/api/v0/product/{barcode}.json` → mapear
  `product.nutriments` (energy-kcal_100g, proteins_100g, carbohydrates_100g, fat_100g) a nuestro formato de alimento.
- **Escáner:** implementar lectura de código de barras con la cámara. Opción ligera sin dependencia pesada:
  `BarcodeDetector` nativo (Chrome/Android) con fallback a `@zxing/browser` si hace falta. Pedir permiso de cámara,
  leer el código, y lanzar la búsqueda por código anterior. Cuidado con el `getUserMedia` y cerrar el stream.
- Ampliar la BD local solo si aporta (alimentos españoles básicos frecuentes); secundario frente a OpenFoodFacts.
**Aceptación:** meter un número de código de barras devuelve el producto (OpenFoodFacts); el botón "Escanear" abre
la cámara y al leer un código rellena el alimento. **Antes de darla por cerrada, avisar a Claude Code para revisar
el enfoque del escáner** (permisos/compatibilidad iOS Safari son delicados).

---

## Fuera de esta tanda (memoria, NO hacer aún)
- Conectar con relojes **Garmin / Amazfit** (importar carreras/entrenos/FC/sueño). Tarea grande futura.

## Cuando termines
Avisa a Josema y él le dice a Claude Code que haga **pull + auditoría + pulido** de todo (revisión de calidad,
seguridad, consistencia visual y verificación E2E de cada mejora).
