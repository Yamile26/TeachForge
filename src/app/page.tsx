import Image from "next/image";
import Link from "next/link";
import { dbMode, listarCasos } from "@/lib/db";
import { demoActivo } from "@/lib/demo";
import { llmConfigurado } from "@/lib/llm";

export const dynamic = "force-dynamic";

const PASOS_CICLO = [
  {
    titulo: "Captura",
    detalle: "El veterano cuenta un caso real en 6 preguntas.",
    tono: "bg-ember text-white",
    icono: <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM19 11a7 7 0 0 1-14 0M12 18v3" />,
  },
  {
    titulo: "Validación",
    detalle: "Él lo revisa, lo corrige y lo aprueba.",
    tono: "bg-ink text-white",
    icono: <path d="M5 12l5 5L20 7" />,
    clave: true,
  },
  {
    titulo: "Simulación",
    detalle: "3 turnos con 3 alumnos que se equivocan.",
    tono: "bg-navy text-white",
    icono: <path d="M3 5h18v11H3zM8 20h8M12 16v4" />,
  },
  {
    titulo: "Evaluación",
    detalle: "Rúbrica de 0 a 3, con citas de lo que dijiste.",
    tono: "bg-gold text-ink",
    icono: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  },
];

const RUTAS = [
  {
    href: "/capture",
    kicker: "Para veteranos",
    titulo: "Capturar",
    detalle: "Cuenta un caso de tu aula y deja tu criterio para la próxima generación.",
    fondo: "bg-ember text-white",
    flecha: "bg-white text-ember",
  },
  {
    href: "/simulate/seed-ecuaciones-signos",
    kicker: "Para docentes en formación",
    titulo: "Simular",
    detalle: "Practica con tres alumnos que cometen el error real, y equivócate sin costo.",
    fondo: "bg-navy text-white",
    flecha: "bg-white text-navy",
  },
  {
    href: "/aprende",
    kicker: "Beta",
    titulo: "Aprende",
    detalle: "Pregunta y recibe respuestas con el currículo y casos reales, siempre citados.",
    fondo: "bg-gold text-ink",
    flecha: "bg-ink text-gold",
  },
];

const CIFRAS = [
  ["22 %", "docentes de secundaria con 55+ años", "bg-ember text-white"],
  ["5", "competencias en la rúbrica", "bg-navy text-white"],
  ["3", "turnos por clase simulada", "bg-gold text-ink"],
];

const MEDIOS = ["bg-ember text-white", "bg-navy text-white", "bg-gold text-ink"];

