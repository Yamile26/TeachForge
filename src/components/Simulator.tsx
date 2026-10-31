"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CasoGuardado, Evaluacion, Simulacion, TurnoDocente } from "@/lib/schemas";
import { EncabezadoPaso, nombreCompetencia, Puntos } from "./ui";

type Mensaje = { role: "docente" | "estudiante"; alumno?: string; texto: string };
type Estado = Simulacion["estado_oculto"][number]["estado"];
type ResultadoEvaluacion = Evaluacion & {
  caso: Pick<CasoGuardado, "titulo" | "estrategia_que_funciono" | "lo_que_no_funciono" | "senal_de_comprension">;
  uso: { tokensIn: number; tokensOut: number; costUsd: number; model: string };
  source: "demo" | "live";
};

const COLORES_AVATAR = ["#C0623A", "#3C7A8C", "#7C5BA6", "#4D7A3A"];
const ETIQUETA_ESTADO: Record<Estado, string> = {
  sigue_con_error: "Sigue con el error",
  mejora_parcial: "Mejora parcial",
  comprende: "Comprende",
};
const COLOR_ESTADO: Record<Estado, string> = {
  sigue_con_error: "bg-bad",
  mejora_parcial: "bg-warn",
  comprende: "bg-good",
};

const IDEAS = [
  ["Pregunta de diagnóstico", "Antes de corregir, ¿cómo llegaste a ese resultado? Explícame qué hiciste en cada paso."],
  ["Representación concreta", "Imaginen una balanza en equilibrio. Si quito algo de un lado, ¿qué tengo que hacer en el otro para que no se desequilibre?"],
  ["Caso nuevo y comprobar", "Ahora resuelvan uno nuevo y comprueben reemplazando el valor en la ecuación original. Expliquen a un compañero por qué funciona."],
];

