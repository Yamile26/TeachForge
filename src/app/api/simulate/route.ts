import { NextResponse } from "next/server";
import { obtenerCaso } from "@/lib/db";
import { demoActivo, fixtureSimulacion } from "@/lib/demo";
import { errorJson, leerBody } from "@/lib/http";
import { generateJson, LlmError } from "@/lib/llm";
import { cargarPrompt } from "@/lib/prompts";
import { SimulateRequestSchema, SimulacionSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/simulate -> respuestas de los 3 estudiantes en el turno actual. */
export async function POST(req: Request) {
  const body = await leerBody(req, SimulateRequestSchema);
  if (!body.ok) return body.response;

  const { caseId, turns, history, iaMode } = body.data;

  const caso = await obtenerCaso(caseId);
  if (!caso) return errorJson("Caso no encontrado.", 404);

  const turno = Math.min(turns.length + 1, 3);

  if (demoActivo()) {
    return NextResponse.json({
      turno,
      ...fixtureSimulacion(turno),
      source: "demo",
      uso: null,
    });
  }

  const historial =
    history && history.length > 0
      ? history
          .map((m) =>
            m.role === "docente"
              ? `DOCENTE: ${m.texto}`
              : `${m.alumno ?? "ESTUDIANTE"}: ${m.texto}`,
          )
          .join("\n")
      : turns.length === 0
        ? "El docente todavía no habló."
        : turns.map((t) => `DOCENTE (turno ${t.turno}): ${t.mensaje}`).join("\n");

  const system = cargarPrompt("simulate_students");

  const user = [
    "CASO (JSON escrito por el docente veterano):",
    JSON.stringify(caso, null, 2),
    `TURNO: ${turno} de 3`,
    `MODO_IA: ${iaMode ? "true" : "false"}`,
    "HISTORIAL DE LA CLASE:",
    historial,
    turno === 1
      ? "Es el primer turno: el docente acaba de plantear el tema o de preguntar. Los estudiantes todavía tienen el error."
      : "Continúa desde donde quedó la clase y respeta la velocidad de mejora de cada perfil.",
    `Devuelve el JSON de las respuestas de los 3 estudiantes en el turno ${turno}.`,
  ].join("\n\n");

  try {
    const { data, uso, intentos } = await generateJson({
      system,
      user,
      schema: SimulacionSchema,
      tier: "fast",
      temperature: 0.8,
    });
    return NextResponse.json({ turno, ...data, source: "live", uso, intentos });
  } catch (error) {
    if (error instanceof LlmError) {
      // Respaldo automático: la demo sigue aunque el modelo falle.
      console.error("[simulate] respaldo con fixture:", error.code, error.message);
      return NextResponse.json({ turno, ...fixtureSimulacion(turno), source: "demo", uso: null, aviso: "El modelo no respondió; se muestra un turno de ejemplo." });
    }
    return errorJson("Error inesperado al simular.", 500);
  }
}
