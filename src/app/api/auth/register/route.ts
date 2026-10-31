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

  const { email, password, years_experience, institution_email, ...perfil } = body.data;
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedInstitutionEmail = (institution_email ?? normalizedEmail).trim().toLowerCase();
  // Muchos docentes de colegios públicos usan correo personal: se acepta cualquiera y
  // el dominio institucional solo marca la cuenta como verificada.
  const institutional = validateInstitutionalEmail(normalizedInstitutionEmail);

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

  const role = perfil.role ?? roleFromYears(years_experience);
  const profilePayload = {
    id: data.user?.id,
    email: normalizedEmail,
    institution_email: normalizedInstitutionEmail,
    years_experience: years_experience,
    role,
    institutional_email: institutional,
    first_name: perfil.first_name ?? null,
    last_name: perfil.last_name ?? null,
    phone: perfil.phone ?? null,
    status: perfil.status ?? null,
    levels: perfil.levels ?? [],
    areas: perfil.areas ?? [],
    training_institution: perfil.training_institution ?? null,
    school_name: perfil.school_name ?? null,
    school_code: perfil.school_code ?? null,
    school_type: perfil.school_type ?? null,
    region: perfil.region ?? null,
    ugel: perfil.ugel ?? null,
    zone: perfil.zone ?? null,
    public_alias: perfil.public_alias ?? null,
    consents_cases: perfil.consents_cases ?? false,
    wants_news: perfil.wants_news ?? false,
    terms_accepted_at: perfil.accepts_terms ? new Date().toISOString() : null,
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
    profile: { role, years_experience, institutional },
    message: "Registro exitoso. Revisa tu correo para confirmar la cuenta.",
  });
}
