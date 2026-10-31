import { z } from "zod";

/**
 * Contratos del proyecto. Todo lo que devuelve el modelo pasa por aquí:
 * si no valida, se reintenta una vez y luego se cae al fallback.
 */

export const COMPETENCIAS = [
  "diagnostico_del_error",
  "estrategia_de_explicacion",
  "verificacion_de_la_comprension",
  "adaptacion_a_diferencias",
  "uso_critico_de_la_ia",
] as const;

export const CompetenciaSchema = z.enum(COMPETENCIAS);
export type Competencia = z.infer<typeof CompetenciaSchema>;

// --- Caso estructurado (salida del extractor + edición del docente) ---

export const PerfilEstudianteSchema = z.object({
  nombre: z.string(),
  perfil: z.string(),
  como_se_manifiesta: z.string(),
});

export const ErrorFrecuenteSchema = z.object({
  descripcion: z.string(),
  ejemplo_alumno: z.string(),
  por_que_ocurre: z.string(),
});

export const EstrategiaSchema = z.object({
  descripcion: z.string(),
  pasos: z.array(z.string()),
  condiciones: z.string(),
});

export const CasoEstructuradoSchema = z.object({
  titulo: z.string(),
  materia: z.string(),
  nivel: z.string(),
  tema: z.string(),
  concepto_clave: z.string(),
  error_frecuente: ErrorFrecuenteSchema,
  estrategia_que_funciono: EstrategiaSchema,
  lo_que_no_funciono: z.string(),
  senal_de_comprension: z.string(),
  contexto_aula: z.string(),
  perfiles_estudiantes: z.array(PerfilEstudianteSchema),
  /** Lo que el docente no dijo: se muestra resaltado en la revisión. */
  campos_faltantes: z.array(z.string()),
});

export type CasoEstructurado = z.infer<typeof CasoEstructuradoSchema>;

// --- Simulación ---

export const EstadoOcultoSchema = z.enum([
  "sigue_con_error",
  "mejora_parcial",
  "comprende",
]);

export const SimulacionSchema = z.object({
  respuestas: z.array(
    z.object({
      alumno: z.string(),
      texto: z.string(),
    }),
  ),
  estado_oculto: z.array(
    z.object({
      alumno: z.string(),
      estado: EstadoOcultoSchema,
    }),
  ),
});

export type Simulacion = z.infer<typeof SimulacionSchema>;

export const TurnoDocenteSchema = z.object({
  turno: z.number().int().min(1).max(3),
  mensaje: z.string(),
});

export type TurnoDocente = z.infer<typeof TurnoDocenteSchema>;

// --- Evaluación ---

export const PuntajeCompetenciaSchema = z.object({
  competencia: CompetenciaSchema,
  /** null = "sin evidencia": no se penaliza con 0. */
  puntaje: z.number().int().min(0).max(3).nullable(),
  /** Cita textual de lo que dijo el docente (máx. 25 palabras). */
  evidencia: z.string().nullable(),
  mejora: z.string(),
});

export const EvaluacionSchema = z.object({
  scores: z.array(PuntajeCompetenciaSchema),
  summary: z.string(),
  next_focus: CompetenciaSchema,
  comparacion_con_veterano: z.object({
    coincidencias: z.array(z.string()),
    diferencias: z.array(z.string()),
  }),
});

export type Evaluacion = z.infer<typeof EvaluacionSchema>;

// --- Registros persistidos ---

export const CasoGuardadoSchema = CasoEstructuradoSchema.extend({
  id: z.string(),
  created_at: z.string(),
  author_alias: z.string(),
  years_experience: z.number().int().nullable(),
  subject: z.string(),
  level: z.string(),
  topic: z.string(),
  raw_story: z.string(),
  validated_by_author: z.boolean(),
  is_seed: z.boolean(),
  consent_at: z.string().nullable(),
  tags: z.array(z.string()),
});

export type CasoGuardado = z.infer<typeof CasoGuardadoSchema>;

// --- Payloads de las rutas API ---

export const ExtractRequestSchema = z.object({
  story: z.string().min(20, "El relato es demasiado corto."),
  meta: z
    .object({
      subject: z.string().optional(),
      level: z.string().optional(),
      topic: z.string().optional(),
    })
    .optional(),
});

export const CreateCaseRequestSchema = z.object({
  author_alias: z.string().min(2),
  years_experience: z.number().int().min(0).max(60).nullable().optional(),
  subject: z.string().min(2),
  level: z.string().min(2),
  topic: z.string().min(2),
  raw_story: z.string().min(20),
  structured: CasoEstructuradoSchema,
  consent: z.literal(true),
  tags: z.array(z.string()).optional(),
});

export const MensajeHistorialSchema = z.object({
  role: z.enum(["docente", "estudiante"]),
  alumno: z.string().optional(),
  texto: z.string(),
});

export const SimulateRequestSchema = z.object({
  caseId: z.string().min(1),
  turns: z.array(TurnoDocenteSchema).max(3),
  /** Diálogo completo previo (docente y estudiantes) para que la clase tenga memoria. */
  history: z.array(MensajeHistorialSchema).optional(),
  iaMode: z.boolean().optional().default(false),
});

export const EvaluateRequestSchema = z.object({
  caseId: z.string().min(1),
  learner_alias: z.string().min(2),
  transcript: z.array(TurnoDocenteSchema).min(1),
  hidden_states: SimulacionSchema.shape.estado_oculto,
});
