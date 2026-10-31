/**
 * Costo por sesión. Los precios son de referencia (USD por 1M de tokens) y se
 * pueden ajustar por env; el jurado ve el costo medido, no una promesa.
 * Verificar precios vigentes en https://developers.openai.com/api/docs/pricing
 */

const PRECIOS: Record<string, { in: number; out: number }> = {
  "gpt-4.1": { in: 2.0, out: 8.0 },
  "gpt-4.1-mini": { in: 0.4, out: 1.6 },
  "gpt-4.1-nano": { in: 0.1, out: 0.4 },
  "gpt-4o": { in: 2.5, out: 10.0 },
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
};

export type Uso = {
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  model: string;
};

function precioDe(model: string) {
  const exacto = PRECIOS[model];
  if (exacto) return exacto;
  // Los nombres con fecha (gpt-4.1-2025-04-14) heredan el precio de su familia.
  const familia = Object.keys(PRECIOS)
    .sort((a, b) => b.length - a.length)
    .find((nombre) => model.startsWith(nombre));
  if (familia) return PRECIOS[familia];
  if (model.includes("nano")) return PRECIOS["gpt-4.1-nano"];
  if (model.includes("mini")) return PRECIOS["gpt-4.1-mini"];
  return PRECIOS["gpt-4.1"];
}

export function costoUsd(model: string, tokensIn: number, tokensOut: number): number {
  const precio = precioDe(model);
  const usd = (tokensIn / 1_000_000) * precio.in + (tokensOut / 1_000_000) * precio.out;
  return Math.round(usd * 1e6) / 1e6;
}

export function usoVacio(model: string): Uso {
  return { tokensIn: 0, tokensOut: 0, costUsd: 0, model };
}

export function sumarUso(a: Uso, b: Uso): Uso {
  return {
    tokensIn: a.tokensIn + b.tokensIn,
    tokensOut: a.tokensOut + b.tokensOut,
    costUsd: Math.round((a.costUsd + b.costUsd) * 1e6) / 1e6,
    model: a.model,
  };
}
