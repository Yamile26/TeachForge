import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";
import { demoActivo } from "./demo";
import { generateJson } from "./llm";

export type CurriculumCitation = {
  document: string;
  page: number;
  section: string;
  snippet: string;
};

export type CurriculumChunk = {
  document: string;
  page: number;
  section: string;
  text: string;
};

export const CURRICULUM_DOCUMENT = {
  id: "curriculum-secundaria",
  name: "6791708-programa-curricular-de-educacion-secundaria.pdf",
  path: path.join(process.cwd(), "6791708-programa-curricular-de-educacion-secundaria.pdf"),
} as const;

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

function normalizarEspacios(texto: string): string {
  return texto.replace(/\s+/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim();
}

function elegirSeccion(texto: string, pagina: number): string {
  const lineas = texto
    .split(/\n+/)
    .map((linea) => linea.trim())
    .filter(Boolean)
    .filter((linea) => linea.length > 3 && linea.length < 140);

  const lectura = lineas.find((linea) => /^[A-ZÁÉÍÓÚÑ0-9]/.test(linea) && !/[0-9]{1,3}%/.test(linea));
  return lectura ?? `Página ${pagina}`;
}

function fragmentarPagina(pagina: number, texto: string): CurriculumChunk[] {
  const base = normalizarEspacios(texto);
  if (!base) return [];

  const frases = base
    .split(/(?<=[.!?;])\s+(?=[A-ZÁÉÍÓÚÑ0-9])/)
    .map((frase) => frase.trim())
    .filter(Boolean);

  if (frases.length === 0) {
    return [{ document: CURRICULUM_DOCUMENT.name, page: pagina, section: `Página ${pagina}`, text: base }];
  }

  const chunks: CurriculumChunk[] = [];
  let acumulado = "";

  for (const frase of frases) {
    if (acumulado && acumulado.length + frase.length > 850) {
      chunks.push({
        document: CURRICULUM_DOCUMENT.name,
        page: pagina,
        section: elegirSeccion(acumulado, pagina),
        text: acumulado.trim(),
      });
      acumulado = frase;
      continue;
    }
    acumulado = acumulado ? `${acumulado} ${frase}` : frase;
  }

  if (acumulado) {
    chunks.push({
      document: CURRICULUM_DOCUMENT.name,
      page: pagina,
      section: elegirSeccion(acumulado, pagina),
      text: acumulado.trim(),
    });
  }

  return chunks;
}

export async function extraerPdfCurriculum(pathPdf = CURRICULUM_DOCUMENT.path): Promise<CurriculumChunk[]> {
  if (!fs.existsSync(pathPdf)) {
    throw new Error(`No se encontró el PDF del currículo en: ${pathPdf}`);
  }

  const data = new Uint8Array(fs.readFileSync(pathPdf));
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const chunks: CurriculumChunk[] = [];

  for (let page = 1; page <= pdf.numPages; page += 1) {
    const pageObj = await pdf.getPage(page);
    const contenido = await pageObj.getTextContent();
    const texto = contenido.items
      .map((item) => ("str" in item ? String(item.str) : ""))
      .join(" ");

    chunks.push(...fragmentarPagina(page, texto));
  }

  return chunks;
}

function scoreChunk(question: string, chunk: CurriculumChunk): number {
  const pregunta = normalizarEspacios(question).toLowerCase();
  const texto = `${chunk.section} ${chunk.text}`.toLowerCase();
  const terminos = pregunta
    .split(/\s+/)
    .map((palabra) => palabra.replace(/[^a-záéíóúñ0-9]/g, ""))
    .filter((palabra) => palabra.length > 2);

  if (!terminos.length) return 0;

  const hits = terminos.filter((term) => texto.includes(term)).length;
  const sectionHits = terminos.filter((term) => chunk.section.toLowerCase().includes(term)).length;
  return hits * 3 + sectionHits * 2;
}

export async function recuperarContextoCurriculum(question: string): Promise<CurriculumChunk[]> {
  const chunks = await extraerPdfCurriculum();
  return chunks
    .map((chunk) => ({ ...chunk, score: scoreChunk(question, chunk) }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ score, ...chunk }) => chunk);
}

export async function responderPreguntaCurriculum(question: string): Promise<{
  answer: string;
  citations: CurriculumCitation[];
  source: "live" | "demo";
  uso: null | { model: string; tokensIn: number; tokensOut: number; costUsd: number };
  intentos: number;
}> {
  if (demoActivo()) {
    return {
      answer:
        "Modo demostración: aún no hay una respuesta real del currículo en esta sesión. Para usar la sección Aprende con evidencia real, añade OPENAI_API_KEY y deja el PDF del currículo disponible en la raíz del proyecto.",
      citations: [
        {
          document: CURRICULUM_DOCUMENT.name,
          page: 1,
          section: "Demostración",
          snippet: "Este contenido es un ejemplo de demostración y no proviene del currículo real.",
        },
      ],
      source: "demo",
      uso: null,
      intentos: 0,
    };
  }

  const contexto = await recuperarContextoCurriculum(question);
  if (!contexto.length) {
    return {
      answer:
        "No encontré evidencia suficiente en el currículo para responder con precisión. La pregunta no coincide con los fragmentos del documento disponible, así que no quiero inventar una respuesta.",
      citations: [],
      source: "live",
      uso: null,
      intentos: 0,
    };
  }

  const promptContext = contexto
    .map(
      (chunk) =>
        `[Documento: ${chunk.document}] [Página: ${chunk.page}] [Sección: ${chunk.section}]\n${chunk.text}`,
    )
    .join("\n\n---\n\n");

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
}
