import { historialDe } from "./db";
import { competenciaMasDebil, RUBRICA } from "./rubric";
import { COMPETENCIAS, type Competencia } from "./schemas";

export type Perfil = {
  alias: string;
  attempts: number;
  competencies: Partial<
    Record<Competencia, { nombre: string; latest: number | null; history: (number | null)[] }>
  >;
  next_focus: Competencia | null;
};

/**
 * Evolución por competencia (último puntaje + historial) y siguiente práctica:
 * la competencia más baja manda (regla simple, sin IA).
 */
export async function perfilDe(alias: string): Promise<Perfil> {
  const historial = await historialDe(alias);
  if (historial.length === 0) {
    return { alias, attempts: 0, competencies: {}, next_focus: null };
  }

  const competencies: Perfil["competencies"] = {};
  for (const competencia of COMPETENCIAS) {
    // Una entrada por intento, para que el historial quede alineado con los intentos.
    const serie = historial.map((intento) => {
      const scores = Array.isArray(intento.scores) ? intento.scores : [];
      const s = scores.find((x) => x.competencia === competencia);
      return s ? s.puntaje : undefined;
    });
    if (serie.every((v) => v === undefined)) continue;
    const limpia = serie.map((v) => v ?? null);
    competencies[competencia] = {
      nombre: RUBRICA[competencia].nombre,
      latest: limpia[limpia.length - 1],
      history: limpia,
    };
  }

  const ultimo = historial[historial.length - 1];
  const scores = Array.isArray(ultimo.scores) ? ultimo.scores : [];
  const nextFocus: Competencia | null =
    competenciaMasDebil(scores.map((s) => ({ competencia: s.competencia, puntaje: s.puntaje }))) ??
    (ultimo.next_focus as Competencia | undefined) ??
    null;

  return { alias, attempts: historial.length, competencies, next_focus: nextFocus };
}
