import { NextResponse } from "next/server";
import { guardarEvaluacion, guardarIntento, obtenerCaso } from "@/lib/db";
import { demoActivo, fixtureEvaluacion } from "@/lib/demo";
import { errorJson, leerBody } from "@/lib/http";
import { generateJson, LlmError } from "@/lib/llm";
import { cargarPrompt } from "@/lib/prompts";
import { competenciaMasDebil, rubricaParaPrompt } from "@/lib/rubric";
import { EvaluateRequestSchema, EvaluacionSchema } from "@/lib/schemas";
import type { Evaluacion } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/evaluate -> puntajes 0-3 por competencia con evidencia citada. */
export async function POST(req: Request) {
  const body = await leerBody(req, EvaluateRequestSchema);
  if (!body.ok) return body.response;

  const { caseId, learner_alias, transcript, hidden_states } = body.data;

  const caso = await obtenerCaso(caseId);
  if (!caso) return errorJson("Caso no encontrado.", 404);

  let evaluacion: Evaluacion;
  let uso = { tokensIn: 0, tokensOut: 0, costUsd: 0, model: "demo" };
  let respaldo = false;

  if (demoActivo()) {
    evaluacion = fixtureEvaluacion();
  } else {
    const user = [
      "CASO (incluye la estrategia del docente veterano):",
      JSON.stringify(caso, null, 2),
      "TRANSCRIPCIÓN (lo que dijo el docente en formación):",
      transcript.map((t) => `Turno ${t.turno}: ${t.mensaje}`).join("\n"),
      "ESTADO OCULTO DE LOS ESTUDIANTES (señal, no veredicto):",
      JSON.stringify(hidden_states, null, 2),
      "RÚBRICA:",
      rubricaParaPrompt(),
    ].join("\n\n");

    try {
      const resultado = await generateJson({
        system: cargarPrompt("evaluate_attempt"),
        user,
        schema: EvaluacionSchema,
        tier: "smart",
        temperature: 0.3,
      });
      evaluacion = resultado.data;
      uso = resultado.uso;
    } catch (error) {
      if (!(error instanceof LlmError)) return errorJson("Error inesperado al evaluar.", 500);
      // Respaldo automático: la demo sigue aunque el modelo falle.
      console.error("[evaluate] respaldo con fixture:", error.code, error.message);
      evaluacion = fixtureEvaluacion();
      respaldo = true;
    }
  }

  // Si el modelo omitió alguna competencia, la completamos como "sin evidencia".
  if (evaluacion.scores.length < 4) {
    const presentes = new Set(evaluacion.scores.map((s) => s.competencia));
    const faltantes = (
      [
        "diagnostico_del_error",
        "estrategia_de_explicacion",
        "verificacion_de_la_comprension",
        "adaptacion_a_diferencias",
      ] as const
    ).filter((c) => !presentes.has(c));
    evaluacion = {
      ...evaluacion,
      scores: [
        ...evaluacion.scores,
        ...faltantes.map((competencia) => ({
          competencia,
          puntaje: null,
          evidencia: null,
          mejora: "Sin evidencia en la transcripción para esta competencia.",
        })),
      ],
    };
  }

  const nextFocus = competenciaMasDebil(evaluacion.scores) ?? evaluacion.next_focus;

  try {
    const attemptId = await guardarIntento({
      case_id: caseId,
      learner_alias,
      transcript,
      hidden_states,
      tokens_in: uso.tokensIn,
      tokens_out: uso.tokensOut,
      cost_usd: uso.costUsd,
    });
    const evaluationId = await guardarEvaluacion(attemptId, evaluacion);
    return NextResponse.json({
      attemptId,
      evaluationId,
      ...evaluacion,
      next_focus: nextFocus,
      caso: {
        titulo: caso.titulo,
        estrategia_que_funciono: caso.estrategia_que_funciono,
        lo_que_no_funciono: caso.lo_que_no_funciono,
        senal_de_comprension: caso.senal_de_comprension,
      },
      uso,
      source: demoActivo() || respaldo ? "demo" : "live",
    });
  } catch (error) {
    return errorJson(error instanceof Error ? error.message : "Error al guardar la evaluación", 500);
  }
}
