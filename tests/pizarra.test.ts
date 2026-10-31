import { describe, expect, it } from "vitest";
import { leerPizarra, resolverLineal } from "../src/lib/pizarra";

describe("leerPizarra", () => {
  it("separa el ejercicio, lo que escribió el alumno y la resolución correcta", () => {
    const p = leerPizarra("En 3x + 5 = 20 escriben 3x = 20 + 5.", "Ecuaciones");
    expect(p.enunciado).toBe("3x + 5 = 20");
    expect(p.escrito).toBe("3x = 20 + 5");
    expect(p.pasosCorrectos?.at(-1)).toContain("x = 15 ÷ 3 = 5");
  });

  it("muestra el ejemplo sin operación cuando no es una ecuación", () => {
    const p = leerPizarra("Ante «¿por qué el personaje mintió?», copian «el personaje dijo una mentira».", "Inferencias");
    expect(p.enunciado).toBe("¿por qué el personaje mintió?");
    expect(p.escrito).toBe("el personaje dijo una mentira");
    expect(p.pasosCorrectos).toBeNull();
  });

  it("no recorta letras al quitar comillas", () => {
    expect(leerPizarra("En «2x + 1 = 7» escriben «2x = 7 + 1s».", "Ecuaciones").escrito).toBe("2x = 7 + 1s");
  });

  it("usa el tema si no hay ejemplo", () => {
    expect(leerPizarra("", "Fracciones").enunciado).toBe("Fracciones");
  });
});

describe("resolverLineal", () => {
  it("resuelve ax − b = c", () => {
    expect(resolverLineal("2x − 4 = 10")?.at(-1)).toContain("x = 14 ÷ 2 = 7");
  });

  it("no inventa pasos para lo que no reconoce", () => {
    expect(resolverLineal("x² = 9")).toBeNull();
  });
});
