# TeachForge

**El criterio pedagógico de un docente no debería jubilarse con él.**

TeachForge captura la experiencia real de docentes veteranos —qué error cometen los alumnos, por qué ocurre y qué lo destraba—, la convierte en casos pedagógicos validados por ellos mismos y la usa para que docentes en formación practiquen en simulaciones de aula con estudiantes simulados. Cada intento deja evidencia en un perfil de competencias.

Proyecto para **DSC HACK 2026** · Reto «Educación 2036» · Grieta 03: docentes sin relevo.

---

## El problema

En el Perú, el **22 % de los docentes de secundaria tiene 55 años o más** (dato de la slide del reto: OCDE *Education at a Glance 2026* y GRADE vía *Gestión*, 19/10/2026; Minedu vía *La República*, 05/07/2026). Ese dato mide **edad, no jubilaciones**.

Lo que se pierde cuando un docente se jubila **no es contenido** —está en los libros y, desde 2023, en la IA—. Se pierde el **conocimiento pedagógico del contenido** (Shulman): qué error comete el alumno, por qué lo comete y qué explicación lo destraba. Se aprende en años de aula y casi nunca se documenta. Con IA el contenido es casi gratis; el criterio es lo escaso.

**Estado de la evidencia:** la tabla de verificación de fuentes está en [`docs/problema-y-evidencia.md`](docs/problema-y-evidencia.md). Nada de esa tabla se cita como verificado hasta abrir la fuente original.

## Qué es y qué no es

**Es:** una plataforma que transforma relatos de aula en casos validados y los usa para entrenar con simulaciones y retroalimentación con evidencia.

**No es:** un chatbot de profe, un detector de IA ni un banco de planes de clase. El diferencial es la **fuente** (casos reales validados por su autor) y el **ciclo** (captura → simulación → evidencia → siguiente práctica).

## El ciclo

```
Captura  →  Caso validado por el veterano  →  Simulación (3 turnos, 3 estudiantes)
        →  Evaluación por rúbrica con evidencia citada  →  Perfil de competencias
```

| Competencia (0–3) | Qué mide |
| --- | --- |
| Diagnóstico del error | ¿Identifica qué hace mal el alumno y por qué? |
| Estrategia de explicación | ¿La explicación ataca la causa o repite el procedimiento? |
| Verificación de la comprensión | ¿Comprueba si entendieron o solo si copiaron? |
| Adaptación a diferencias | ¿Reconoce y atiende perfiles distintos? |
| Uso crítico de la IA *(opcional)* | Solo se puntúa con el «Momento IA» |

Sin evidencia en la transcripción, la competencia queda en **«sin evidencia»**: no se castiga con 0.

## Stack

Next.js (App Router, TypeScript) · Tailwind CSS · Zod · OpenAI (Chat Completions) · Supabase (Postgres) · deploy en Vercel.

Tres roles de IA con prompts distintos, **no** un sistema multiagente: extractor, estudiantes simulados y evaluador. Un modelo más capaz para extraer y evaluar, uno más barato para la simulación. El proveedor está aislado en [`src/lib/llm.ts`](src/lib/llm.ts).

## Cómo correrlo en local

```bash
npm install
cp .env.example .env.local   # y pon tu OPENAI_API_KEY
npm run dev
```

Abre <http://localhost:3000>. Sin `OPENAI_API_KEY` la app arranca en **modo demo** con los fixtures de `/fixtures`, así se puede construir la interfaz sin gastar tokens.

Comprobaciones:

```bash
npm run typecheck
npm run test
curl localhost:3000/api/health
curl "localhost:3000/api/health?llm=1"   # hace una llamada real al modelo
```

## Variables de entorno

| Variable | Para qué |
| --- | --- |
| `OPENAI_API_KEY` | Servidor. Sin ella, modo demo. |
| `OPENAI_MODEL_SMART` / `OPENAI_MODEL_FAST` | Modelo para extraer/evaluar y para simular. |
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | Postgres. Sin ellas, store en memoria. |
| `DEMO_MODE` | `true` fuerza fixtures: fallback de la demo. |

Ninguna clave sale nunca al navegador: todo el acceso al modelo y a la base ocurre en las rutas `/api`.

## API

| Ruta | Qué hace |
| --- | --- |
| `GET /api/health` | Estado de configuración (y prueba el modelo con `?llm=1`). |
| `POST /api/extract` | Relato → caso estructurado (Zod + reintento). |
| `GET/POST /api/cases` | Biblioteca y guardado del caso validado. |
| `POST /api/simulate` | Respuestas de 3 estudiantes para el turno actual. |
| `POST /api/evaluate` | Puntajes 0–3 con cita textual; guarda tokens y costo. |
| `GET /api/profile?alias=` | Evolución por competencia y siguiente práctica. |

Todas las salidas del modelo se validan con Zod; si falla, se reintenta una vez con el error de validación y, si vuelve a fallar, la ruta responde con un error explícito (y `DEMO_MODE` mantiene la demo en pie).

## Estructura

```
prompts/        prompts en markdown (extractor, simulación, evaluación, seeds)
supabase/       schema.sql
fixtures/       casos de ejemplo y respuestas guardadas para DEMO_MODE
src/app/        páginas + rutas /api
src/lib/        llm, db, schemas, rubric, cost, demo
tests/          validación de esquemas y rúbrica
docs/           problema y evidencia, arquitectura, rúbrica, declaración de IA
```

## Qué funciona hoy y qué es hoja de ruta

**Funciona hoy:** contratos de datos con Zod, capa de IA con reintento y costo por sesión, extractor, simulador de 3 turnos, evaluador con citas, perfil por competencia, biblioteca con casos de ejemplo, modo demo con fixtures y store en memoria.

**Hoja de ruta (no se afirma como hecho):** interfaz final (v0), persistencia real en Supabase, dictado por voz, 15 casos semilla, búsqueda semántica con pgvector, grafo de conocimiento, recomendación adaptativa longitudinal.

## Ética y límites

- Alias públicos, sin nombres ni datos personales. Sin login en el MVP: es una limitación, no una decisión de diseño.
- El docente **valida su propio caso** antes de que se use; el audio no se guarda.
- Los casos seed se muestran siempre como **«Ejemplo»**, nunca como relatos reales.
- Los puntajes son de una simulación con pocas personas: **indicativos**, no una medición de calidad docente.
- Uso de IA y trabajo previo declarados en [`docs/declaracion-de-ia-y-trabajo-previo.md`](docs/declaracion-de-ia-y-trabajo-previo.md).

## Licencia

MIT — ver [LICENSE](LICENSE).
