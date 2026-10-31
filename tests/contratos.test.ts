import { describe, expect, it } from "vitest";
import {
  CasoEstructuradoSchema,
  EvaluacionSchema,
  SimulacionSchema,
} from "../src/lib/schemas";
import { competenciaMasDebil } from "../src/lib/rubric";
import casoFixture from "../fixtures/extract.json";
import evaluacionFixture from "../fixtures/evaluate.json";
import simulacionFixture from "../fixtures/simulate.json";

describe("CasoEstructuradoSchema", () => {
  it("acepta el caso de ejemplo", () => {
    const resultado = CasoEstructuradoSchema.safeParse(casoFixture);
    expect(resultado.success).toBe(true);
  });

  it("rechaza un caso sin estrategia ni error frecuente", () => {
    const resultado = CasoEstructuradoSchema.safeParse({
      titulo: "Incompleto",
      materia: "Matemática",
    });
    expect(resultado.success).toBe(false);
  });

  it("acepta campos vacíos (el docente no dijo todo) y los reporta en campos_faltantes", () => {
    const incompleto = {
      ...casoFixture,
      contexto_aula: "",
      campos_faltantes: ["¿Cuántas sesiones necesitó?"],
    };
    const resultado = CasoEstructuradoSchema.safeParse(incompleto);
    expect(resultado.success).toBe(true);
  });
});

describe("SimulacionSchema", () => {
  it("acepta los tres turnos del fixture", () => {
    for (const turno of simulacionFixture.turnos) {
      expect(SimulacionSchema.safeParse(turno).success).toBe(true);
    }
  });

  it("rechaza un estado_oculto inventado", () => {
    const invalido = {
      respuestas: [{ alumno: "Rosa", texto: "..." }],
      estado_oculto: [{ alumno: "Rosa", estado: "aprobado" }],
    };
    expect(SimulacionSchema.safeParse(invalido).success).toBe(false);
  });
});

describe("EvaluacionSchema", () => {
  it("acepta un puntaje sin evidencia como null, no como 0", () => {
    const resultado = EvaluacionSchema.safeParse(evaluacionFixture);
    expect(resultado.success).toBe(true);
    const sinEvidencia = evaluacionFixture.scores.find((s) => s.puntaje === null);
    expect(sinEvidencia?.evidencia).toBeNull();
  });

  it("rechaza un puntaje fuera de la escala 0-3", () => {
    const invalido = {
      ...evaluacionFixture,
      scores: [{ ...evaluacionFixture.scores[0], puntaje: 4 }],
    };
    expect(EvaluacionSchema.safeParse(invalido).success).toBe(false);
  });

  it("rechaza una competencia que no está en la rúbrica", () => {
    const invalido = {
      ...evaluacionFixture,
      scores: [{ ...evaluacionFixture.scores[0], competencia: "carisma" }],
    };
    expect(EvaluacionSchema.safeParse(invalido).success).toBe(false);
  });
});

describe("competenciaMasDebil", () => {
  it("elige la más baja e ignora las que no tienen evidencia", () => {
    expect(
      competenciaMasDebil([
        { competencia: "diagnostico_del_error", puntaje: 2 },
        { competencia: "estrategia_de_explicacion", puntaje: 1 },
        { competencia: "verificacion_de_la_comprension", puntaje: null },
      ]),
    ).toBe("estrategia_de_explicacion");
  });

  it("devuelve null si no hay puntajes", () => {
    expect(
      competenciaMasDebil([{ competencia: "diagnostico_del_error", puntaje: null }]),
    ).toBeNull();
  });
});
