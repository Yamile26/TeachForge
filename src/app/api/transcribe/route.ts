import { NextResponse } from "next/server";
import { demoActivo } from "@/lib/demo";
import { errorJson } from "@/lib/http";

/**
 * Transcribe la respuesta hablada del docente (solo audio; el video nunca llega aquí).
 * Recibe multipart/form-data con el campo "file" y devuelve { text, words, segments, source },
 * con marcas de tiempo para que src/lib/voiceMetrics.ts calcule pausas y tiempo de espera.
 * El audio no se guarda: se reenvía a la API de transcripción y se descarta.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const MODELO = process.env.OPENAI_MODEL_TRANSCRIBE ?? "whisper-1";
// Vercel limita el cuerpo de una función a ~4,5 MB; 90 s de audio opus pesan bastante menos.
const MAX_BYTES = 4 * 1024 * 1024;

// Respuesta de ejemplo para el modo demo: misma forma que la respuesta real.
const DEMO = {
  text:
    "Eh, Rosa, antes de corregirte, ¿qué significa para ti pasar al otro lado? Este, piensa en una balanza. Si quito cinco de un lado, ¿qué tengo que hacer en el otro? Diego, ¿tú cómo lo resolviste?",
  segments: [
    { text: "Eh, Rosa, antes de corregirte, ¿qué significa para ti pasar al otro lado?", start: 0, end: 5.2 },
    { text: "Este, piensa en una balanza.", start: 8.4, end: 10.6 },
    { text: "Si quito cinco de un lado, ¿qué tengo que hacer en el otro?", start: 11, end: 14.8 },
    { text: "Diego, ¿tú cómo lo resolviste?", start: 18.1, end: 20.3 },
  ],
};

type Palabra = { word: string; start: number; end: number };
type Segmento = { text: string; start: number; end: number };

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return errorJson("Envía el audio como multipart/form-data en el campo «file».", 400);
  }

  const archivo = form.get("file");
  if (!(archivo instanceof Blob) || archivo.size === 0) {
    return errorJson("No llegó audio en el campo «file».", 400);
  }
  if (archivo.size > MAX_BYTES) {
    return errorJson("El audio es demasiado largo. Graba como máximo 90 segundos.", 413);
  }

  if (demoActivo()) {
    return NextResponse.json({ ...DEMO, words: [], source: "demo" });
  }

  const nombre = archivo instanceof File && archivo.name ? archivo.name : "respuesta.webm";
  const cuerpo = new FormData();
  cuerpo.append("file", archivo, nombre);
  cuerpo.append("model", MODELO);
  cuerpo.append("language", "es");
  cuerpo.append("response_format", "verbose_json");
  cuerpo.append("timestamp_granularities[]", "word");
  cuerpo.append("timestamp_granularities[]", "segment");

  try {
    const res = await fetch(`${BASE_URL}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: cuerpo,
    });
    if (!res.ok) {
      const detalle = await res.text().catch(() => "");
      return errorJson("No se pudo transcribir el audio.", 502, detalle.slice(0, 300));
    }
    const data = (await res.json()) as { text?: string; words?: Palabra[]; segments?: Segmento[] };
    return NextResponse.json({
      text: data.text ?? "",
      words: (data.words ?? []).map(({ word, start, end }) => ({ word, start, end })),
      segments: (data.segments ?? []).map(({ text, start, end }) => ({ text, start, end })),
      source: "live",
    });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error inesperado.";
    return errorJson("No se pudo transcribir el audio.", 502, mensaje);
  }
}
