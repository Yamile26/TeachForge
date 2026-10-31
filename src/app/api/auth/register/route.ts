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

  const role = perfil.role ?? roleFromYears(years_experience);
  const ahora = new Date().toISOString();
  const datosPerfil = {
    email: normalizedEmail,
    institution_email: normalizedInstitutionEmail,
    years_experience,
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
    terms_accepted_at: perfil.accepts_terms ? ahora : null,
  };

  // Con la clave de servicio la cuenta se crea ya confirmada y sin enviar correo: el
  // servidor de correo gratuito de Supabase permite muy pocos envíos por hora y bloqueaba
  // el registro («email rate limit exceeded»). El perfil queda también en user_metadata,
  // así se conserva aunque la tabla profiles todavía no exista.
  const admin = createSupabaseServiceClient();
  let userId: string | undefined;
  let confirmada = false;

  if (admin) {
    const { data, error } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: datosPerfil,
    });
    if (error) return errorRegistro(error.message);
    userId = data.user?.id;
    confirmada = true;
  } else {
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
      options: { data: datosPerfil },
    });
    if (error) return errorRegistro(error.message);
    userId = data.user?.id;
    confirmada = Boolean(data.user?.email_confirmed_at);
  }

  // La tabla profiles es opcional: si no existe todavía, el registro igual se completa.
  let perfilGuardado = false;
  if (admin && userId) {
    const { error: profileError } = await admin
      .from("profiles")
      .upsert({ id: userId, ...datosPerfil, email_verified: confirmada, created_at: ahora, updated_at: ahora });
    perfilGuardado = !profileError;
    if (profileError) console.error("[register] perfil no guardado en profiles:", profileError.message);
  }

  return NextResponse.json({
    ok: true,
    user: { id: userId, email: normalizedEmail },
    profile: { role, years_experience, institutional, guardado_en_tabla: perfilGuardado },
    message: confirmada
      ? "Tu cuenta está lista. Ya puedes iniciar sesión con tu correo y contraseña."
      : "Registro exitoso. Revisa tu correo para confirmar la cuenta.",
  });
}

// Traduce los errores de Supabase Auth a mensajes que el docente pueda resolver.
function errorRegistro(mensaje: string) {
  const m = mensaje.toLowerCase();
  if (m.includes("already") || m.includes("registered") || m.includes("exists")) {
    return errorJson("Ya existe una cuenta con ese correo. Inicia sesión o usa otro correo.", 409, mensaje);
  }
  if (m.includes("rate limit")) {
    return errorJson("Hubo demasiados registros seguidos. Espera unos minutos e inténtalo de nuevo.", 429, mensaje);
  }
  if (m.includes("password")) {
    return errorJson("La contraseña no cumple los requisitos. Usa al menos 8 caracteres, con letras y números.", 422, mensaje);
  }
  if (m.includes("email") && m.includes("invalid")) {
    return errorJson("Ese correo no es válido. Revisa que esté bien escrito.", 422, mensaje);
  }
  return errorJson("No se pudo crear la cuenta.", 400, mensaje);
}
