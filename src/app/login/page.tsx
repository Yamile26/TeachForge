import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceClient } from "@/lib/auth";
import { errorJson } from "@/lib/http";

const QuerySchema = z.object({
  userId: z.string().min(1),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ userId: url.searchParams.get("userId") });

  if (!parsed.success) {
    return errorJson("Falta el identificador del usuario.", 400);
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return errorJson("Faltan variables de entorno de Supabase para consultar el perfil.", 500);
  }

  const { data, error } = await service.from("profiles").select("*").eq("id", parsed.data.userId).maybeSingle();

  if (error) {
    return errorJson("No se pudo consultar el perfil.", 500, error.message);
  }

  return NextResponse.json({ ok: true, profile: data ?? null });
}
