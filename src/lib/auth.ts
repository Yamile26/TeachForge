import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const INSTITUTIONAL_EMAIL_DOMAINS = [
  "minedu.gob.pe",
  "educa.pe",
  "unprg.edu.pe",
  "upan.edu.pe",
  "ucv.edu.pe",
  "pucp.edu.pe",
  "upn.edu.pe",
  "up.edu.pe",
  "gmail.com",
];

export const PerfilRoleSchema = z.enum(["veterano", "novato"]);
export type PerfilRole = z.infer<typeof PerfilRoleSchema>;

export function roleFromYears(years: number): PerfilRole {
  return years >= 15 ? "veterano" : "novato";
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateInstitutionalEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  const domain = normalized.split("@")?.[1]?.toLowerCase() ?? "";
  return Boolean(domain) && INSTITUTIONAL_EMAIL_DOMAINS.includes(domain);
}

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) {
    return null;
  }
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const RegisterRequestSchema = z.object({
  email: z.string().min(5).email(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  years_experience: z.number().int().min(0).max(60),
  institution_email: z.string().email().optional(),
  // Datos del registro de profesores en 4 pasos; opcionales para no romper llamadas anteriores.
  first_name: z.string().trim().min(1).max(80).optional(),
  last_name: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().max(20).optional(),
  role: PerfilRoleSchema.optional(),
  status: z.string().trim().max(60).optional(),
  levels: z.array(z.enum(["inicial", "primaria", "secundaria"])).max(3).optional(),
  areas: z.array(z.string().trim().max(60)).max(10).optional(),
  training_institution: z.string().trim().max(120).optional(),
  school_name: z.string().trim().max(160).optional(),
  school_code: z.string().trim().max(10).optional(),
  school_type: z.string().trim().max(60).optional(),
  region: z.string().trim().max(40).optional(),
  ugel: z.string().trim().max(80).optional(),
  zone: z.enum(["urbana", "rural"]).optional(),
  public_alias: z.string().trim().min(2).max(60).optional(),
  accepts_terms: z.literal(true).optional(),
  consents_cases: z.boolean().optional(),
  wants_news: z.boolean().optional(),
});

export const LoginRequestSchema = z.object({
  email: z.string().min(5).email(),
  password: z.string().min(8),
});
