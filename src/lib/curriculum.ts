import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { listarCasos } from "./db";
import { demoActivo } from "./demo";
import { generateJson } from "./llm";
import { RUBRICA } from "./rubric";
import type { CasoGuardado } from "./schemas";

/**
 * Sección Aprende: el docente pregunta por su próxima clase y recibe
 * 1) recomendaciones de la IA apoyadas en los casos validados por veteranos y en la rúbrica, y
 * 2) citas del programa curricular, cuando el texto del currículo está disponible.
 *
 * El PDF del repo (6791708-programa-curricular-de-educacion-secundaria.pdf) es escaneado:
 * son imágenes sin capa de texto. Las citas del currículo salen de un índice ya extraído,
 * data/curriculo-secundaria.json ({ document, pages: [{ page, text }] }), que se genera
 * pasando el PDF por OCR. Mientras no exista, la sección lo dice y no inventa páginas.
 */

export type CurriculumCitation = {
  document: string;
  page: number;
  section: string;
  snippet: string;
};

export type CasoRelacionado = {
  id: string;
  titulo: string;
  autor: string;
  esEjemplo: boolean;
  estrategia: string;
};

type CurriculumChunk = CurriculumCitation & { text: string };

type Indice = { document: string; pages: { page: number; text: string }[] };

const DOCUMENTO = "6791708-programa-curricular-de-educacion-secundaria.pdf";
const RUTA_INDICE = path.join(process.cwd(), "data", "curriculo-secundaria.json");

const CurriculumAnswerSchema = z.object({
  answer: z.string().min(1),
  citations: z.array(
    z.object({
      document: z.string(),
      page: z.number().int().min(1),
      section: z.string().min(1),
      snippet: z.string().min(1),
    }),
  ),
});

const RecomendacionesSchema = z.object({
  answer: z.string().min(1).max(900),
  recomendaciones: z.array(z.string().min(1).max(320)).min(3).max(5),
});

export type CurriculumAnswer = {
  answer: string;
  citations: CurriculumCitation[];
  recomendaciones: string[];
  casos: CasoRelacionado[];
  /** Avisos para el docente: de dónde sale la respuesta y qué falta. */
  avisos: string[];
  source: "live" | "demo";
  uso: null | { model: string; tokensIn: number; tokensOut: number; costUsd: number };
  intentos: number;
};

const AVISO_SIN_INDICE =
  "Todavía no hay citas del currículo: el PDF cargado es escaneado (solo imágenes). Las recomendaciones salen de los casos validados por veteranos y de la rúbrica de TeachForge.";

