Qué estamos construyendo

Un asistente dentro de Life App alimentado por la destilación de ~20 libros de hábitos, salud y entrenamiento, que conoce tu estado real (entreno, comida, sueño, rachas, gastos) y puede actuar sobre él.

Las decisiones que se tomaron

Sobre el conocimiento: no es un problema de RAG puro. Los libros de hábitos comprimen a ~150 fichas estructuradas con acceso por reglas. Los de entreno y nutrición sí van a RAG, pero como herramienta que el modelo llama cuando la necesita, no como paso fijo del pipeline. Empecé demasiado absoluto con esto y lo corregí: son dos corpus, no uno.

Sobre el valor real: está en la capa de estado, no en los libros. Un LLM ya sabe lo que dice Atomic Habits; lo que no sabe es que ayer hiciste pierna y dormiste 5h. Métrica de éxito: cuántas veces al día te dice algo que no podrías haber predicho.

Sobre las dietas: no salen de los libros, salen de una función determinista. El modelo redacta el resultado, nunca calcula los números.

Sobre el modelo: MiniMax M3, con doble clave. Token Plan de $22 para construir y para digerir los libros (unos 8M de tokens, el 0,5% de la cuota), y failover a pay-as-you-go para el runtime, que cuesta menos de 1$/mes. Aquí también me corregiste con razón: el plan no está prohibido para tu app, el problema real es que comparte cuota con tus agentes de código.

Lo que añadí en el informe

Log de intervenciones (la tabla que hace que el mes 6 sea mejor que el mes 1), contradicción productiva, detección de patrones cruzados, perfil derivado, revisión semanal, reglas de silencio y modo herramienta.

Lo que encontré investigando

GymCoach, un repo MIT que convergió independientemente en casi toda esta arquitectura — payload estructurado, tarjeta de trazabilidad, insight sin llamada a IA, caching, validación con Zod. Y no usa RAG. Además su playbook de mantenimiento autónomo con Claude Code te sirve para Life App entera.

Nada de frameworks RAG ni capas de memoria tipo Mem0. pgvector en tu Postgres, Marker para parsear, Instructor para extraer, Qwen3-Embedding por la licencia Apache.

Dónde estás ahora

Dos documentos listos: arquitectura y anexo de stack. Te propuse valores concretos para las siete decisiones abiertas (umbrales de empujar vs ceder, suelos, circuit breaker, push, calendario).

Faltan tres cosas, todas tuyas: la lista de libros clasificada, el esquema real de Life App, y validar los suelos de calorías y proteína con un profesional antes de fijarlos en código.