export function Simulator({ caso }: { caso: CasoGuardado }) {
  const [alias, setAlias] = useState("Carlos");
  const [modoIa, setModoIa] = useState(false);
  const [dialogo, setDialogo] = useState<Mensaje[]>([]);
  const [turnos, setTurnos] = useState<TurnoDocente[]>([]);
  const [estados, setEstados] = useState<Simulacion["estado_oculto"]>([]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState<"simular" | "evaluar" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fuente, setFuente] = useState<"demo" | "live" | null>(null);
  const [evaluacion, setEvaluacion] = useState<ResultadoEvaluacion | null>(null);
  const [verVeterano, setVerVeterano] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const evalRef = useRef<HTMLElement>(null);

  const terminado = turnos.length >= 3;
  const alumnos = [
    ...new Set([
      ...caso.perfiles_estudiantes.map((p) => p.nombre),
      ...dialogo.filter((m) => m.alumno).map((m) => m.alumno as string),
    ]),
  ];
  const color = (nombre?: string) => COLORES_AVATAR[Math.max(alumnos.indexOf(nombre ?? ""), 0) % COLORES_AVATAR.length];

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [dialogo, cargando]);

  useEffect(() => {
    if (evaluacion) evalRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [evaluacion]);

  async function hablar() {
    const mensaje = texto.trim();
    if (mensaje.length < 8 || terminado || cargando) return;
    const historial: Mensaje[] = [...dialogo, { role: "docente", texto: mensaje }];
    setDialogo(historial);
    setTexto("");
    setCargando("simular");
    setError(null);
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // turns = intervenciones previas; la actual va al final de history.
        body: JSON.stringify({ caseId: caso.id, turns: turnos, history: historial, iaMode: modoIa }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "La clase no respondió.");
      setDialogo([
        ...historial,
        ...(json.respuestas as Simulacion["respuestas"]).map((r) => ({
          role: "estudiante" as const,
          alumno: r.alumno,
          texto: r.texto,
        })),
      ]);
      setEstados(json.estado_oculto);
      setFuente(json.source);
      setTurnos((t) => [...t, { turno: t.length + 1, mensaje }]);
    } catch (e) {
      setDialogo(dialogo);
      setTexto(mensaje);
      setError(e instanceof Error ? e.message : "La clase no respondió.");
    } finally {
      setCargando(null);
    }
  }

  async function evaluar() {
    setCargando("evaluar");
    setError(null);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: caso.id,
          learner_alias: alias.trim() || "Docente en formación",
          transcript: turnos,
          hidden_states: estados,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo evaluar el intento.");
      setEvaluacion(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo evaluar el intento.");
    } finally {
      setCargando(null);
    }
  }

  function reiniciar() {
    setDialogo([]);
    setTurnos([]);
    setEstados([]);
    setEvaluacion(null);
    setVerVeterano(false);
    setError(null);
    setTexto("");
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <EncabezadoPaso
        paso={`Paso 3 · Clase simulada · ${caso.is_seed ? "Caso de ejemplo" : `Caso real de ${caso.author_alias}`}`}
        titulo={caso.titulo}
        extra={
          <button type="button" className="btn" onClick={reiniciar}>
            Reiniciar clase
          </button>
        }
      >
        Tienes 3 turnos. Los estudiantes mantienen su error hasta que lo abordes de forma
        específica; con una explicación general no cambian.
      </EncabezadoPaso>

      <div className="grid items-start gap-4.5 md:grid-cols-[280px_1fr]">
        <aside className="grid gap-3.5">
          <div className="pizarra">
            <small className="mb-1.5 block font-sans text-[11px] opacity-70">En la pizarra</small>
            {caso.error_frecuente.ejemplo_alumno || caso.tema}
          </div>

          <div className="card grid gap-2.5 p-4">
            <p className="eyebrow">Estudiantes</p>
            {caso.perfiles_estudiantes.map((p) => {
              const estado = estados.find((e) => e.alumno === p.nombre)?.estado;
              return (
                <div key={p.nombre} className="grid grid-cols-[36px_1fr_auto] items-center gap-2.5">
                  <Avatar nombre={p.nombre} color={color(p.nombre)} />
                  <span>
                    <b>{p.nombre}</b>
                    <small className="block text-xs leading-snug text-muted">{p.perfil}</small>
                  </span>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${estado ? COLOR_ESTADO[estado] : "bg-line"}`}
                    title={estado ? ETIQUETA_ESTADO[estado] : "Todavía no habla"}
                    aria-label={estado ? ETIQUETA_ESTADO[estado] : "Todavía no habla"}
                  />
                </div>
              );
            })}
            <p className="text-xs text-muted">
              <span className="text-bad">●</span> error · <span className="text-warn">●</span> parcial ·{" "}
              <span className="text-good">●</span> comprende
            </p>
          </div>

          <label className={`flex items-center gap-2.5 rounded-lg bg-ia-soft p-3 text-sm text-ia ${turnos.length ? "opacity-60" : "cursor-pointer"}`}>
            <input
              id="modo-ia"
              type="checkbox"
              checked={modoIa}
              disabled={turnos.length > 0}
              onChange={(e) => setModoIa(e.target.checked)}
              className="h-4.5 w-4.5 accent-ia"
            />
            <span>
              <b>Momento IA</b>
              <small className="block opacity-85">Un alumno trae una respuesta de una IA con un error. Actívalo antes de empezar.</small>
            </span>
          </label>

          <div className="grid gap-1.5">
            <label htmlFor="alias" className="text-sm font-medium">Tu alias</label>
            <input id="alias" className="input" value={alias} onChange={(e) => setAlias(e.target.value)} />
          </div>
        </aside>

        <section className="card flex min-h-115 min-w-0 flex-col overflow-hidden p-0" aria-label="Clase">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-4.5 py-3.5">
            <b>Turno {Math.min(turnos.length + 1, 3)} de 3</b>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <i key={i} className={`h-1.5 w-7 rounded-full ${i < turnos.length ? "bg-ember" : "bg-sunk"}`} />
              ))}
            </div>
          </div>

          <div ref={logRef} className="flex max-h-130 flex-1 flex-col gap-3 overflow-y-auto p-4.5" aria-live="polite">
            <p className="self-center rounded-full bg-bg px-3 py-1 text-xs text-muted">
              {caso.contexto_aula || `${caso.materia} · ${caso.nivel}`}
            </p>
            {dialogo.length === 0 && (
              <p className="self-center text-center text-sm text-muted">
                La clase espera tu primera intervención. El error que vas a enfrentar:{" "}
                <i>{caso.error_frecuente.descripcion}</i>
              </p>
            )}
            {dialogo.map((m, i) =>
              m.role === "docente" ? (
                <div key={i} className="max-w-[88%] self-end rounded-[14px_4px_14px_14px] bg-steel px-3.5 py-2.5 text-steel-ink">
                  <b className="block text-xs font-medium opacity-70">Tú</b>
                  {m.texto}
                </div>
              ) : (
                <div key={i} className="grid max-w-[88%] grid-cols-[32px_1fr] items-start gap-2.5">
                  <Avatar nombre={m.alumno ?? "?"} color={color(m.alumno)} pequeno />
                  <div className="min-w-0 rounded-[4px_14px_14px_14px] bg-sunk px-3.5 py-2.5">
                    <b className="block text-xs font-medium text-muted">{m.alumno}</b>
                    {m.texto}
                  </div>
                </div>
              ),
            )}
            {cargando === "simular" && (
              <span className="flex gap-1 self-center rounded-full bg-bg px-3 py-2" aria-label="Los estudiantes están respondiendo">
                {[0, 150, 300].map((d) => (
                  <i key={d} className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted" style={{ animationDelay: `${d}ms` }} />
                ))}
              </span>
            )}
            {terminado && <p className="self-center rounded-full bg-bg px-3 py-1 text-xs text-muted">Fin de la clase · 3 turnos completos</p>}
          </div>

          <div className="grid gap-2 border-t border-line p-3">
            {error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
            {fuente === "demo" && (
              <p className="text-xs text-warn">Modo demo: las respuestas de la clase vienen de /fixtures.</p>
            )}
            {terminado ? (
              <button type="button" className="btn btn-primary justify-self-end" onClick={evaluar} disabled={cargando !== null || evaluacion !== null}>
                {cargando === "evaluar" ? "Evaluando con la rúbrica…" : evaluacion ? "Evaluación lista ↓" : "Ver mi evaluación →"}
              </button>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  <span className="self-center text-xs text-muted">Ideas:</span>
                  {IDEAS.map(([etiqueta, frase]) => (
                    <button
                      key={etiqueta}
                      type="button"
                      onClick={() => setTexto(frase)}
                      className="rounded-full border border-line bg-bg px-2.5 py-1 text-xs text-muted hover:border-ember hover:text-ink"
                    >
                      {etiqueta}
                    </button>
                  ))}
                </div>
                <textarea
                  id="intervencion"
                  className="input"
                  rows={3}
                  placeholder="Escribe lo que dirías a la clase…"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      hablar();
                    }
                  }}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] text-muted">Ctrl + Enter para enviar</span>
                  <button type="button" className="btn btn-primary" onClick={hablar} disabled={cargando !== null || texto.trim().length < 8}>
                    Hablar a la clase
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {evaluacion && (
        <section ref={evalRef} className="grid scroll-mt-20 gap-4.5" aria-label="Evaluación">
          <EncabezadoPaso
            paso="Paso 4 · Evaluación con evidencia"
            titulo="Cómo te fue en esta clase"
            extra={evaluacion.source === "demo" ? <span className="chip bg-warn-soft text-warn">Evaluación de ejemplo</span> : undefined}
          >
            Cada puntaje (0 a 3) cita lo que dijiste. Sin evidencia no hay puntaje, y no damos nota global.
          </EncabezadoPaso>

          <div className="card">
            {evaluacion.scores.map((s, i) => (
              <div key={s.competencia} className={`grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 py-4.5 ${i ? "border-t border-line" : "pt-0"}`}>
                <h3 className="text-[17px] font-bold">{nombreCompetencia(s.competencia)}</h3>
                <Puntos valor={s.puntaje} />
                <div className="col-span-2 grid gap-1.5 text-sm">
                  {s.puntaje === null || !s.evidencia ? (
                    <p className="text-[13px] text-muted italic">Sin evidencia en la transcripción para puntuar esta competencia.</p>
                  ) : (
                    <blockquote className="rounded-r-lg border-l-3 border-steel bg-sunk px-3 py-2 italic">{s.evidencia}</blockquote>
                  )}
                  <p>
                    <b>Para mejorar:</b> {s.mejora}
                  </p>
                </div>
              </div>
            ))}
            <p className="border-t border-line pt-4 text-muted">{evaluacion.summary}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid content-start gap-2 rounded-xl bg-steel p-5 text-steel-ink">
              <p className="text-xs font-medium tracking-[0.08em] uppercase opacity-75">Tu siguiente práctica</p>
              <h3 className="text-[17px] font-bold">{nombreCompetencia(evaluacion.next_focus)}</h3>
              <p>Es tu competencia más baja en este intento.</p>
              <div className="mt-1 flex flex-wrap gap-2">
                <Link href={`/profile?alias=${encodeURIComponent(alias.trim() || "Docente en formación")}`} className="btn btn-primary">
                  Ver mi perfil
                </Link>
                <button type="button" className="btn" onClick={reiniciar}>
                  Intentar de nuevo
                </button>
              </div>
            </div>

            <div className="grid content-start gap-2 rounded-xl border border-dashed border-ember bg-ember-soft p-5">
              <p className="eyebrow">Cómo lo hizo {caso.is_seed ? "el docente del ejemplo" : caso.author_alias}</p>
              {verVeterano ? (
                <>
                  <p>{evaluacion.caso.estrategia_que_funciono.descripcion}</p>
                  <ol className="list-decimal pl-5">
                    {evaluacion.caso.estrategia_que_funciono.pasos.filter(Boolean).map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ol>
                  {evaluacion.comparacion_con_veterano.coincidencias.length > 0 && (
                    <p className="text-sm">
                      <b>Coincidiste en:</b> {evaluacion.comparacion_con_veterano.coincidencias.join(" ")}
                    </p>
                  )}
                  {evaluacion.comparacion_con_veterano.diferencias.length > 0 && (
                    <p className="text-sm">
                      <b>Diferencias:</b> {evaluacion.comparacion_con_veterano.diferencias.join(" ")}
                    </p>
                  )}
                  <p className="text-[13px] text-muted">Es una forma que funcionó en su aula, no la única válida.</p>
                </>
              ) : (
                <button type="button" className="btn justify-self-start" onClick={() => setVerVeterano(true)}>
                  Ver su estrategia
                </button>
              )}
            </div>
          </div>

          {evaluacion.uso.costUsd > 0 && (
            <p className="text-right font-mono text-xs text-muted">
              {evaluacion.uso.tokensIn + evaluacion.uso.tokensOut} tokens · US$ {evaluacion.uso.costUsd.toFixed(4)} en la evaluación
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function Avatar({ nombre, color, pequeno }: { nombre: string; color: string; pequeno?: boolean }) {
  return (
    <span
      className={`grid place-items-center rounded-full font-display font-bold text-white ${pequeno ? "h-8 w-8 text-[13px]" : "h-9 w-9"}`}
      style={{ background: color }}
      aria-hidden="true"
    >
      {nombre.charAt(0)}
    </span>
  );
}
