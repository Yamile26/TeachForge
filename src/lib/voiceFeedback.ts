import { z } from "zod";

/**
 * Feedback sobre cómo habló el docente en un turno del simulador.
 * Describe con evidencia y tiempo; no califica, no infiere emociones ni «confianza».
 * Los rangos son heurísticas sin validar: se presentan como espejo orientativo.
 */

export const VoiceFeedbackSchema = z.object({
  observaciones: z
    .array(
      z.object({
        texto: z.string().min(1).max(280),
        momento: z.string().max(40).nullable(),
      }),
    )
    .min(1)
    .max(3),
  sugerencia: z.string().min(1).max(280),
});

export type VoiceFeedback = z.infer<typeof VoiceFeedbackSchema>;

export const VoiceMetricsSchema = z.object({
  durationSec: z.number().min(0),
  wordCount: z.number().int().min(0).optional(),
  wpm: z.number().min(0),
  fillers: z.object({ total: z.number().int().min(0), byFiller: z.record(z.string(), z.number()) }),
  longPauses: z.array(z.object({ from: z.number(), to: z.number(), seconds: z.number() })).nullable(),
  questionWaits: z.array(z.object({ question: z.string().optional(), at: z.number(), waitSec: z.number() })).nullable(),
  hasTimestamps: z.boolean().optional(),
});

export const VOICE_FEEDBACK_SYSTEM = [
  "Eres un acompañante pedagógico que da feedback sobre CÓMO habló un docente en formación a una clase simulada de secundaria.",
  "Recibes la transcripción y métricas calculadas (ritmo, muletillas, pausas largas y tiempo de espera tras cada pregunta).",
  "Reglas:",
  "- Háblale al docente de tú, en segunda persona («usaste», «preguntaste»).",
  "- Describe con evidencia y, cuando haya tiempos, indica el momento en formato m:ss (las métricas vienen en segundos: 3.1 → «0:03», 14.8 → «0:14»; un tramo: «0:40–0:55»).",
  "- No pongas puntajes ni notas. No infieras emociones, nervios ni «confianza».",
  "- Las métricas son heurísticas sin validar: no las presentes como verdad absoluta.",
  "- El tiempo de espera tras una pregunta tiene respaldo pedagógico: si fue menor de 3 segundos, menciónalo.",
  "- Valora también cómo están formuladas las preguntas: si invitan a explicar el razonamiento o solo piden «¿entendieron?».",
  "- Máximo 3 observaciones y UNA sola sugerencia concreta para el siguiente turno.",
  "Devuelve SOLO JSON: {\"observaciones\":[{\"texto\":string,\"momento\":string|null}],\"sugerencia\":string}.",
].join("\n");

function mmss(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Feedback por reglas, para el modo demo o si el modelo no responde. */
export function feedbackPorReglas(text: string, m: z.infer<typeof VoiceMetricsSchema>): VoiceFeedback {
  const obs: VoiceFeedback["observaciones"] = [];

  if (m.wpm > 170) {
    obs.push({ texto: `Hablaste a unas ${m.wpm} palabras por minuto, un ritmo rápido para explicar un procedimiento.`, momento: null });
  } else if (m.wpm > 0 && m.wpm < 90) {
    obs.push({ texto: `Hablaste a unas ${m.wpm} palabras por minuto, con un ritmo pausado.`, momento: null });
  } else if (m.wpm > 0) {
    obs.push({ texto: `Tu ritmo fue de unas ${m.wpm} palabras por minuto.`, momento: null });
  }

  const cortas = (m.questionWaits ?? []).filter((q) => q.waitSec < 3);
  if (cortas.length) {
    obs.push({
      texto: `Después de ${cortas.length === 1 ? "una pregunta" : `${cortas.length} preguntas`} esperaste menos de 3 segundos antes de seguir hablando.`,
      momento: mmss(cortas[0].at),
    });
  } else if ((m.questionWaits ?? []).length) {
    obs.push({ texto: "Dejaste silencio suficiente después de tus preguntas para que la clase pensara.", momento: null });
  }

  if (m.fillers.total > 0) {
    const lista = Object.entries(m.fillers.byFiller)
      .map(([w, n]) => `«${w}» ×${n}`)
      .join(", ");
    obs.push({ texto: `Usaste ${m.fillers.total} muletilla${m.fillers.total === 1 ? "" : "s"}: ${lista}.`, momento: null });
  }

  if (!obs.length) obs.push({ texto: "La grabación fue muy breve para describir tu forma de hablar.", momento: null });

  const preguntaCerrada = /¿\s*(entendieron|quedó claro|está claro|ok)\s*\?/i.test(text);
  const sugerencia = cortas.length
    ? "En el siguiente turno, después de preguntar, cuenta mentalmente hasta 5 antes de volver a hablar."
    : preguntaCerrada
      ? "Cambia «¿entendieron?» por una pregunta que pida explicar: «¿por qué crees que funciona?»."
      : m.wpm > 170
        ? "Baja el ritmo en el paso clave del procedimiento y haz una pausa antes de escribirlo en la pizarra."
        : "Pide a un alumno que explique con sus palabras el paso que acabas de hacer.";

  return { observaciones: obs.slice(0, 3), sugerencia };
}
