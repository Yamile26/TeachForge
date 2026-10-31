import { NextResponse } from "next/server";
import { z } from "zod";
import { respondersPreguntaCurriculum } from "@/lib/curriculum";
import { errorJson, leerBody } from "@/lib/http";

const AprenderRequestSchema = z.object({
  question: z.string().min(6, "La pregunta es demasiado corta."),
  documentId: z.string().optional(),
});

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await leerBody(req, AprenderRequestSchema);
  if (!body.ok) return body.response;

  const { question, documentId } = body.data;

  try {
    const respuesta = await respondersPreguntaCurriculum(question);
    return NextResponse.json({
      question,
      documentId: documentId ?? "curriculum-secundaria",
      ...respuesta,
    });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error inesperado.";
    return errorJson("No se pudo consultar el currículo.", 500, mensaje);
  }
}
