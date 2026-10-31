/**
 * Costo por sesión. Los precios son de referencia (USD por 1M de tokens) y se
 * pueden ajustar por env; el jurado ve el costo medido, no una promesa.
 * Verificar precios vigentes en https://ai.google.dev/gemini-api/docs/pricing
 */

const PRECIOS: Record<string, { in: number; out: number }> = {
  "gemini-pro-latest": { in: 1.25, out: 10 },
  "gemini-2.5-pro": { in: 1.25, out: 10 },
  "gemini-flash-latest": { in: 0.3, out: 2.5 },
  "gemini-2.5-flash": { in: 0.3, out: 2.5 },
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
  if (model.includes("flash")) return PRECIOS["gemini-flash-latest"];
  return PRECIOS["gemini-pro-latest"];
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
