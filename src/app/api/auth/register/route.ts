import { NextResponse } from "next/server";
import {
  createSupabaseBrowserClient,
  createSupabaseServiceClient,
  RegisterRequestSchema,
  roleFromYears,
  validateInstitutionalEmail,
} from "@/lib/auth";
import { errorJson, leerBody } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await leerBody(req, RegisterRequestSchema);
  if (!body.ok) return body.response;

  const { email, password, years_experience, institution_email } = body.data;
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedInstitutionEmail = (institution_email ?? normalizedEmail).trim().toLowerCase();

  if (!validateInstitutionalEmail(normalizedInstitutionEmail)) {
    return errorJson(
      "Debes usar un correo institucional válido. Ejemplos: minedu.gob.pe, unprg.edu.pe, upa.edu.pe, etc.",
      422,
    );
  }

  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return errorJson(
      "Falta configurar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY para el registro.",
      500,
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
  });

  if (error) {
    return errorJson("No se pudo registrar el usuario.", 400, error.message);
  }

  const role = roleFromYears(years_experience);
  const profilePayload = {
    id: data.user?.id,
    email: normalizedEmail,
    institution_email: normalizedInstitutionEmail,
    years_experience: years_experience,
    role,
    email_verified: Boolean(data.user?.email_confirmed_at),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const serviceClient = createSupabaseServiceClient();
  if (!serviceClient) {
    return errorJson(
      "Falta configurar SUPABASE_SERVICE_KEY para guardar el perfil del usuario.",
      500,
    );
  }

  const { error: profileError } = await serviceClient.from("profiles").upsert(profilePayload).eq("id", data.user?.id ?? "");

  if (profileError) {
    return errorJson("El usuario se registró, pero no pudimos guardar el perfil.", 500, profileError.message);
  }

  return NextResponse.json({
    ok: true,
    user: data.user,
    profile: { role, years_experience },
    message: "Registro exitoso. Revisa tu correo institucional para confirmar la cuenta.",
  });
}
