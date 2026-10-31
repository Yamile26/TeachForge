"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type Citation = {
  document: string;
  page: number;
  section: string;
  snippet: string;
};

type CasoRelacionado = {
  id: string;
  titulo: string;
  autor: string;
  esEjemplo: boolean;
  estrategia: string;
};

type Respuesta = {
  answer: string;
  citations: Citation[];
  recomendaciones: string[];
  casos: CasoRelacionado[];
  avisos: string[];
  source: "live" | "demo";
};

const SUGERENCIAS = [
  "¿Cómo verifico que entendieron ecuaciones y no solo memorizaron la regla?",
  "Mis alumnos copian respuestas literales del texto, ¿cómo trabajo inferencias?",
  "¿Qué hago si un alumno trae una respuesta copiada de una IA con un error?",
];

export default function AprendePage() {
  const [question, setQuestion] = useState("");
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function consultar(pregunta: string) {
    setIsLoading(true);
    setError(null);
    setRespuesta(null);

    try {
      const response = await fetch("/api/aprende", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: pregunta }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo consultar.");
      }

      setRespuesta({
        answer: payload.answer ?? "",
        citations: Array.isArray(payload.citations) ? payload.citations : [],
        recomendaciones: Array.isArray(payload.recomendaciones) ? payload.recomendaciones : [],
        casos: Array.isArray(payload.casos) ? payload.casos : [],
        avisos: Array.isArray(payload.avisos) ? payload.avisos : [],
        source: payload.source === "live" ? "live" : "demo",
      });
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Error desconocido.");
    } finally {
      setIsLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (question.trim().length >= 6) void consultar(question.trim());
  }

  return (
    <div className="grid gap-8">
      <div>
        <span className="eyebrow">Aprende · Beta</span>
        <h1 className="mt-3 text-[clamp(2rem,3.6vw,2.9rem)] leading-tight font-extrabold">
          Recomendaciones para tu próxima clase
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">
          Cuéntale a la IA qué te preocupa de tu clase. Te responde con recomendaciones apoyadas en los
          casos que validaron docentes veteranos y en la rúbrica de TeachForge, y te dice de dónde sale
          cada idea.
        </p>
      </div>

      <form onSubmit={onSubmit} className="card grid gap-4">
        <label htmlFor="question" className="font-semibold">
          ¿Qué quieres mejorar o consultar?
        </label>
        <textarea
          id="question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={4}
          className="input"
          placeholder="Ejemplo: mis alumnos pasan los términos de una ecuación sin cambiar el signo, ¿cómo lo trabajo?"
        />
        <div className="flex flex-wrap gap-2">
          <span className="self-center text-sm text-muted">Prueba con:</span>
          {SUGERENCIAS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setQuestion(s);
                void consultar(s);
              }}
              className="rounded-full border border-dashed border-line bg-white px-3 py-1 text-left text-sm text-navy hover:border-navy"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted">No uses nombres reales de alumnos en tu consulta.</span>
          <button type="submit" disabled={isLoading || question.trim().length < 6} className="btn btn-primary">
            {isLoading ? "Pensando recomendaciones…" : "Pedir recomendaciones"}
          </button>
        </div>
      </form>

      {error ? (
        <div className="rounded-xl border border-ember bg-ember-soft p-4 text-sm text-bad">{error}</div>
      ) : null}

      {respuesta ? (
        <section className="grid gap-5" aria-live="polite">
          <div className="card grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-extrabold">Respuesta</h2>
              <span className={`chip ${respuesta.source === "live" ? "bg-ia-soft text-ia" : "bg-warn-soft text-warn"}`}>
                {respuesta.source === "live" ? "Redactada por IA" : "Generada por reglas, sin IA"}
              </span>
            </div>
            <p className="leading-7 whitespace-pre-line">{respuesta.answer}</p>
          </div>

          {respuesta.recomendaciones.length > 0 && (
            <div className="hex-band grid gap-3 rounded-2xl bg-ink p-6 text-white">
              <h2 className="text-xl font-extrabold text-white">Recomendaciones para tu clase</h2>
              <ol className="grid gap-2.5">
                {respuesta.recomendaciones.map((r, i) => (
                  <li key={i} className="grid grid-cols-[2rem_1fr] items-start gap-3">
                    <span className="hexicon h-8 w-8 bg-gold text-sm font-extrabold text-ink">{i + 1}</span>
                    <span className="text-[#e4e6f2]">{r}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {respuesta.casos.length > 0 && (
            <div className="card grid gap-3">
              <h2 className="text-lg font-extrabold">Casos de veteranos relacionados</h2>
              <ul className="grid gap-3 md:grid-cols-2">
                {respuesta.casos.map((c) => (
                  <li key={c.id} className="grid gap-2 rounded-xl border border-line bg-sunk p-4">
                    <span className={`chip justify-self-start ${c.esEjemplo ? "bg-warn-soft text-warn" : "bg-good-soft text-good"}`}>
                      {c.esEjemplo ? "Ejemplo" : "Real"}
                    </span>
                    <b>{c.titulo}</b>
                    <span className="text-sm text-muted">{c.autor}</span>
                    {c.estrategia && <p className="text-sm">{c.estrategia}</p>}
                    <Link href={`/simulate/${c.id}`} className="btn btn-steel min-h-9 justify-self-start px-3 py-1.5 text-sm">
                      Practicar este caso
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {respuesta.citations.length > 0 && (
            <div className="card grid gap-3">
              <h2 className="text-lg font-extrabold">Citas del currículo</h2>
              <ul className="grid gap-3">
                {respuesta.citations.map((citation, index) => (
                  <li key={`${citation.document}-${citation.page}-${index}`} className="rounded-r-xl border-l-3 border-navy bg-sunk px-4 py-3">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs tracking-[0.06em] text-muted uppercase">
                      <span>{citation.document}</span>
                      <span>•</span>
                      <span>Página {citation.page}</span>
                      {citation.section ? (
                        <>
                          <span>•</span>
                          <span>{citation.section}</span>
                        </>
                      ) : null}
                    </div>
                    <p className="text-sm leading-6">{citation.snippet}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {respuesta.avisos.length > 0 && (
            <ul className="grid gap-1 text-sm text-muted">
              {respuesta.avisos.map((a) => (
                <li key={a}>ⓘ {a}</li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
