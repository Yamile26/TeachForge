import { GoogleGenAI } from "@google/genai";
import type { ZodType } from "zod";
import { costoUsd, type Uso } from "./cost";

/**
 * Único punto del proyecto que habla con el proveedor de IA.
 * Si mañana cambiamos de proveedor, solo cambia este archivo.
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

export function modeloDe(tier: Tier): string {
  return tier === "smart"
    ? (process.env.GEMINI_MODEL_SMART ?? "gemini-pro-latest")
    : (process.env.GEMINI_MODEL_FAST ?? "gemini-flash-latest");
}

export function llmConfigurado(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

let cliente: GoogleGenAI | null = null;

function getCliente(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new LlmError("Falta GEMINI_API_KEY en el entorno.", "not_configured");
  cliente ??= new GoogleGenAI({ apiKey });
  return cliente;
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
  const ai = getCliente();
  const model = modeloDe(tier);

  let uso: Uso = { tokensIn: 0, tokensOut: 0, costUsd: 0, model };
  let ultimoError = "";
  let promptUsuario = user;

  for (let intento = 1; intento <= 2; intento++) {
    let texto = "";
    try {
      const response = await ai.models.generateContent({
        model,
        contents: promptUsuario,
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          temperature,
        },
      });
      texto = response.text ?? "";

      const tokensIn = response.usageMetadata?.promptTokenCount ?? 0;
      const tokensOut = response.usageMetadata?.candidatesTokenCount ?? 0;
      uso = {
        tokensIn: uso.tokensIn + tokensIn,
        tokensOut: uso.tokensOut + tokensOut,
        costUsd: Math.round((uso.costUsd + costoUsd(model, tokensIn, tokensOut)) * 1e6) / 1e6,
        model,
      };
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      throw new LlmError(`El proveedor de IA falló: ${mensaje}`, "provider");
    }

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
