# Arquitectura

## Flujo

```
Navegador
   │
   ├── /api/extract    (modelo capaz)  ─┐
   ├── /api/simulate   (modelo rápido) ─┼──►  OpenAI
   └── /api/evaluate   (modelo capaz)  ─┘
   │
   ├── /api/cases, /api/profile  ─────────►  Supabase (Postgres)
   │
   └── DEMO_MODE  ───────────────────────►  /fixtures (respuestas guardadas)
```

- Las claves del modelo y de Supabase viven **solo** en variables de entorno del servidor.
- Toda salida del modelo pasa por Zod: si no valida, se reintenta una vez pasándole el error; si vuelve a fallar, la ruta responde un error explícito y la UI puede caer al modo demo.
- El costo se calcula en `src/lib/cost.ts` a partir de `usageMetadata` y se guarda con cada intento.

## Capas

| Archivo | Responsabilidad |
| --- | --- |
| `src/lib/schemas.ts` | Contratos Zod: caso, simulación, evaluación y payloads de las rutas. Única fuente de verdad. |
| `src/lib/llm.ts` | Único punto que habla con el proveedor. Extrae JSON, valida, reintenta, devuelve tokens. |
| `src/lib/rubric.ts` | Rúbrica 0–3, texto para el prompt y regla de siguiente práctica. |
| `src/lib/db.ts` | Supabase o store en memoria, misma interfaz. |
| `src/lib/demo.ts` | `DEMO_MODE` y acceso a fixtures. |
| `src/lib/prompts.ts` | Carga los prompts de `/prompts` (incluidos en el bundle vía `outputFileTracingIncludes`). |
| `src/lib/cost.ts` | Precios y costo por sesión. |

## Decisiones

1. **Tres roles, no multiagente.** Extractor, estudiantes y evaluador son tres prompts distintos. No se afirma orquestación multiagente.
2. **Sin RAG con 2–3 casos.** El caso completo se pasa al modelo; pgvector queda para más adelante. Dimensión 1536 reservada en el esquema.
3. **Sin login en el MVP.** Se trabaja con alias y la service key solo en servidor. Es una limitación declarada.
4. **Un solo despliegue.** Las rutas de API y la UI viven en el mismo proyecto Next.js, para que la demo se pueda mostrar sin infraestructura extra.
5. **Store en memoria** para poder correr sin Supabase; la interfaz de `db.ts` es la misma, así que activar Postgres es solo configurar variables.
