import { NextResponse } from "next/server";
import { demoActivo, fixtureExtraccion } from "@/lib/demo";
import { errorJson, leerBody } from "@/lib/http";
import { generateJson, LlmError } from "@/lib/llm";
import { cargarPrompt } from "@/lib/prompts";
import { CasoEstructuradoSchema, ExtractRequestSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await leerBody(req, ExtractRequestSchema);
  if (!body.ok) return body.response;

  const { story, meta } = body.data;

  if (demoActivo()) {
    return NextResponse.json({
      structured: fixtureExtraccion(),
      source: "demo",
      uso: null,
      intentos: 0,
    });
  }

  const user = [
    meta?.subject || meta?.level || meta?.topic
      ? `Datos que ya sabemos: materia=${meta?.subject ?? "?"}, nivel=${meta?.level ?? "?"}, tema=${meta?.topic ?? "?"}.`
      : "",
    "RELATO DEL DOCENTE:",
    story,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const { data, uso, intentos } = await generateJson({
      system: cargarPrompt("extract_case"),
      user,
      schema: CasoEstructuradoSchema,
      tier: "smart",
      temperature: 0.2,
    });
    return NextResponse.json({ structured: data, source: "live", uso, intentos });
  } catch (error) {
    if (error instanceof LlmError) {
      return errorJson(`No se pudo estructurar el caso (${error.code}).`, 502, error.message);
    }
    return errorJson("Error inesperado al estructurar el caso.", 500);
  }
}
