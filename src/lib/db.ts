import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import seedCases from "../../fixtures/seed_cases.json";
import type {
  CasoEstructurado,
  CasoGuardado,
  Evaluacion,
  Simulacion,
  TurnoDocente,
} from "./schemas";

/**
 * Almacenamiento. Dos implementaciones con la misma interfaz:
 * - Supabase (si están las variables de entorno) -> Postgres real.
 * - Memoria (si no) -> para poder correr y demostrar sin base de datos.
 * Cambiar de una a otra no requiere tocar las rutas.
 */

export type NuevoCaso = {
  author_alias: string;
  years_experience: number | null;
  subject: string;
  level: string;
  topic: string;
  raw_story: string;
  structured: CasoEstructurado;
  tags: string[];
  is_seed: boolean;
  consent_at: string | null;
  validated_by_author: boolean;
};

export type NuevoIntento = {
  case_id: string;
  learner_alias: string;
  transcript: TurnoDocente[];
  hidden_states: Simulacion["estado_oculto"];
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
};

type Row = Record<string, unknown>;

function filaACaso(row: Row): CasoGuardado {
  const structured = (row.structured ?? {}) as CasoEstructurado;
  return {
    ...structured,
    id: String(row.id),
    created_at: String(row.created_at ?? new Date().toISOString()),
    author_alias: String(row.author_alias ?? "Anónimo"),
    years_experience: (row.years_experience as number | null) ?? null,
    subject: String(row.subject ?? structured.materia ?? ""),
    level: String(row.level ?? structured.nivel ?? ""),
    topic: String(row.topic ?? structured.tema ?? ""),
    raw_story: String(row.raw_story ?? ""),
    validated_by_author: Boolean(row.validated_by_author),
    is_seed: Boolean(row.is_seed),
    consent_at: (row.consent_at as string | null) ?? null,
    tags: (row.tags as string[] | null) ?? [],
  };
}

// --- Implementación en memoria ---

type Memoria = {
  casos: CasoGuardado[];
  intentos: (NuevoIntento & { id: string; created_at: string })[];
  evaluaciones: (Evaluacion & { id: string; attempt_id: string; created_at: string })[];
};

const globalConMemoria = globalThis as unknown as { __teachforgeDb?: Memoria };

function memoria(): Memoria {
  globalConMemoria.__teachforgeDb ??= {
    casos: seedCases as CasoGuardado[],
    intentos: [],
    evaluaciones: [],
  };
  return globalConMemoria.__teachforgeDb;
}

// --- Supabase ---

function supabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function dbMode(): "supabase" | "memoria" {
  return supabase() ? "supabase" : "memoria";
}

// --- API pública del módulo ---

export async function listarCasos(): Promise<CasoGuardado[]> {
  const sb = supabase();
  if (!sb) {
    return [...memoria().casos].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const { data, error } = await sb
    .from("cases")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Supabase (listar casos): ${error.message}`);
  return (data ?? []).map(filaACaso);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function obtenerCaso(id: string): Promise<CasoGuardado | null> {
  const sb = supabase();
  if (!sb) return memoria().casos.find((c) => c.id === id) ?? null;

  // Los enlaces fijos usan el id del fixture ("seed-ecuaciones-signos"), pero en
  // Supabase la columna es uuid: se busca el caso sembrado con el mismo tema.
  if (!UUID.test(id)) {
    const seed = (seedCases as CasoGuardado[]).find((c) => c.id === id);
    if (!seed) return null;
    const { data, error } = await sb
      .from("cases")
      .select("*")
      .eq("is_seed", true)
      .eq("topic", seed.topic)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Supabase (obtener caso semilla): ${error.message}`);
    return data ? filaACaso(data as Row) : null;
  }

  const { data, error } = await sb.from("cases").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Supabase (obtener caso): ${error.message}`);
  return data ? filaACaso(data as Row) : null;
}

export async function crearCaso(input: NuevoCaso): Promise<CasoGuardado> {
  const sb = supabase();
  const ahora = new Date().toISOString();

  if (!sb) {
    const caso: CasoGuardado = {
      ...input.structured,
      id: crypto.randomUUID(),
      created_at: ahora,
      author_alias: input.author_alias,
      years_experience: input.years_experience,
      subject: input.subject,
      level: input.level,
      topic: input.topic,
      raw_story: input.raw_story,
      validated_by_author: input.validated_by_author,
      is_seed: input.is_seed,
      consent_at: input.consent_at,
      tags: input.tags,
    };
    memoria().casos.unshift(caso);
    return caso;
  }

  const { data, error } = await sb
    .from("cases")
    .insert({
      author_alias: input.author_alias,
      years_experience: input.years_experience,
      subject: input.subject,
      level: input.level,
      topic: input.topic,
      raw_story: input.raw_story,
      structured: input.structured,
      tags: input.tags,
      is_seed: input.is_seed,
      consent_at: input.consent_at,
      validated_by_author: input.validated_by_author,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Supabase (crear caso): ${error.message}`);
  return filaACaso(data as Row);
}

export async function guardarIntento(input: NuevoIntento): Promise<string> {
  const sb = supabase();
  if (!sb) {
    const id = crypto.randomUUID();
    memoria().intentos.unshift({ ...input, id, created_at: new Date().toISOString() });
    return id;
  }
  const { data, error } = await sb.from("attempts").insert(input).select("id").single();
  if (error) throw new Error(`Supabase (guardar intento): ${error.message}`);
  return String((data as { id: string }).id);
}

export async function guardarEvaluacion(
  attemptId: string,
  evaluacion: Evaluacion,
): Promise<string> {
  const sb = supabase();
  if (!sb) {
    const id = crypto.randomUUID();
    memoria().evaluaciones.unshift({
      ...evaluacion,
      id,
      attempt_id: attemptId,
      created_at: new Date().toISOString(),
    });
    return id;
  }
  const { data, error } = await sb
    .from("evaluations")
    .insert({
      attempt_id: attemptId,
      scores: evaluacion.scores,
      summary: evaluacion.summary,
      next_focus: evaluacion.next_focus,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Supabase (guardar evaluación): ${error.message}`);
  return String((data as { id: string }).id);
}

export async function historialDe(alias: string) {
  const sb = supabase();
  if (!sb) {
    // En memoria los intentos se guardan del más nuevo al más viejo; el perfil los quiere en orden.
    const intentos = memoria()
      .intentos.filter((i) => i.learner_alias === alias)
      .reverse();
    return intentos.flatMap((intento) => {
      const evaluacion = memoria().evaluaciones.find((e) => e.attempt_id === intento.id);
      return evaluacion ? [{ ...evaluacion, attempt_id: intento.id }] : [];
    });
  }
  const { data, error } = await sb
    .from("attempts")
    .select("id, created_at, learner_alias, evaluations(*)")
    .eq("learner_alias", alias)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Supabase (historial): ${error.message}`);
  return (data ?? []).flatMap((row) => {
    const evaluaciones = (row.evaluations ?? []) as Evaluacion[];
    return evaluaciones.map((e) => ({
      attempt_id: String(row.id),
      created_at: String(row.created_at),
      ...e,
    }));
  });
}
