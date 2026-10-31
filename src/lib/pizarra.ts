/**
 * Lo que se muestra en la pizarra del simulador, a partir del ejemplo del caso
 * («En 3x + 5 = 20 escriben 3x = 20 + 5.»): el ejercicio, lo que escribió el alumno
 * (el error) y, si es una ecuación lineal simple, la resolución correcta paso a paso.
 */

export type Pizarra = {
  /** El ejercicio tal como lo planteó el docente. */
  enunciado: string;
  /** Lo que escribió el alumno; null si el ejemplo no trae una operación. */
  escrito: string | null;
  /** Pasos correctos; null si no se pueden calcular sin ambigüedad. */
  pasosCorrectos: string[] | null;
};

const PATRON_EJEMPLO = /^\s*(?:en|ante)\s+(.+?),?\s+(?:escriben|escribe|ponen|pone|hacen|hace|responden|copian)\s+(.+?)\.?\s*$/i;
// ax + b = c, ax − b = c (a opcional, enteros)
const PATRON_LINEAL = /^\s*(\d*)\s*x\s*([+\-−])\s*(\d+)\s*=\s*(-?\d+)\s*$/i;

function numero(n: number): string {
  if (Number.isInteger(n)) return String(n).replace("-", "−");
  return n.toFixed(2).replace(".", ",").replace("-", "−");
}

/** Pasos de ax ± b = c, despejando con la misma operación en ambos lados. */
export function resolverLineal(ecuacion: string): string[] | null {
  const m = ecuacion.match(PATRON_LINEAL);
  if (!m) return null;
  const a = m[1] ? Number(m[1]) : 1;
  const suma = m[2] === "+";
  const b = Number(m[3]);
  const c = Number(m[4]);
  if (a === 0) return null;

  const ax = a === 1 ? "x" : `${a}x`;
  const derecha = suma ? c - b : c + b;
  const pasos = [
    `${ax} ${suma ? "+" : "−"} ${b} = ${numero(c)}`,
    `${ax} = ${numero(c)} ${suma ? "−" : "+"} ${b}   (${suma ? "restamos" : "sumamos"} ${b} en ambos lados)`,
    `${ax} = ${numero(derecha)}`,
  ];
  if (a !== 1) pasos.push(`x = ${numero(derecha)} ÷ ${a} = ${numero(derecha / a)}   (dividimos ambos lados entre ${a})`);
  return pasos;
}

function sinComillas(t: string): string {
  return t.trim().replace(/^[«"“\s]+|[»"”\s]+$/g, "");
}

export function leerPizarra(ejemplo: string | undefined, tema: string): Pizarra {
  const texto = (ejemplo ?? "").trim();
  const m = texto.match(PATRON_EJEMPLO);
  if (!m) return { enunciado: texto || tema, escrito: null, pasosCorrectos: null };

  const enunciado = sinComillas(m[1]);
  const escrito = sinComillas(m[2]);
  return { enunciado, escrito, pasosCorrectos: resolverLineal(enunciado) };
}
