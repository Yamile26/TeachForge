import { NextResponse } from "next/server";
import { crearCaso, dbMode, listarCasos } from "@/lib/db";
import { errorJson, leerBody } from "@/lib/http";
import { CreateCaseRequestSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/** GET /api/cases -> biblioteca. Real vs Ejemplo se distingue con is_seed. */
export async function GET() {
  try {
    const casos = await listarCasos();
    return NextResponse.json({
      db: dbMode(),
      cases: casos.map((c) => ({
        id: c.id,
        titulo: c.titulo,
        materia: c.materia,
        nivel: c.nivel,
        tema: c.tema,
        author_alias: c.author_alias,
        is_seed: c.is_seed,
        validated_by_author: c.validated_by_author,
        tags: c.tags,
        created_at: c.created_at,
      })),
    });
  } catch (error) {
    return errorJson(error instanceof Error ? error.message : "Error al listar casos", 500);
  }
}

/** POST /api/cases -> guarda el caso ya revisado y validado por el docente. */
export async function POST(req: Request) {
  const body = await leerBody(req, CreateCaseRequestSchema);
  if (!body.ok) return body.response;

  const { consent, ...resto } = body.data;
  if (!consent) return errorJson("Se necesita consentimiento explícito para guardar.", 422);

  try {
    const caso = await crearCaso({
      ...resto,
      years_experience: resto.years_experience ?? null,
      tags: resto.tags ?? [],
      is_seed: false,
      validated_by_author: true,
      consent_at: new Date().toISOString(),
    });
    return NextResponse.json({ id: caso.id, case: caso }, { status: 201 });
  } catch (error) {
    return errorJson(error instanceof Error ? error.message : "Error al guardar el caso", 500);
  }
}
