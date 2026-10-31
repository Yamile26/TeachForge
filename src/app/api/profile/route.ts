import { NextResponse } from "next/server";
import { historialDe } from "@/lib/db";
import { errorJson } from "@/lib/http";
import { competenciaMasDebil, RUBRICA } from "@/lib/rubric";
import { COMPETENCIAS, type Competencia } from "@/lib/schemas";

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
    const historial = await historialDe(alias);
    if (historial.length === 0) {
      return NextResponse.json({
        alias,
        attempts: 0,
        competencies: {},
        next_focus: null,
        message: "Todavía no hay intentos para este alias.",
      });
    }

    const competencies: Record<
      string,
      { nombre: string; latest: number | null; history: (number | null)[] }
    > = {};

    for (const competencia of COMPETENCIAS) {
      const serie = historial
        .flatMap((intento) => (Array.isArray(intento.scores) ? intento.scores : []))
        .filter((s) => s.competencia === competencia)
        .map((s) => s.puntaje);
      if (serie.length === 0) continue;
      competencies[competencia] = {
        nombre: RUBRICA[competencia].nombre,
        latest: serie[serie.length - 1] ?? null,
        history: serie,
      };
    }

    const ultimo = historial[historial.length - 1];
    const scores = Array.isArray(ultimo.scores) ? ultimo.scores : [];
    const nextFocus: Competencia | null =
      competenciaMasDebil(scores.map((s) => ({ competencia: s.competencia, puntaje: s.puntaje }))) ??
      (ultimo.next_focus as Competencia | undefined) ??
      null;

    return NextResponse.json({
      alias,
      attempts: historial.length,
      competencies,
      next_focus: nextFocus,
    });
  } catch (error) {
    return errorJson(error instanceof Error ? error.message : "Error al leer el perfil", 500);
  }
}
