/**
 * Siembra los casos de ejemplo en Supabase (idempotente: no duplica si ya hay).
 * Uso: npm run seed
 *
 * Los seed del fixture tienen ids tipo "seed-ecuaciones-signos", pero la tabla
 * usa uuid, así que aquí se genera un uuid real para cada uno.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY. Copia .env.example a .env.local.");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const seeds = JSON.parse(readFileSync("fixtures/seed_cases.json", "utf8"));

const CAMPOS_ESTRUCTURADOS = [
  "titulo",
  "materia",
  "nivel",
  "tema",
  "concepto_clave",
  "error_frecuente",
  "estrategia_que_funciono",
  "lo_que_no_funciono",
  "senal_de_comprension",
  "contexto_aula",
  "perfiles_estudiantes",
  "campos_faltantes",
];

const { data: existentes, error: errorLectura } = await sb
  .from("cases")
  .select("id")
  .eq("is_seed", true);

if (errorLectura) {
  console.error("No pude leer la tabla cases:", errorLectura.message);
  process.exit(1);
}

if (existentes?.length) {
  console.log(`Ya hay ${existentes.length} casos de ejemplo. No hago nada.`);
  process.exit(0);
}

const filas = seeds.map((c) => ({
  author_alias: c.author_alias,
  years_experience: c.years_experience ?? null,
  subject: c.subject,
  level: c.level,
  topic: c.topic,
  raw_story: c.raw_story,
  structured: Object.fromEntries(CAMPOS_ESTRUCTURADOS.map((k) => [k, c[k]])),
  tags: c.tags ?? [],
  validated_by_author: c.validated_by_author ?? true,
  is_seed: true,
  consent_at: c.consent_at ?? null,
}));

const { data, error } = await sb.from("cases").insert(filas).select("id, topic");

if (error) {
  console.error("Insert falló:", error.message);
  process.exit(1);
}

console.log(`Insertados ${data.length} casos de ejemplo:`);
for (const fila of data) console.log(` - ${fila.id}  ${fila.topic}`);
