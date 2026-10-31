import type { Competencia } from "./schemas";

/**
 * Rúbrica 0-3. Las anclas se validan con al menos un docente real
 * y sus cambios se anotan en docs/rubrica.md.
 */

export type Rubrica = Record<
  Competencia,
  {
    nombre: string;
    descripcion: string;
    anclas: [string, string, string, string]; // 0, 1, 2, 3
    opcional?: boolean;
  }
>;

export const RUBRICA: Rubrica = {
  diagnostico_del_error: {
    nombre: "Diagnóstico del error",
    descripcion: "¿Identifica qué hace o piensa mal el alumno y por qué?",
    anclas: [
      "No identifica el error.",
      "Nombra el error sin dar causa.",
      "Nombra el error y una causa probable.",
      "Confirma la causa preguntando antes de explicar.",
    ],
  },
  estrategia_de_explicacion: {
    nombre: "Estrategia de explicación",
    descripcion: "¿La explicación ataca la causa o repite el procedimiento?",
    anclas: [
      "Repite la definición.",
      "Usa un ejemplo genérico.",
      "Usa un ejemplo o representación ajustados al error.",
      "Usa un contraejemplo o representación que desarma la causa.",
    ],
  },
  verificacion_de_la_comprension: {
    nombre: "Verificación de la comprensión",
    descripcion: "¿Comprueba si entendieron o solo si copiaron?",
    anclas: [
      "Pregunta «¿entendieron?».",
      "Pone un ejercicio igual al ejemplo.",
      "Hace una pregunta que distingue memorizar de entender.",
      "Pide aplicar en un caso nuevo y ajusta con la respuesta.",
    ],
  },
  adaptacion_a_diferencias: {
    nombre: "Adaptación a diferencias",
    descripcion: "¿Reconoce y atiende perfiles distintos en el aula?",
    anclas: [
      "Usa una sola vía para todos.",
      "Reconoce diferencias pero no actúa.",
      "Ajusta para un perfil concreto.",
      "Da rutas distintas para los tres perfiles.",
    ],
  },
  uso_critico_de_la_ia: {
    nombre: "Uso crítico de la IA",
    descripcion: "Solo se puntúa si la simulación usa el Momento IA.",
    opcional: true,
    anclas: [
      "No detecta el error de la IA.",
      "Lo detecta sin explicarlo.",
      "Lo detecta y lo explica.",
      "Lo convierte en aprendizaje para toda la clase.",
    ],
  },
};

export function rubricaParaPrompt(competencias: Competencia[] = Object.keys(RUBRICA) as Competencia[]) {
  return competencias
    .map((key) => {
      const r = RUBRICA[key];
      return [
        `- ${key} (${r.nombre})${r.opcional ? " [opcional: solo con Momento IA]" : ""}`,
        `  ${r.descripcion}`,
        `  0: ${r.anclas[0]}`,
        `  1: ${r.anclas[1]}`,
        `  2: ${r.anclas[2]}`,
        `  3: ${r.anclas[3]}`,
      ].join("\n");
    })
    .join("\n");
}

/** Regla simple de recomendación: la competencia más baja manda la siguiente práctica. */
export function competenciaMasDebil(
  historial: { competencia: Competencia; puntaje: number | null }[],
): Competencia | null {
  const validos = historial.filter((s) => s.puntaje !== null);
  if (validos.length === 0) return null;
  return validos.reduce((peor, actual) =>
    (actual.puntaje as number) < (peor.puntaje as number) ? actual : peor,
  ).competencia;
}
