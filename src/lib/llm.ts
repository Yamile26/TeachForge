import type { ZodType } from "zod";
import { costoUsd, type Uso } from "./cost";

/**
 * Único punto del proyecto que habla con el proveedor de IA.
 * Si mañana cambiamos de proveedor, solo cambia este archivo.
 *
 * Hoy: OpenAI Chat Completions con `response_format: json_object`.
 * Antes: Gemini. El resto del código no se enteró del cambio.
 */

export type Tier = "smart" | "fast";

export type LlmErrorCode = "not_configured" | "validation" | "provider";

export class LlmError extends Error {
  constructor(
    message: string,
    readonly code: LlmErrorCode,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

const BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";

export function modeloDe(tier: Tier): string {
  return tier === "smart"
    ? (process.env.OPENAI_MODEL_SMART ?? "gpt-4.1")
    : (process.env.OPENAI_MODEL_FAST ?? "gpt-4.1-mini");
}

export function llmConfigurado(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/** Los modelos a veces envuelven el JSON en ```json ... ``` o agregan texto. */
function extraerJson(texto: string): string {
  const limpio = texto.trim();
  const bloque = limpio.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidato = bloque ? bloque[1].trim() : limpio;
  const inicio = candidato.search(/[[{]/);
  if (inicio === -1) return candidato;
  const cierre = Math.max(candidato.lastIndexOf("}"), candidato.lastIndexOf("]"));
  return cierre > inicio ? candidato.slice(inicio, cierre + 1) : candidato.slice(inicio);
}

type RespuestaOpenAi = {
  choices?: { message?: { content?: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
};

async function llamarModelo(
  model: string,
  system: string,
  user: string,
  temperature: number,
): Promise<{ texto: string; tokensIn: number; tokensOut: number }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new LlmError("Falta OPENAI_API_KEY en el entorno.", "not_configured");

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        max_completion_tokens: 3000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    throw new LlmError(`No se pudo contactar a OpenAI: ${mensaje}`, "provider");
  }

  const json = (await res.json().catch(() => ({}))) as RespuestaOpenAi;

  if (!res.ok) {
    throw new LlmError(
      `OpenAI respondió ${res.status}: ${json.error?.message ?? "sin detalle"}`,
      "provider",
    );
  }

  return {
    texto: json.choices?.[0]?.message?.content ?? "",
    tokensIn: json.usage?.prompt_tokens ?? 0,
    tokensOut: json.usage?.completion_tokens ?? 0,
  };
}

export type GenerateJsonOptions<T> = {
  system: string;
  user: string;
  schema: ZodType<T>;
  tier?: Tier;
  temperature?: number;
};

export type GenerateJsonResult<T> = {
  data: T;
  uso: Uso;
  intentos: number;
};

/**
 * Llama al modelo pidiendo JSON, lo valida con Zod y, si no valida, reintenta
 * una vez pasándole el error de validación. Si vuelve a fallar, lanza LlmError
 * (las rutas deciden el fallback).
 */
export async function generateJson<T>({
  system,
  user,
  schema,
  tier = "smart",
  temperature = 0.4,
}: GenerateJsonOptions<T>): Promise<GenerateJsonResult<T>> {
  const model = modeloDe(tier);

  let uso: Uso = { tokensIn: 0, tokensOut: 0, costUsd: 0, model };
  let ultimoError = "";
  let promptUsuario = user;

  for (let intento = 1; intento <= 2; intento++) {
    const { texto, tokensIn, tokensOut } = await llamarModelo(model, system, promptUsuario, temperature);

    uso = {
      tokensIn: uso.tokensIn + tokensIn,
      tokensOut: uso.tokensOut + tokensOut,
      costUsd: Math.round((uso.costUsd + costoUsd(model, tokensIn, tokensOut)) * 1e6) / 1e6,
      model,
    };

    let parseado: unknown;
    try {
      parseado = JSON.parse(extraerJson(texto));
    } catch {
      ultimoError = "La respuesta no era JSON válido.";
      promptUsuario = `${user}\n\nTu respuesta anterior no era JSON válido. Devuelve SOLO el objeto JSON, sin texto alrededor.`;
      continue;
    }

    const resultado = schema.safeParse(parseado);
    if (resultado.success) {
      return { data: resultado.data, uso, intentos: intento };
    }

    ultimoError = JSON.stringify(resultado.error.issues.slice(0, 8));
    promptUsuario = `${user}\n\nTu respuesta anterior no cumplió el esquema. Errores de validación: ${ultimoError}\nCorrige y devuelve SOLO el JSON completo.`;
  }

  throw new LlmError(`La salida del modelo no validó el esquema: ${ultimoError}`, "validation");
}
