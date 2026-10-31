import { NextResponse } from "next/server";
import { z } from "zod";
import { dbMode } from "@/lib/db";
import { demoActivo } from "@/lib/demo";
import { generateJson, llmConfigurado, LlmError, modeloDe } from "@/lib/llm";

export const dynamic = "force-dynamic";

/**
 * GET /api/health        -> estado de la configuración
 * GET /api/health?llm=1  -> además hace una llamada mínima al modelo
 */
export async function GET(req: Request) {
  const probarLlm = new URL(req.url).searchParams.get("llm") === "1";

  const estado = {
    ok: true,
    demoMode: demoActivo(),
    llmConfigurado: llmConfigurado(),
    modeloSmart: modeloDe("smart"),
    modeloFast: modeloDe("fast"),
    db: dbMode(),
    llm: "no probado" as string,
  };

  if (probarLlm && llmConfigurado()) {
    try {
      const { data, uso } = await generateJson({
        system: "Responde solo JSON.",
        user: 'Devuelve {"ok": true} si estás funcionando.',
        schema: z.object({ ok: z.boolean() }),
        tier: "fast",
      });
      estado.llm = data.ok ? `ok (${uso.model}, ${uso.tokensIn + uso.tokensOut} tokens)` : "respuesta inesperada";
    } catch (error) {
      estado.llm = error instanceof LlmError ? `${error.code}: ${error.message}` : "error desconocido";
    }
  }

  return NextResponse.json(estado);
}
