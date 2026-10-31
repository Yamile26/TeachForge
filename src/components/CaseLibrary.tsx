"use client";

import Link from "next/link";
import { useState } from "react";
import { nombreCompetencia } from "./ui";

export type CasoResumen = {
  id: string;
  titulo: string;
  materia: string;
  nivel: string;
  autor: string;
  anios: number | null;
  esEjemplo: boolean;
  error: string;
  tags: string[];
};

export function CaseLibrary({ casos }: { casos: CasoResumen[] }) {
  const [filtro, setFiltro] = useState("Todos");
  const materias = [...new Set(casos.map((c) => c.materia).filter(Boolean))];
  const filtros = ["Todos", "Reales", "Ejemplos", ...materias];

  const visibles = casos.filter(
    (c) =>
      filtro === "Todos" ||
      (filtro === "Reales" && !c.esEjemplo) ||
      (filtro === "Ejemplos" && c.esEjemplo) ||
      c.materia === filtro,
  );

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {filtros.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={f === filtro}
            onClick={() => setFiltro(f)}
            className={`rounded-full border px-3.5 py-1.5 text-sm ${
              f === filtro ? "border-steel bg-steel text-steel-ink" : "border-line bg-surface"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <div className="card text-muted">
          {filtro === "Reales" ? (
            <>
              Todavía no hay casos reales.{" "}
              <Link href="/capture" className="font-medium text-ink underline underline-offset-2">
                Captura el primero con un docente veterano
              </Link>
              .
            </>
          ) : (
            "No hay casos con este filtro."
          )}
        </div>
      ) : (
        <ul className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,290px),1fr))]">
          {visibles.map((c) => (
            <li key={c.id} className="card grid grid-rows-[auto_auto_1fr_auto] gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className={`chip ${c.esEjemplo ? "bg-sunk text-muted" : "bg-good-soft text-good"}`}>
                  {c.esEjemplo ? "Ejemplo ficticio" : "● Real · validado"}
                </span>
                <span className="text-[13px] text-muted">{c.nivel}</span>
              </div>
              <div>
                <h2 className="text-[17px] font-bold">{c.titulo}</h2>
                <p className="text-[13px] text-muted">
                  {c.materia} · {c.autor}
                  {c.anios ? ` · ${c.anios} años en aula` : ""}
                </p>
              </div>
              <p className="rounded-lg bg-sunk px-3 py-2.5 text-sm">
                <small className="mb-0.5 block text-[11px] tracking-[0.06em] text-muted uppercase">
                  Error frecuente
                </small>
                {c.error}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {c.tags.map((t) => (
                    <span key={t} className="rounded-full border border-line px-2 py-px font-mono text-[11px] text-muted">
                      {nombreCompetencia(t)}
                    </span>
                  ))}
                </div>
                <Link href={`/simulate/${c.id}`} className="btn btn-primary">
                  Practicar
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
