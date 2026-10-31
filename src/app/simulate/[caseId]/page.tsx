import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerCaso } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SimulatePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const caso = await obtenerCaso(caseId);
  if (!caso) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/cases" className="text-sm text-neutral-500 hover:underline">
        ← Biblioteca
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{caso.titulo}</h1>
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          {caso.is_seed ? "Ejemplo" : "Real"}
        </span>
      </div>
      <p className="mt-2 text-sm text-neutral-500">
        {caso.materia} · {caso.nivel} · {caso.tema}
      </p>

      <section className="mt-8 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          La escena
        </h2>
        <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">{caso.contexto_aula}</p>
        <p className="mt-3 text-sm">
          <span className="font-medium">El error:</span> {caso.error_frecuente.descripcion}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Estudiantes
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {caso.perfiles_estudiantes.map((p) => (
            <li key={p.nombre} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <p className="font-medium">{p.nombre}</p>
              <p className="mt-1 text-xs text-neutral-500">{p.perfil}</p>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 rounded-xl border border-dashed border-neutral-300 p-5 text-sm text-neutral-500 dark:border-neutral-700">
        Aquí va el chat de 3 turnos (UI en v0). Contrato:{" "}
        <span className="font-mono text-xs">
          POST /api/simulate {`{ caseId, turns[], history[], iaMode }`} → {`{ respuestas[], estado_oculto[] }`}
        </span>{" "}
        y al cerrar el turno 3,{" "}
        <span className="font-mono text-xs">
          POST /api/evaluate {`{ caseId, learner_alias, transcript[], hidden_states[] }`}
        </span>
        .
      </p>
    </main>
  );
}
