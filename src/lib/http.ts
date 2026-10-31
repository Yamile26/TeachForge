import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export function errorJson(mensaje: string, status = 400, detalles?: unknown) {
  return NextResponse.json({ error: mensaje, detalles }, { status });
}

export async function leerBody<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let crudo: unknown;
  try {
    crudo = await req.json();
  } catch {
    return { ok: false, response: errorJson("El cuerpo debe ser JSON válido.", 400) };
  }

  const resultado = schema.safeParse(crudo);
  if (!resultado.success) {
    return {
      ok: false,
      response: errorJson("Datos inválidos.", 422, resultado.error.issues),
    };
  }
  return { ok: true, data: resultado.data };
}