export default async function Home() {
  const casos = (await listarCasos().catch(() => [])).slice(0, 3);

  return (
    <div className="grid grid-cols-1 gap-16">
      {/* Portada */}
      <section className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
        <div>
          <span className="eyebrow">DSC HACK 2026 · Grieta 03: docentes sin relevo</span>
          <h1 className="mt-4 text-[clamp(2.4rem,5vw,4.1rem)] leading-[1.08] font-extrabold">
            Que el criterio del aula <span className="text-ember">no se jubile</span>
          </h1>
          <p className="mt-4 max-w-[36rem] text-lg text-muted">
            TeachForge convierte lo que un docente veterano aprendió en años de aula en casos que él
            mismo valida, y los usa para que docentes nuevos practiquen con estudiantes simulados.
          </p>
          <p className="motto mt-5">Qué error comete el alumno, por qué lo comete y qué lo destraba.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/capture" className="btn btn-primary">
              Soy docente con experiencia
            </Link>
            <Link href="/cases" className="btn">
              Me estoy formando
            </Link>
          </div>
        </div>
        <div className="relative">
          <Image
            src="/brand/teachforge-logo-ilustrado.jpg"
            alt="Dos docentes peruanos con un libro y una tableta, junto al mapa del Perú y Machu Picchu. TeachForge, empoderando a los maestros del Perú."
            width={1536}
            height={1024}
            priority
            className="h-auto w-full rounded-3xl border border-line bg-white shadow-[0_16px_38px_rgb(20_22_43/12%)]"
          />
          <div className="absolute bottom-4 left-3 grid max-w-60 gap-0.5 rounded-2xl bg-white px-4 py-3 shadow-[0_16px_38px_rgb(20_22_43/12%)] sm:-left-3">
            <b className="text-3xl leading-none text-ember">22 %</b>
            <span className="text-sm text-muted">
              de los docentes de secundaria tiene 55 años o más (OCDE y GRADE, 2026)
            </span>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="hex-band -mx-4 bg-ink px-4 py-14 text-white sm:-mx-6 sm:rounded-3xl sm:px-10">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.25fr]">
          <div>
            <span className="eyebrow bg-transparent text-gold shadow-[inset_0_0_0_1px_rgb(255_255_255/30%)] before:bg-gold">
              Cómo funciona
            </span>
            <h2 className="mt-4 text-[clamp(1.8rem,3.4vw,2.7rem)] leading-tight font-extrabold text-white">
              Un ciclo, de la experiencia a la práctica
            </h2>
            <p className="mt-4 text-lg text-[#c9cce0]">
              Con IA el contenido es gratis; lo escaso es el criterio. TeachForge lo captura de quien lo
              vivió y lo convierte en práctica para quien empieza.
            </p>
          </div>
          <div className="grid gap-3.5 sm:grid-cols-2">
            {PASOS_CICLO.map((p) => (
              <div
                key={p.titulo}
                className={`grid grid-cols-[3.2rem_1fr] items-center gap-3.5 rounded-2xl bg-white px-4 py-4 text-ink shadow-[0_10px_27px_rgb(0_0_0/18%)] ${
                  p.clave ? "ring-3 ring-ember" : ""
                }`}
              >
                <span className={`hexicon h-[3.2rem] w-[3.2rem] ${p.tono}`}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    {p.icono}
                  </svg>
                </span>
                <span>
                  <b className="block">{p.titulo}</b>
                  <span className="text-sm text-muted">{p.detalle}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Casos */}
      <section>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Biblioteca</span>
            <h2 className="mt-3 text-[clamp(1.8rem,3.4vw,2.7rem)] font-extrabold">Casos para practicar</h2>
            <p className="mt-2 text-lg text-muted">Cada caso lo validó el docente que lo vivió en su aula.</p>
          </div>
          <Link href="/cases" className="font-bold text-ember underline underline-offset-[0.35rem]">
            Ver todos los casos →
          </Link>
        </div>
        <div className="grid gap-4.5 md:grid-cols-2 lg:grid-cols-3">
          {casos.map((c, i) => (
            <article
              key={c.id}
              className="grid grid-cols-[38%_62%] overflow-hidden rounded-2xl border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgb(20_22_43/12%)]"
            >
              <div className={`hex-band grid place-items-center p-4 text-center text-lg font-extrabold ${MEDIOS[i % 3]}`}>
                <span>{c.subject}</span>
              </div>
              <div className="grid content-start gap-2 p-4">
                <span className={`chip justify-self-start ${c.is_seed ? "bg-warn-soft text-warn" : "bg-good-soft text-good"}`}>
                  {c.is_seed ? "Ejemplo" : "Real"}
                </span>
                <h3 className="text-[17px] leading-snug font-bold">{c.titulo}</h3>
                <p className="text-sm text-muted">
                  {c.level} · {c.author_alias}
                  {c.years_experience ? `, ${c.years_experience} años` : ""}
                </p>
                <Link href={`/simulate/${c.id}`} className="btn btn-steel mt-1 min-h-9 justify-self-start px-3 py-1.5 text-sm">
                  Practicar
                </Link>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-8 grid gap-3.5 sm:grid-cols-3">
          {CIFRAS.map(([cifra, texto, tono]) => (
            <div key={texto} className="grid grid-cols-[2.8rem_1fr] items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3.5">
              <span className={`grid h-11 w-11 place-items-center rounded-xl text-sm font-extrabold ${tono}`} aria-hidden="true">
                ◆
              </span>
              <span>
                <b className="block text-2xl leading-tight tabular-nums">{cifra}</b>
                <span className="text-sm text-muted">{texto}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Rutas */}
      <section>
        <span className="eyebrow">Tu camino</span>
        <h2 className="mt-3 mb-8 text-[clamp(1.8rem,3.4vw,2.7rem)] font-extrabold">Tres formas de usar TeachForge</h2>
        <div className="grid gap-4.5 md:grid-cols-3">
          {RUTAS.map((r) => (
            <Link
              key={r.titulo}
              href={r.href}
              className={`hex-band flex min-h-64 flex-col gap-2.5 rounded-2xl p-6 shadow-[0_12px_29px_rgb(0_0_0/14%)] transition hover:-translate-y-0.5 ${r.fondo}`}
            >
              <span className="text-xs font-bold tracking-[0.08em] uppercase opacity-85">{r.kicker}</span>
              <h3 className="text-2xl font-extrabold">{r.titulo}</h3>
              <p className="opacity-90">{r.detalle}</p>
              <span className={`hexicon mt-auto h-11 w-11 font-extrabold ${r.flecha}`} aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Llamado */}
      <section className="hex-band grid items-center gap-5 rounded-2xl bg-[linear-gradient(110deg,var(--ink),var(--navy)_60%,var(--ember))] p-8 text-white sm:grid-cols-[1fr_auto] sm:p-12">
        <div>
          <h2 className="text-[clamp(1.6rem,3vw,2.3rem)] font-extrabold text-white">¿Tienes años de aula?</h2>
          <p className="mt-2 text-[#d7d9e8]">Tu forma de destrabar un error puede formar a cientos de docentes nuevos.</p>
          <p className="motto mt-3 text-gold">#ElCriterioNoSeJubila</p>
        </div>
        <Link href="/register" className="btn border-white">
          Crear mi cuenta →
        </Link>
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
