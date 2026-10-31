import { CaseLibrary } from "@/components/CaseLibrary";
import { EncabezadoPaso } from "@/components/ui";
import { listarCasos } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const casos = await listarCasos();

  return (
    <div className="grid grid-cols-1 gap-5">
      <EncabezadoPaso paso="Paso 2 · Biblioteca de casos" titulo="Casos para practicar">
        Los casos <b>Reales</b> vienen de un docente que los validó. Los de <b>Ejemplo</b> son
        ficticios y sirven para la demo; nunca se presentan como reales.
      </EncabezadoPaso>
      <CaseLibrary
        casos={casos.map((c) => ({
          id: c.id,
          titulo: c.titulo,
          materia: c.materia || c.subject,
          nivel: c.nivel || c.level,
          autor: c.author_alias,
          anios: c.years_experience,
          esEjemplo: c.is_seed,
          error: c.error_frecuente?.descripcion ?? "",
          tags: c.tags,
        }))}
      />
    </div>
  );
}
