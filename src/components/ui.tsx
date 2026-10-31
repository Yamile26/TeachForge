import { RUBRICA } from "@/lib/rubric";
import type { Competencia } from "@/lib/schemas";

export function nombreCompetencia(clave: string): string {
  return RUBRICA[clave as Competencia]?.nombre ?? clave;
}

/** Puntaje 0-3 como tres segmentos; null = sin evidencia. */
export function Puntos({ valor }: { valor: number | null }) {
  return (
    <span className="flex items-center gap-1.5" aria-label={valor === null ? "Sin evidencia" : `${valor} de 3`}>
      {[0, 1, 2].map((i) => (
        <i key={i} className={`h-2 w-6 rounded-full ${valor !== null && valor > i ? "bg-ember" : "bg-sunk"}`} />
      ))}
      <span className="ml-1.5 min-w-8 text-right font-mono text-sm">{valor === null ? "—" : `${valor}/3`}</span>
    </span>
  );
}

export function EncabezadoPaso({
  paso,
  titulo,
  children,
  extra,
}: {
  paso: string;
  titulo: string;
  children?: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="eyebrow">{paso}</p>
        <h1 className="mt-1 text-2xl font-bold">{titulo}</h1>
        {children && <p className="mt-1.5 max-w-[62ch] text-muted">{children}</p>}
      </div>
      {extra}
    </div>
  );
}
