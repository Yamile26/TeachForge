"use client";

import { FormEvent, useState } from "react";

type Citation = {
  document: string;
  page: number;
  section: string;
  snippet: string;
};

export default function AprendePage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setAnswer(null);
    setCitations([]);

    try {
      const response = await fetch("/api/aprende", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo consultar el currículo.");
      }

      setAnswer(payload.answer ?? "");
      setCitations(Array.isArray(payload.citations) ? payload.citations : []);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Error desconocido.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <p className="eyebrow">Aprende</p>
        <h1 className="mt-2 text-4xl font-bold text-ink">Consulta el currículo con evidencia</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Pregunta sobre el programa curricular de secundaria y responde con citas del documento
          disponible.
        </p>
      </div>

      <form onSubmit={onSubmit} className="card p-5">
        <label htmlFor="question" className="mb-2 block text-sm font-medium text-ink">
          ¿Qué quieres consultar?
        </label>
        <textarea
          id="question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={4}
          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-base text-ink outline-none ring-0 placeholder:text-muted"
          placeholder="Ejemplo: ¿Qué propone el currículo para la evaluación formativa en secundaria?"
        />

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs uppercase tracking-[0.12em] text-muted">
            Documento: 6791708-programa-curricular-de-educacion-secundaria.pdf
          </span>
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="rounded-xl bg-ember px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Consultando..." : "Buscar respuesta"}
          </button>
        </div>
      </form>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {answer ? (
        <section className="mt-8 grid gap-6">
          <div className="card p-5">
            <h2 className="mb-3 text-xl font-semibold text-ink">Respuesta</h2>
            <p className="whitespace-pre-line text-base leading-7 text-ink">{answer}</p>
          </div>

          {citations.length > 0 ? (
            <div className="card p-5">
              <h3 className="mb-4 text-lg font-semibold text-ink">Citas</h3>
              <ul className="space-y-4">
                {citations.map((citation, index) => (
                  <li key={`${citation.document}-${citation.page}-${index}`} className="rounded-lg border border-line bg-surface p-3">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.08em] text-muted">
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
                    <p className="text-sm leading-6 text-ink">{citation.snippet}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