function normalizarEspacios(texto: string): string {
  return texto.replace(/\s+/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim();
}

function sinTildes(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function terminosDe(pregunta: string): string[] {
  return sinTildes(pregunta)
    .split(/\s+/)
    .map((p) => p.replace(/[^a-z0-9ñ]/g, ""))
    .filter((p) => p.length > 3);
}

// --- Currículo (citas) ---

function elegirSeccion(texto: string, pagina: number): string {
  const linea = texto
    .split(/\n+/)
    .map((l) => l.trim())
    .find((l) => l.length > 3 && l.length < 140 && /^[A-ZÁÉÍÓÚÑ0-9]/.test(l));
  return linea ?? `Página ${pagina}`;
}

function fragmentarPagina(document: string, pagina: number, texto: string): CurriculumChunk[] {
  const section = elegirSeccion(texto, pagina);
  const frases = normalizarEspacios(texto)
    .split(/(?<=[.!?;])\s+(?=[A-ZÁÉÍÓÚÑ0-9])/)
    .filter(Boolean);

  const chunks: CurriculumChunk[] = [];
  let acumulado = "";
  for (const frase of frases) {
    if (acumulado && acumulado.length + frase.length > 850) {
      chunks.push({ document, page: pagina, section, snippet: acumulado.slice(0, 280), text: acumulado });
      acumulado = frase;
    } else {
      acumulado = acumulado ? `${acumulado} ${frase}` : frase;
    }
  }
  if (acumulado) {
    chunks.push({ document, page: pagina, section, snippet: acumulado.slice(0, 280), text: acumulado });
  }
  return chunks;
}

let cache: CurriculumChunk[] | null = null;

function cargarIndice(): CurriculumChunk[] {
  if (cache) return cache;
  if (!fs.existsSync(RUTA_INDICE)) return [];
  const indice = JSON.parse(fs.readFileSync(RUTA_INDICE, "utf8")) as Indice;
  cache = indice.pages.flatMap((p) => fragmentarPagina(indice.document || DOCUMENTO, p.page, p.text));
  return cache;
}

function recuperarCurriculo(terminos: string[], chunks: CurriculumChunk[]): CurriculumChunk[] {
  if (!terminos.length) return [];
  return chunks
    .map((chunk) => {
      const texto = sinTildes(`${chunk.section} ${chunk.text}`);
      const seccion = sinTildes(chunk.section);
      const score = terminos.reduce((t, x) => t + (texto.includes(x) ? 3 : 0) + (seccion.includes(x) ? 2 : 0), 0);
      return { chunk, score };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((c) => c.chunk);
}

// --- Casos de la biblioteca ---

function textoDeCaso(c: CasoGuardado): string {
  return [
    c.titulo,
    c.materia,
    c.nivel,
    c.tema,
    c.concepto_clave,
    c.error_frecuente?.descripcion,
    c.error_frecuente?.por_que_ocurre,
    c.estrategia_que_funciono?.descripcion,
    c.senal_de_comprension,
  ]
    .filter(Boolean)
    .join(" ");
}

async function casosRelacionados(terminos: string[]): Promise<CasoGuardado[]> {
  const casos = await listarCasos().catch(() => [] as CasoGuardado[]);
  const validados = casos.filter((c) => c.validated_by_author);
  const puntuados = validados
    .map((c) => {
      const texto = sinTildes(textoDeCaso(c));
      return { c, score: terminos.filter((t) => texto.includes(t)).length };
    })
    .sort((a, b) => b.score - a.score);
  const conCoincidencia = puntuados.filter((p) => p.score > 0).map((p) => p.c);
  return (conCoincidencia.length ? conCoincidencia : []).slice(0, 2);
}

function resumenCaso(c: CasoGuardado): CasoRelacionado {
  return {
    id: c.id,
    titulo: c.titulo,
    autor: c.author_alias,
    esEjemplo: c.is_seed,
    estrategia: c.estrategia_que_funciono?.descripcion ?? "",
  };
}

// Recomendaciones sin modelo: los pasos de la rúbrica en su nivel 3 y lo que hizo el veterano.
function recomendacionesPorReglas(casos: CasoGuardado[]): string[] {
  const recs: string[] = [];
  for (const c of casos) {
    if (c.estrategia_que_funciono?.descripcion) {
      recs.push(`Del caso «${c.titulo}»: ${c.estrategia_que_funciono.descripcion}`);
    }
    if (c.senal_de_comprension) recs.push(`Señal de que entendieron, según el veterano: ${c.senal_de_comprension}`);
  }
  recs.push(`Antes de explicar: ${RUBRICA.diagnostico_del_error.anclas[3]}`);
  recs.push(`Para explicar: ${RUBRICA.estrategia_de_explicacion.anclas[3]}`);
  recs.push(`Para verificar: ${RUBRICA.verificacion_de_la_comprension.anclas[3]}`);
  return recs.slice(0, 5);
}

const SYSTEM_RECOMENDACIONES = [
  "Eres un acompañante pedagógico para docentes de secundaria del Perú, sobre todo docentes nuevos.",
  "Responde la consulta del docente con recomendaciones prácticas para su próxima clase.",
  "Apóyate primero en los CASOS VALIDADOS POR VETERANOS que te pasamos (menciona el caso por su título cuando lo uses) y en la RÚBRICA.",
  "No cites el currículo nacional, normas ni páginas: no tienes ese texto. No inventes datos ni estadísticas.",
  "Escribe en español claro, con frases cortas, como le hablaría un colega con experiencia.",
  "Devuelve SOLO JSON: {\"answer\": string (2 a 4 frases), \"recomendaciones\": [3 a 5 acciones concretas]}.",
].join("\n");

function rubricaBreve(): string {
  return Object.values(RUBRICA)
    .map((r) => `- ${r.nombre}: lo mejor es «${r.anclas[3]}»`)
    .join("\n");
}

export async function responderPreguntaCurriculum(question: string): Promise<CurriculumAnswer> {
  const terminos = terminosDe(question);
  const [casos, contexto] = await Promise.all([casosRelacionados(terminos), Promise.resolve(recuperarCurriculo(terminos, cargarIndice()))]);
  const casosResumen = casos.map(resumenCaso);
  const avisos = cargarIndice().length ? [] : [AVISO_SIN_INDICE];
  if (casos.some((c) => c.is_seed)) avisos.push("Algunos casos usados son de ejemplo, no de un veterano real.");

  const citasDirectas = contexto.map(({ document, page, section, snippet }) => ({ document, page, section, snippet }));

  if (demoActivo()) {
    return {
      answer: "Estas recomendaciones salen de los casos validados por veteranos y de la rúbrica de TeachForge.",
      citations: citasDirectas,
      recomendaciones: recomendacionesPorReglas(casos),
      casos: casosResumen,
      avisos,
      source: "demo",
      uso: null,
      intentos: 0,
    };
  }

  try {
    const bloques = [
      `CONSULTA DEL DOCENTE: ${question}`,
      casos.length
        ? `CASOS VALIDADOS POR VETERANOS:\n${casos.map((c) => JSON.stringify({ titulo: c.titulo, autor: c.author_alias, ejemplo: c.is_seed, nivel: c.nivel, error: c.error_frecuente, estrategia: c.estrategia_que_funciono, lo_que_no_funciono: c.lo_que_no_funciono, senal_de_comprension: c.senal_de_comprension })).join("\n")}`
        : "CASOS VALIDADOS POR VETERANOS: ninguno coincide con la consulta.",
      `RÚBRICA:\n${rubricaBreve()}`,
    ];

    const [recs, curr] = await Promise.all([
      generateJson({ system: SYSTEM_RECOMENDACIONES, user: bloques.join("\n\n"), schema: RecomendacionesSchema, tier: "smart", temperature: 0.4 }),
      contexto.length
        ? generateJson({
            system:
              "Eres un asistente pedagógico y solo debes responder con información que aparezca en los fragmentos del currículo. Si la evidencia no alcanza, dilo. Devuelve JSON con answer y citations (document, page, section, snippet).",
            user: `Pregunta: ${question}\n\nFragmentos del currículo:\n${contexto.map((c) => `[Documento: ${c.document}] [Página: ${c.page}] [Sección: ${c.section}]\n${c.text}`).join("\n\n---\n\n")}`,
            schema: CurriculumAnswerSchema,
            tier: "smart",
            temperature: 0.2,
          }).catch(() => null)
        : Promise.resolve(null),
    ]);

    const uso = {
      model: recs.uso.model,
      tokensIn: recs.uso.tokensIn + (curr?.uso.tokensIn ?? 0),
      tokensOut: recs.uso.tokensOut + (curr?.uso.tokensOut ?? 0),
      costUsd: Math.round((recs.uso.costUsd + (curr?.uso.costUsd ?? 0)) * 1e6) / 1e6,
    };

    return {
      answer: curr ? `${recs.data.answer}\n\nSegún el currículo: ${curr.data.answer}` : recs.data.answer,
      citations: curr?.data.citations ?? citasDirectas,
      recomendaciones: recs.data.recomendaciones,
      casos: casosResumen,
      avisos,
      source: "live",
      uso,
      intentos: recs.intentos,
    };
  } catch (error) {
    // Respaldo automático: si el modelo no responde, recomendaciones por reglas.
    console.error("[aprende] respaldo por reglas:", error);
    return {
      answer: "El modelo no respondió a tiempo. Estas recomendaciones salen de los casos validados y de la rúbrica.",
      citations: citasDirectas,
      recomendaciones: recomendacionesPorReglas(casos),
      casos: casosResumen,
      avisos,
      source: "demo",
      uso: null,
      intentos: 0,
    };
  }
}
