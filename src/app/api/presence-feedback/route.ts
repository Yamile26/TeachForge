import { NextResponse } from "next/server";
import { z } from "zod";
import { demoActivo } from "@/lib/demo";
import { leerBody } from "@/lib/http";
import { generateJson } from "@/lib/llm";
import {
  feedbackPorReglas,
  VOICE_FEEDBACK_SYSTEM,
  VoiceFeedbackSchema,
  VoiceMetricsSchema,
} from "@/lib/voiceFeedback";

/**
 * Feedback sobre cómo habló el docente en un turno: 3 observaciones con su momento
 * y 1 sugerencia, sin puntaje. Recibe la transcripción y las métricas de voz
 * (src/lib/voiceMetrics.ts); nunca recibe audio ni video.
 */

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  text: z.string().max(5000),
  metrics: VoiceMetricsSchema,
  contexto: z.string().max(400).optional(),
});

export async function POST(req: Request) {
  const body = await leerBody(req, BodySchema);
  if (!body.ok) return body.response;
  const { text, metrics, contexto } = body.data;

  if (demoActivo() || !text.trim()) {
    return NextResponse.json({ ...feedbackPorReglas(text, metrics), source: "demo" });
  }

  try {
    const { data, uso } = await generateJson({
      system: VOICE_FEEDBACK_SYSTEM,
      user: [
        contexto ? `CONTEXTO DE LA CLASE: ${contexto}` : null,
        `TRANSCRIPCIÓN:\n${text}`,
        `MÉTRICAS (heurísticas sin validar):\n${JSON.stringify(metrics)}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      schema: VoiceFeedbackSchema,
      tier: "fast",
      temperature: 0.3,
    });
    return NextResponse.json({ ...data, source: "live", uso });
  } catch (error) {
    // Respaldo automático: el feedback por reglas siempre está disponible.
    console.error("[presence-feedback] respaldo por reglas:", error);
    return NextResponse.json({ ...feedbackPorReglas(text, metrics), source: "demo" });
  }
}
