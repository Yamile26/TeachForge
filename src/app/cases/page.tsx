import Link from "next/link";
import { listarCasos } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const casos = await listarCasos();

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← TeachForge
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Biblioteca de casos</h1>
      <p className="mt-3 text-neutral-600 dark:text-neutral-300">
        Los casos de ejemplo se marcan siempre como <strong>Ejemplo</strong>. Solo los que un
        docente validó llevan su alias como autor.
      </p>

      <ul className="mt-8 divide-y divide-neutral-200 dark:divide-neutral-800">
        {casos.map((caso) => (
          <li key={caso.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="font-medium">{caso.titulo}</p>
              <p className="mt-1 text-sm text-neutral-500">
                {caso.materia} · {caso.nivel} · {caso.author_alias}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={
                  caso.is_seed
                    ? "rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                    : "rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                }
              >
                {caso.is_seed ? "Ejemplo" : "Real"}
              </span>
              <Link
                href={`/simulate/${caso.id}`}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:border-neutral-500 dark:border-neutral-700"
              >
                Practicar
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
