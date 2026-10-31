"use client";

import Link from "next/link";
import { useState } from "react";
import type { CasoEstructurado } from "@/lib/schemas";
import { EncabezadoPaso } from "./ui";

const PREGUNTAS = [
  "¿Qué tema y nivel enseñabas?",
  "¿Qué error de los alumnos se repetía?",
  "¿Cómo te diste cuenta de que no entendían?",
  "¿Qué hiciste que sí funcionó y en qué condiciones (grupo, tiempo, materiales)?",
  "¿Qué intentaste que no funcionó?",
  "¿Cómo supiste que por fin entendieron?",
];

// Relato de ejemplo para que la pantalla no arranque vacía; se marca como tal.
const EJEMPLO = [
  "Ecuaciones de primer grado en segundo de secundaria, en un colegio estatal. Grupos de 35.",
  "Pasaban los términos al otro lado sin cambiar el signo. En 3x + 4 = 19 escribían 3x = 19 + 4. Lo hacían de memoria: «lo que suma pasa restando», pero lo aplicaban al revés.",
  "Cuando les pedía que comprobaran reemplazando x, no sabían qué hacer. Para ellos «pasar» era un truco, no sabían que era hacer lo mismo en los dos lados.",
  "Una balanza de verdad con chapitas y bolsitas cerradas. Tres bolsitas iguales y 4 chapitas a un lado, 19 chapitas al otro. Les preguntaba qué podían quitar sin que se desequilibre. Funcionó en grupos de 5, unos 20 minutos.",
  "Repetir la regla en la pizarra y hacer 20 ejercicios iguales. Mejoraban en el práctico y en el examen volvían a fallar.",
  "Cuando un alumno me dijo «profe, si quito 4 de acá tengo que quitar 4 de allá» sin que yo se lo dijera, y cuando ellos solos reemplazaban para comprobar.",
];

const MATERIAS = ["Matemática", "Comunicación", "Ciencia y Tecnología", "Ciencias Sociales", "Inglés"];
const NIVELES = ["1.º de secundaria", "2.º de secundaria", "3.º de secundaria", "4.º de secundaria", "5.º de secundaria"];

type Fase = "relato" | "revision" | "guardado";

