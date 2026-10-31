import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { demoActivo } from "./demo";
import { generateJson } from "./llm";

/**
 * Sección Aprende: responde preguntas sobre el programa curricular citando la página.
 *
 * El PDF del repo (6791708-programa-curricular-de-educacion-secundaria.pdf) es escaneado:
 * son imágenes sin capa de texto, así que no se puede leer en tiempo de ejecución. El texto
 * se busca en un índice ya extraído, data/curriculo-secundaria.json, con la forma
 * { document, pages: [{ page, text }] }. Ese índice se genera pasando el PDF por OCR
 * (o desde la versión con texto del Minedu). Mientras no exista, la sección lo dice
 * en lugar de inventar.
 */

export type CurriculumCitation = {
  document: string;
  page: number;
  section: string;
  snippet: string;
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

export type CurriculumAnswer = {
  answer: string;
  citations: CurriculumCitation[];
  source: "live" | "demo" | "sin_indice";
  uso: null | { model: string; tokensIn: number; tokensOut: number; costUsd: number };
  intentos: number;
};

function normalizarEspacios(texto: string): string {
  return texto.replace(/\s+/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim();
}

function sinTildes(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

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

function puntaje(terminos: string[], chunk: CurriculumChunk): number {
  const texto = sinTildes(`${chunk.section} ${chunk.text}`);
  const seccion = sinTildes(chunk.section);
  return terminos.reduce(
    (total, t) => total + (texto.includes(t) ? 3 : 0) + (seccion.includes(t) ? 2 : 0),
    0,
  );
}

function recuperarContexto(question: string, chunks: CurriculumChunk[]): CurriculumChunk[] {
  const terminos = sinTildes(question)
    .split(/\s+/)
    .map((p) => p.replace(/[^a-z0-9ñ]/g, ""))
    .filter((p) => p.length > 3);
  if (!terminos.length) return [];
  return chunks
    .map((chunk) => ({ chunk, score: puntaje(terminos, chunk) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((c) => c.chunk);
}

export async function responderPreguntaCurriculum(question: string): Promise<CurriculumAnswer> {
  const chunks = cargarIndice();

  if (!chunks.length) {
    return {
      answer:
        "Todavía no puedo citar el currículo: el PDF cargado es escaneado (solo imágenes, sin texto). " +
        "Para activar esta sección hay que pasarlo por OCR o usar la versión con texto publicada por el Minedu, " +
        "y guardar el resultado en data/curriculo-secundaria.json. No respondo sin evidencia del documento.",
      citations: [],
      source: "sin_indice",
      uso: null,
      intentos: 0,
    };
  }

  const contexto = recuperarContexto(question, chunks);
  if (!contexto.length) {
    return {
      answer:
        "No encontré evidencia suficiente en el currículo para responder con precisión, así que no quiero inventar una respuesta.",
      citations: [],
      source: "live",
      uso: null,
      intentos: 0,
    };
  }

  const citasDirectas = contexto.map(({ document, page, section, snippet }) => ({ document, page, section, snippet }));

  // Sin modelo disponible, se muestran los fragmentos encontrados tal cual.
  if (demoActivo()) {
    return {
      answer: "Estos son los fragmentos del currículo que mejor coinciden con tu pregunta.",
      citations: citasDirectas,
      source: "demo",
      uso: null,
      intentos: 0,
    };
  }

  const promptContext = contexto
    .map((c) => `[Documento: ${c.document}] [Página: ${c.page}] [Sección: ${c.section}]\n${c.text}`)
    .join("\n\n---\n\n");

  try {
    const resultado = await generateJson({
      system:
        "Eres un asistente pedagógico y solo debes responder con información que aparezca en los fragmentos del currículo. Si la evidencia no alcanza para responder, dilo claramente y evita inventar. Devuelve JSON con campos: answer y citations. Cada cita debe incluir document, page, section y snippet.",
      user: `Pregunta del usuario: ${question}\n\nFragmentos relevantes del currículo:\n${promptContext}`,
      schema: CurriculumAnswerSchema,
      tier: "smart",
      temperature: 0.2,
    });

    return {
      answer: resultado.data.answer,
      citations: resultado.data.citations,
      source: "live",
      uso: {
        model: resultado.uso.model,
        tokensIn: resultado.uso.tokensIn,
        tokensOut: resultado.uso.tokensOut,
        costUsd: resultado.uso.costUsd,
      },
      intentos: resultado.intentos,
    };
  } catch {
    return {
      answer:
        "El modelo no respondió a tiempo. Estos son los fragmentos del currículo que mejor coinciden con tu pregunta.",
      citations: citasDirectas,
      source: "live",
      uso: null,
      intentos: 0,
    };
  }
}
