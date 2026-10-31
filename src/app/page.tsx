import Image from "next/image";
import Link from "next/link";
import { dbMode } from "@/lib/db";
import { demoActivo } from "@/lib/demo";
import { llmConfigurado } from "@/lib/llm";

export const dynamic = "force-dynamic";

const ciclo = [
  ["Captura", "El veterano cuenta su caso en 5 a 8 minutos"],
  ["Validación", "Él mismo revisa y aprueba el caso"],
  ["Simulación", "3 turnos con 3 estudiantes simulados"],
  ["Evaluación", "Rúbrica 0–3 con citas textuales"],
  ["Perfil", "Evolución y siguiente práctica"],
];

export default function Home() {
  return (
    <div className="grid grid-cols-1 gap-10">
      <section className="grid items-center gap-8 md:grid-cols-[1.3fr_1fr]">
        <div>
          <p className="eyebrow">DSC HACK 2026 · Educación 2036 · Grieta 03: docentes sin relevo</p>
          <h1 className="mt-3 text-[clamp(28px,5vw,42px)] leading-tight font-extrabold">
            El criterio pedagógico de un docente no debería jubilarse con él.
          </h1>
          <p className="mt-4 max-w-[56ch] text-lg text-muted">
            TeachForge convierte lo que un docente veterano aprendió en años de aula en casos que
            él mismo valida, y los usa para que docentes nuevos practiquen con estudiantes
            simulados.
          </p>
          <p className="mt-5 max-w-[46ch] border-l-3 border-ember pl-4 font-display text-xl font-medium">
            Qué error comete el alumno, por qué lo comete y qué explicación lo destraba.
          </p>
        </div>

        <div className="grid gap-3.5">
          <Image
            src="/brand/teachforge-logo-ilustrado.jpg"
            alt="TeachForge: dos docentes peruanos con libros y una tableta, junto al mapa del Perú y Machu Picchu. Empoderando a los maestros del Perú."
            width={1536}
            height={1024}
            priority
            className="h-auto w-full rounded-xl border border-line bg-white"
          />

          <p className="eyebrow">¿Cómo entras hoy?</p>

          <RolLink
            href="/register"
            titulo="Soy docente"
            detalle="Regístrate con tu correo institucional y define tu perfil de experiencia."
            tono="ember"
            icono={<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm10 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />}
          />

          <RolLink
            href="/capture"
            titulo="Soy docente con experiencia"
            detalle="Cuenta un caso real de tu aula en 5 a 8 minutos."
            tono="ember"
            icono={<path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM19 11a7 7 0 0 1-14 0M12 18v3" />}
          />

          <RolLink
            href="/cases"
            titulo="Me estoy formando como docente"
            detalle="Practica un caso en una clase simulada de 3 turnos."
            tono="steel"
            icono={<path d="M3 7l9-4 9 4-9 4-9-4zM7 9v5c0 1.5 2.5 3 5 3s5-1.5 5-3V9" />}
          />

          <RolLink
            href="/aprender"
            titulo="Aprende con el currículo"
            detalle="Pregunta sobre el programa curricular y revisa citas del PDF."
            tono="steel"
            icono={<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19a2 2 0 0 1 2 2v11.5A2.5 2.5 0 0 1 18.5 19H7.5A2.5 2.5 0 0 1 5 16.5v-11zM8 7h8M8 11h8M8 15h5" />}
          />
        </div>
      </section>

      <section className="card overflow-x-auto p-1.5">
        <ol className="flex min-w-max sm:min-w-0">
          {ciclo.map(([titulo, detalle], i) => (
            <li key={titulo} className="grid flex-1 basis-36 gap-1 border-t-3 border-ember px-4 py-3.5">
              <span className="font-mono text-xs text-ember">0{i + 1}</span>
              <b className="font-display">{titulo}</b>
              <span className="text-sm text-muted">{detalle}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
        <span>
          Datos: <span className="font-mono text-ink">{demoActivo() ? "demo (fixtures)" : "en vivo"}</span>
        </span>
        <span>
          Base: <span className="font-mono text-ink">{dbMode()}</span>
        </span>
        <span>
          Modelo: <span className="font-mono text-ink">{llmConfigurado() ? "configurado" : "sin API key"}</span>
        </span>
        <Link href="/api" className="underline underline-offset-2 hover:text-ink">
          Índice de la API
        </Link>
      </section>
    </div>
  );
}

function RolLink({
  href,
  titulo,
  detalle,
  tono,
  icono,
}: {
  href: string;
  titulo: string;
  detalle: string;
  tono: "ember" | "steel";
  icono: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="grid grid-cols-[auto_1fr_auto] items-center gap-3.5 rounded-xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-ember"
    >
      <span
        className={`grid h-11 w-11 place-items-center rounded-xl ${
          tono === "ember" ? "bg-ember-soft text-ember" : "bg-sunk text-steel"
        }`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          {icono}
        </svg>
      </span>
      <span>
        <b>{titulo}</b>
        <small className="block text-[13px] text-muted">{detalle}</small>
      </span>
      <span aria-hidden="true">→</span>
    </Link>
  );
}














































































































































































































































n