export function CaptureFlow() {
  const [fase, setFase] = useState<Fase>("relato");
  const [alias, setAlias] = useState("Prof. María");
  const [anios, setAnios] = useState("31");
  const [materia, setMateria] = useState(MATERIAS[0]);
  const [nivel, setNivel] = useState(NIVELES[1]);
  const [respuestas, setRespuestas] = useState<string[]>(EJEMPLO);
  const [esEjemplo, setEsEjemplo] = useState(true);
  const [caso, setCaso] = useState<CasoEstructurado | null>(null);
  const [fuente, setFuente] = useState<"demo" | "live">("live");
  const [ediciones, setEdiciones] = useState(0);
  const [fidelidad, setFidelidad] = useState(0);
  const [consentimiento, setConsentimiento] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardadoId, setGuardadoId] = useState<string | null>(null);

  const completas = respuestas.filter((r) => r.trim()).length;
  const relato = PREGUNTAS.map((p, i) => (respuestas[i].trim() ? `${p}\n${respuestas[i].trim()}` : ""))
    .filter(Boolean)
    .join("\n\n");

  async function ordenar() {
    if (!respuestas[1].trim()) {
      setError("Falta la pregunta 2: el error que se repetía es el corazón del caso.");
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story: relato, meta: { subject: materia, level: nivel } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo ordenar el caso.");
      setCaso({ ...json.structured, materia, nivel });
      setFuente(json.source);
      setEdiciones(0);
      setFidelidad(0);
      setConsentimiento(false);
      setFase("revision");
      window.scrollTo(0, 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo ordenar el caso.");
    } finally {
      setCargando(false);
    }
  }

  async function validar() {
    if (!caso) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_alias: alias.trim() || "Docente",
          years_experience: Number.parseInt(anios, 10) || null,
          subject: materia,
          level: nivel,
          topic: caso.tema || caso.titulo,
          raw_story: relato,
          structured: caso,
          consent: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo guardar el caso.");
      setGuardadoId(json.id);
      setFase("guardado");
      window.scrollTo(0, 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el caso.");
    } finally {
      setCargando(false);
    }
  }

  function editar(cambio: (c: CasoEstructurado) => CasoEstructurado) {
    setCaso((c) => (c ? cambio(c) : c));
  }

  if (fase === "guardado") {
    return (
      <div className="grid grid-cols-1 gap-6">
        <EncabezadoPaso paso="Caso guardado" titulo="Gracias: tu criterio ya no se jubila contigo">
          El caso quedó en la biblioteca como <b>Real · validado por su autor</b>. Los docentes en
          formación ya pueden practicarlo.
        </EncabezadoPaso>
        <div className="card grid gap-4 sm:grid-cols-3">
          <Dato etiqueta="Fidelidad (1 a 5)" valor={String(fidelidad)} />
          <Dato etiqueta="Ediciones hechas" valor={String(ediciones)} />
          <Dato etiqueta="Respuestas" valor={`${completas} de 6`} />
        </div>
        <p className="text-sm text-muted">
          Anota estos números en tu registro de evidencias: miden la hipótesis H1 (el conocimiento
          del veterano se puede capturar en minutos).
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/cases" className="btn">Ver la biblioteca</Link>
          {guardadoId && (
            <Link href={`/simulate/${guardadoId}`} className="btn btn-primary">
              Practicar este caso →
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (fase === "revision" && caso) {
    return (
      <div className="grid grid-cols-1 gap-5">
        <EncabezadoPaso
          paso="Paso 1b · Revisa y valida"
          titulo="Así entendimos tu caso"
          extra={<span className="chip bg-warn-soft text-warn">Pendiente de tu validación</span>}
        >
          Usamos solo lo que dijiste. Corrige lo que no suene a ti; nada se publica sin tu visto
          bueno.
        </EncabezadoPaso>

        {fuente === "demo" && (
          <p className="rounded-lg bg-warn-soft px-4 py-3 text-sm text-warn">
            Modo demo: sin clave del modelo se muestra un caso de ejemplo guardado, no la extracción
            de tu relato.
          </p>
        )}

        {caso.campos_faltantes.length > 0 && (
          <div className="grid gap-1.5 rounded-lg bg-warn-soft px-4 py-3.5">
            <b className="text-warn">
              {caso.campos_faltantes.length === 1 ? "Falta 1 dato" : `Faltan ${caso.campos_faltantes.length} datos`} que no
              mencionaste
            </b>
            <ul className="list-disc pl-5">
              {caso.campos_faltantes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <span className="text-sm text-muted">Puedes completarlos abajo o dejarlos en blanco.</span>
          </div>
        )}

        <dl className="card grid items-start gap-x-5 gap-y-3 sm:grid-cols-[190px_1fr]">
          <Campo id="titulo" etiqueta="Título" valor={caso.titulo} onEditar={(v) => editar((c) => ({ ...c, titulo: v }))} onCambio={() => setEdiciones((n) => n + 1)} />
          <Campo id="concepto" etiqueta="Concepto clave" valor={caso.concepto_clave} onEditar={(v) => editar((c) => ({ ...c, concepto_clave: v }))} onCambio={() => setEdiciones((n) => n + 1)} />
          <Campo id="error" etiqueta="Error frecuente" valor={caso.error_frecuente.descripcion} onEditar={(v) => editar((c) => ({ ...c, error_frecuente: { ...c.error_frecuente, descripcion: v } }))} onCambio={() => setEdiciones((n) => n + 1)} />
          <Campo id="ejemplo" etiqueta="Ejemplo del alumno" valor={caso.error_frecuente.ejemplo_alumno} onEditar={(v) => editar((c) => ({ ...c, error_frecuente: { ...c.error_frecuente, ejemplo_alumno: v } }))} onCambio={() => setEdiciones((n) => n + 1)} />
          <Campo id="causa" etiqueta="Por qué ocurre" valor={caso.error_frecuente.por_que_ocurre} onEditar={(v) => editar((c) => ({ ...c, error_frecuente: { ...c.error_frecuente, por_que_ocurre: v } }))} onCambio={() => setEdiciones((n) => n + 1)} />
          <Campo id="estrategia" etiqueta="Lo que funcionó" valor={caso.estrategia_que_funciono.descripcion} onEditar={(v) => editar((c) => ({ ...c, estrategia_que_funciono: { ...c.estrategia_que_funciono, descripcion: v } }))} onCambio={() => setEdiciones((n) => n + 1)} />
          <Campo id="pasos" etiqueta="Pasos (uno por línea)" valor={caso.estrategia_que_funciono.pasos.join("\n")} onEditar={(v) => editar((c) => ({ ...c, estrategia_que_funciono: { ...c.estrategia_que_funciono, pasos: v.split("\n") } }))} onCambio={() => setEdiciones((n) => n + 1)} />
          <Campo id="condiciones" etiqueta="En qué condiciones" valor={caso.estrategia_que_funciono.condiciones} onEditar={(v) => editar((c) => ({ ...c, estrategia_que_funciono: { ...c.estrategia_que_funciono, condiciones: v } }))} onCambio={() => setEdiciones((n) => n + 1)} />
          <Campo id="nofunciono" etiqueta="Lo que no funcionó" valor={caso.lo_que_no_funciono} onEditar={(v) => editar((c) => ({ ...c, lo_que_no_funciono: v }))} onCambio={() => setEdiciones((n) => n + 1)} />
          <Campo id="senal" etiqueta="Señal de comprensión" valor={caso.senal_de_comprension} onEditar={(v) => editar((c) => ({ ...c, senal_de_comprension: v }))} onCambio={() => setEdiciones((n) => n + 1)} />
          <Campo id="contexto" etiqueta="Contexto del aula" valor={caso.contexto_aula} onEditar={(v) => editar((c) => ({ ...c, contexto_aula: v }))} onCambio={() => setEdiciones((n) => n + 1)} />
        </dl>

        {caso.perfiles_estudiantes.length > 0 && (
          <div className="card grid gap-3">
            <h2 className="text-lg">Estudiantes que aparecerán en la simulación</h2>
            <ul className="grid gap-3 sm:grid-cols-3">
              {caso.perfiles_estudiantes.map((p) => (
                <li key={p.nombre} className="rounded-lg bg-sunk p-3 text-sm">
                  <b>{p.nombre}</b>
                  <p className="text-muted">{p.perfil}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="card grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <span className="text-sm font-medium">¿Qué tan fiel es esto a lo que quisiste decir?</span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setFidelidad(n)}
                  aria-label={`${n} de 5`}
                  aria-pressed={fidelidad === n}
                  className={`h-9 w-9 rounded-lg border font-mono ${
                    n <= fidelidad ? "border-ember bg-ember text-ember-ink" : "border-line bg-surface"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <span className="text-[13px] text-muted">Evidencia para la hipótesis H1.</span>
          </div>
          <Dato etiqueta="Ediciones hechas" valor={String(ediciones)} />
        </div>

        <label className="flex items-start gap-2.5 rounded-lg bg-sunk p-3.5">
          <input
            id="consentimiento"
            type="checkbox"
            checked={consentimiento}
            onChange={(e) => setConsentimiento(e.target.checked)}
            className="mt-1 h-4.5 w-4.5 flex-none accent-ember"
          />
          <span>
            Autorizo que este caso se use, con mi alias y sin datos personales, para entrenar a
            docentes en formación. Puedo retirarlo cuando quiera.
          </span>
        </label>

        {error && <p className="rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}

        <div className="flex flex-wrap justify-between gap-2.5">
          <button type="button" className="btn" onClick={() => setFase("relato")}>
            ← Volver al relato
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!consentimiento || fidelidad === 0 || cargando}
            onClick={validar}
          >
            {cargando ? "Guardando…" : "Validar y guardar mi caso"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5">
      <EncabezadoPaso
        paso="Paso 1 · Docente con experiencia"
        titulo="Cuéntanos un caso de tu aula"
        extra={esEjemplo ? <span className="chip bg-sunk text-muted">Relato de ejemplo</span> : undefined}
      >
        Responde con tus palabras, como se lo contarías a un colega. No hace falta escribir bonito:
        luego podrás corregir todo.
      </EncabezadoPaso>

      <div className="card grid gap-4 sm:grid-cols-2">
        <Etiquetado id="alias" etiqueta="Tu alias (sin nombre real)">
          <input id="alias" className="input" value={alias} onChange={(e) => setAlias(e.target.value)} />
        </Etiquetado>
        <Etiquetado id="anios" etiqueta="Años enseñando">
          <input id="anios" className="input" inputMode="numeric" value={anios} onChange={(e) => setAnios(e.target.value)} />
        </Etiquetado>
        <Etiquetado id="materia" etiqueta="Materia">
          <select id="materia" className="input" value={materia} onChange={(e) => setMateria(e.target.value)}>
            {MATERIAS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Etiquetado>
        <Etiquetado id="nivel" etiqueta="Grado">
          <select id="nivel" className="input" value={nivel} onChange={(e) => setNivel(e.target.value)}>
            {NIVELES.map((n) => <option key={n}>{n}</option>)}
          </select>
        </Etiquetado>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="text-[13px] text-muted">{completas} de 6 respuestas</span>
        <div className="h-1.5 max-w-80 flex-1 overflow-hidden rounded-full bg-sunk">
          <i className="block h-full rounded-full bg-ember transition-all" style={{ width: `${(completas / 6) * 100}%` }} />
        </div>
      </div>

      <ol className="grid gap-4">
        {PREGUNTAS.map((p, i) => {
          const lista = respuestas[i].trim().length > 0;
          return (
            <li key={p} className="grid grid-cols-[32px_1fr] gap-3">
              <span
                className={`mt-0.5 grid h-7 w-7 place-items-center rounded-full font-mono text-[13px] ${
                  lista ? "bg-good-soft text-good" : "bg-sunk text-muted"
                }`}
              >
                {i + 1}
              </span>
              <Etiquetado id={`q${i}`} etiqueta={p}>
                <textarea
                  id={`q${i}`}
                  className="input min-h-19"
                  value={respuestas[i]}
                  onChange={(e) => {
                    setEsEjemplo(false);
                    setRespuestas((r) => r.map((x, j) => (j === i ? e.target.value : x)));
                  }}
                />
              </Etiquetado>
            </li>
          );
        })}
      </ol>

      {error && <p className="rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}

      <div className="flex flex-wrap justify-end gap-2.5">
        <button
          type="button"
          className="btn"
          onClick={() => {
            setRespuestas(PREGUNTAS.map(() => ""));
            setEsEjemplo(false);
            document.getElementById("q0")?.focus();
          }}
        >
          Empezar en blanco
        </button>
        <button type="button" className="btn btn-primary" disabled={cargando} onClick={ordenar}>
          {cargando ? "Ordenando tu caso…" : "Ordenar mi caso →"}
        </button>
      </div>
    </div>
  );
}

function Etiquetado({ id, etiqueta, children }: { id: string; etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
      </label>
      {children}
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-sm font-medium">{etiqueta}</span>
      <span className="font-mono text-3xl">{valor}</span>
    </div>
  );
}

/** Campo editable; cuenta una edición cada vez que el docente cambia el texto y sale del campo. */
function Campo({
  id,
  etiqueta,
  valor,
  onEditar,
  onCambio,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  onEditar: (v: string) => void;
  onCambio: () => void;
}) {
  const [alEntrar, setAlEntrar] = useState(valor);
  return (
    <>
      <dt className="pt-2.5 text-[13px] text-muted">
        <label htmlFor={`rf-${id}`}>{etiqueta}</label>
      </dt>
      <dd className="m-0 min-w-0">
        <textarea
          id={`rf-${id}`}
          className={`input ${valor.trim() ? "" : "border-warn"}`}
          rows={valor.length > 110 ? 3 : 2}
          value={valor}
          placeholder="No lo mencionaste: complétalo si quieres"
          onFocus={() => setAlEntrar(valor)}
          onChange={(e) => onEditar(e.target.value)}
          onBlur={() => {
            if (valor !== alEntrar) onCambio();
          }}
        />
      </dd>
    </>
  );
}
