import Link from "next/link";
import { dbMode } from "@/lib/db";
import { demoActivo } from "@/lib/demo";
import { llmConfigurado } from "@/lib/llm";

export const dynamic = "force-dynamic";

const pantallas = [
  {
    href: "/capture",
    titulo: "Captura",
    detalle: "El docente veterano cuenta un caso real; la IA lo estructura y él lo valida.",
    estado: "Contrato listo · UI en v0",
  },
  {
    href: "/cases",
    titulo: "Biblioteca de casos",
    detalle: "Casos reales y de ejemplo, distinguidos a simple vista.",
    estado: "Contrato listo · UI en v0",
  },
  {
    href: "/simulate/seed-ecuaciones-signos",
    titulo: "Simulación",
    detalle: "3 turnos con 3 estudiantes simulados que mantienen el error hasta que se ataca la causa.",
    estado: "Contrato listo · UI en v0",
  },
  {
    href: "/profile",
    titulo: "Perfil de competencias",
    detalle: "Puntajes 0-3 con evidencia citada y la siguiente práctica recomendada.",
    estado: "Contrato listo · UI en v0",
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
        DSC HACK 2026 · Grieta 03
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">TeachForge</h1>
      <p className="mt-4 max-w-2xl text-lg text-neutral-600 dark:text-neutral-300">
        El criterio pedagógico de un docente no debería jubilarse con él. Capturamos la
        experiencia de docentes veteranos, la convertimos en casos validados por ellos y la
        usamos para entrenar a docentes nuevos con simulaciones de aula.
      </p>

      <dl className="mt-10 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Modo de datos</dt>
          <dd className="mt-1 font-mono text-sm">{demoActivo() ? "demo (fixtures)" : "live"}</dd>
        </div>
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Base de datos</dt>
          <dd className="mt-1 font-mono text-sm">{dbMode()}</dd>
        </div>
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Gemini</dt>
          <dd className="mt-1 font-mono text-sm">
            {llmConfigurado() ? "configurado" : "sin API key"}
          </dd>
        </div>
      </dl>

      <h2 className="mt-14 text-sm font-medium uppercase tracking-wider text-neutral-500">
        El ciclo
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {pantallas.map((p) => (
          <li key={p.href}>
            <Link
              href={p.href}
              className="block h-full rounded-xl border border-neutral-200 p-5 transition hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
            >
              <span className="font-medium">{p.titulo}</span>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{p.detalle}</p>
              <p className="mt-3 text-xs text-neutral-500">{p.estado}</p>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-12 text-sm text-neutral-500">
        Los contratos de la API están en{" "}
        <code className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-900">
          /api/health
        </code>
        , <code className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-900">/api/extract</code>,{" "}
        <code className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-900">/api/cases</code>,{" "}
        <code className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-900">/api/simulate</code>,{" "}
        <code className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-900">/api/evaluate</code> y{" "}
        <code className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-900">/api/profile</code>.
      </p>
    </main>
  );
}
