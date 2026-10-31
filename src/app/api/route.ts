import { NextResponse } from "next/server";
import seedCases from "../../../fixtures/seed_cases.json";
import { dbMode } from "@/lib/db";

/**
 * Índice de la API. Sirve para explorar los contratos desde el navegador:
 * las rutas reales son POST y abrirlas con el navegador devuelve 405.
 */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const primerCaso = (seedCases as { id: string }[])[0]?.id ?? "seed-ecuaciones-signos";

  return NextResponse.json({
    proyecto: "TeachForge",
    db: dbMode(),
    nota: "Al abrir una ruta POST en el navegador verás 405: usa curl o fetch desde la app.",
    rutas: [
      {
        metodo: "GET",
        ruta: "/api/health",
        descripcion: "Estado del sistema: modo demo, modelo y base de datos.",
        query: { llm: "1 para probar la API key de OpenAI con una llamada real" },
        curl: `curl "${origin}/api/health?llm=1"`,
      },
      {
        metodo: "GET",
        ruta: "/api/cases",
        descripcion: "Lista los casos de la biblioteca (semilla + capturados).",
        curl: `curl "${origin}/api/cases"`,
      },
      {
        metodo: "POST",
        ruta: "/api/cases",
        descripcion: "Guarda un caso ya validado por el docente.",
        body: {
          author_alias: "María",
          years_experience: 24,
          subject: "Matemática",
          level: "Secundaria",
          topic: "Fracciones",
          raw_story: "(el relato completo en sus palabras, mínimo 20 caracteres)",
          structured: { "(...)": "salida de /api/extract" },
          consent: true,
          tags: ["fracciones", "diagnóstico"],
        },
        curl: `curl -X POST "${origin}/api/cases" -H "content-type: application/json" -d @caso.json`,
      },
      {
        metodo: "POST",
        ruta: "/api/extract",
        descripcion: "Convierte el relato libre del docente en un caso estructurado.",
        body: {
          story: "Llevo años viendo que los chicos suman numeradores y denominadores...",
          meta: { subject: "Matemática", level: "Secundaria", topic: "Fracciones" },
        },
      },
      {
        metodo: "POST",
        ruta: "/api/simulate",
        descripcion: "La clase simulada responde a los turnos del docente.",
        body: {
          caseId: primerCaso,
          turns: [{ turno: 1, mensaje: "A ver, ¿por qué crees que 1/2 + 1/3 da 2/5?" }],
          history: [],
          iaMode: true,
        },
      },
      {
        metodo: "POST",
        ruta: "/api/evaluate",
        descripcion: "Evalúa la transcripción con la rúbrica 0-3 y citas textuales.",
        body: {
          caseId: primerCaso,
          learner_alias: "nuevo-docente",
          transcript: [{ turno: 1, mensaje: "¿Qué hiciste primero?" }],
          hidden_states: ["suma_numeradores_y_denominadores"],
        },
        nota: "hidden_states sale de /api/simulate",
      },
      {
        metodo: "GET",
        ruta: "/api/profile",
        descripcion: "Historial y competencia más débil de un docente.",
        query: { alias: "nuevo-docente" },
        curl: `curl "${origin}/api/profile?alias=nuevo-docente"`,
      },
    ],
  });
}
