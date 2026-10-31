import { NextResponse } from "next/server";
import { errorJson } from "@/lib/http";
import { perfilDe } from "@/lib/profile";

export const dynamic = "force-dynamic";

/**
 * GET /api/profile?alias=X
 * Devuelve la evolución por competencia (último puntaje + historial) y la
 * siguiente práctica: la competencia más baja manda (regla simple, sin IA).
 */
export async function GET(req: Request) {
  const alias = new URL(req.url).searchParams.get("alias");
  if (!alias) return errorJson("Falta el parámetro alias.", 422);

  try {
    const perfil = await perfilDe(alias);
    if (perfil.attempts === 0) {
      return NextResponse.json({ ...perfil, message: "Todavía no hay intentos para este alias." });
    }
    return NextResponse.json(perfil);
  } catch (error) {
    return errorJson(error instanceof Error ? error.message : "Error al leer el perfil", 500);
  }
}
