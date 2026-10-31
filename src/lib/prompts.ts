import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Los prompts viven en /prompts como markdown legible: así se pueden mostrar,
 * revisar con un docente y versionar sin tocar código.
 * next.config.ts incluye esa carpeta en el bundle de las rutas /api.
 */

export type PromptName =
  | "extract_case"
  | "simulate_students"
  | "evaluate_attempt"
  | "generate_seed_cases";

const cache = new Map<PromptName, string>();

export function cargarPrompt(name: PromptName): string {
  const enCache = cache.get(name);
  if (enCache) return enCache;

  const ruta = path.join(process.cwd(), "prompts", `${name}.md`);
  const contenido = readFileSync(ruta, "utf8");
  cache.set(name, contenido);
  return contenido;
}
