import extractFixture from "../../fixtures/extract.json";
import simulateFixture from "../../fixtures/simulate.json";
import evaluateFixture from "../../fixtures/evaluate.json";
import { llmConfigurado } from "./llm";
import type { CasoEstructurado, Evaluacion, Simulacion } from "./schemas";

/**
 * DEMO_MODE: la demo completa sigue funcionando aunque la API falle.
 * También se activa sola si no hay GEMINI_API_KEY, para poder construir la UI.
 */
export function demoActivo(): boolean {
  return process.env.DEMO_MODE === "true" || !llmConfigurado();
}

export function fixtureExtraccion(): CasoEstructurado {
  return extractFixture as CasoEstructurado;
}

export function fixtureSimulacion(turno: number): Simulacion {
  const turnos = simulateFixture.turnos;
  const indice = Math.min(Math.max(turno, 1), turnos.length) - 1;
  return turnos[indice] as Simulacion;
}

export function fixtureEvaluacion(): Evaluacion {
  return evaluateFixture as Evaluacion;
}
