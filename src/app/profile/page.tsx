import Link from "next/link";
import { EncabezadoPaso, nombreCompetencia } from "@/components/ui";
import { perfilDe } from "@/lib/profile";
import { RUBRICA } from "@/lib/rubric";
import type { Competencia } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ alias?: string }>;
}) {
  const alias = (await searchParams).alias?.trim() ?? "";
  const perfil = alias ? await perfilDe(alias) : null;
  const filas = perfil ? (Object.entries(perfil.competencies) as [Competencia, NonNullable<(typeof perfil.competencies)[Competencia]>][]) : [];

  return (
    <div className="grid grid-cols-1 gap-5">
      <EncabezadoPaso
        paso="Paso 5 · Perfil de competencias"
        titulo={alias ? `${alias} · docente en formación` : "Tu perfil de competencias"}
        extra={
          perfil && perfil.attempts > 0 ? (
            <span className="chip bg-sunk text-muted">
              {perfil.attempts} intento{perfil.attempts === 1 ? "" : "s"}
            </span>
          ) : undefined
        }
      >
        Cada intento deja evidencia. La competencia más baja define tu siguiente práctica.
      </EncabezadoPaso>

      <form className="card flex flex-wrap items-end gap-2.5" action="/profile">
        <div className="grid min-w-0 flex-1 gap-1.5">
          <label htmlFor="alias" className="text-sm font-medium">
            Alias con el que practicaste
          </label>
          <input id="alias" name="alias" className="input" defaultValue={alias} placeholder="Carlos" />
        </div>
        <button className="btn btn-steel">Ver perfil</button>
      </form>

      {perfil && perfil.attempts === 0 && (
        <div className="card grid gap-3">
          <p>
            Todavía no hay intentos con el alias <b>{alias}</b>. Termina una clase simulada y tu
            perfil aparecerá aquí.
          </p>
          <Link href="/cases" className="btn btn-primary justify-self-start">
            Elegir un caso para practicar
          </Link>
        </div>
      )}

      {perfil && perfil.attempts > 0 && (
        <>
          <div className="card grid gap-4.5">
            <div className="flex flex-wrap gap-4 text-[13px] text-muted">
              <span>
                <i className="mr-1.5 inline-block h-2 w-3.5 rounded-full bg-line align-middle" />
                Intento anterior
              </span>
              <span>
                <i className="mr-1.5 inline-block h-2 w-3.5 rounded-full bg-ember align-middle" />
                Último intento
              </span>
            </div>
            <ul className="grid gap-4">
              {filas.map(([clave, c]) => {
                const previo = c.history.length > 1 ? c.history[c.history.length - 2] : null;
                const delta = c.latest !== null && previo !== null ? c.latest - previo : null;
                return (
                  <li key={clave} className="grid grid-cols-[1fr_64px] items-center gap-x-3.5 gap-y-1.5 sm:grid-cols-[220px_1fr_72px]">
                    <span title={RUBRICA[clave].descripcion}>{c.nombre}</span>
                    <div className="relative col-span-2 row-start-2 h-3.5 rounded-full bg-sunk sm:col-span-1 sm:row-start-auto">
                      {previo !== null && (
                        <span className="absolute inset-y-0 left-0 rounded-full bg-line" style={{ width: `${(previo / 3) * 100}%` }} />
                      )}
                      <span
                        className="absolute inset-y-[3px] left-0 rounded-full bg-ember"
                        style={{ width: c.latest === null ? 0 : `${Math.max((c.latest / 3) * 100, 3)}%` }}
                      />
                    </div>
                    <span className="text-right font-mono">
                      {c.latest === null ? "—" : `${c.latest}/3`}
                      {delta ? (
                        <small className={delta > 0 ? "text-good" : "text-bad"}>
                          {" "}
                          {delta > 0 ? "+" : ""}
                          {delta}
                        </small>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-[13px] text-muted">«—» significa sin evidencia en ese intento: no se cuenta como 0.</p>
          </div>

          {perfil.next_focus && (
            <div className="grid gap-2 rounded-xl bg-steel p-5 text-steel-ink">
              <p className="text-xs font-medium tracking-[0.08em] uppercase opacity-75">Siguiente práctica recomendada</p>
              <h2 className="text-lg font-bold">{nombreCompetencia(perfil.next_focus)}</h2>
              <p>{RUBRICA[perfil.next_focus].descripcion} Busca un caso que la entrene.</p>
              <Link href="/cases" className="btn btn-primary mt-1 justify-self-start">
                Elegir un caso
              </Link>
            </div>
          )}

          <div className="card">
            <h2 className="mb-2.5 text-lg">Historial</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs tracking-wide text-muted uppercase">
                    <th className="border-b border-line px-2 py-2.5 font-medium">Intento</th>
                    {filas.map(([clave, c]) => (
                      <th key={clave} className="border-b border-line px-2 py-2.5 font-medium">
                        {c.nombre.split(" ")[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: perfil.attempts }, (_, i) => (
                    <tr key={i}>
                      <td className="border-b border-line px-2 py-2.5">Intento {i + 1}</td>
                      {filas.map(([clave, c]) => (
                        <td key={clave} className="border-b border-line px-2 py-2.5 font-mono">
                          {c.history[i] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
