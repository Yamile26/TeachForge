import { Placeholder } from "@/components/Placeholder";

const preguntas = [
  "¿Qué tema y nivel enseñabas?",
  "¿Qué error de los alumnos se repetía?",
  "¿Cómo te diste cuenta de que no entendían?",
  "¿Qué hiciste que sí funcionó y en qué condiciones?",
  "¿Qué intentaste que no funcionó?",
  "¿Cómo supiste que por fin entendieron?",
];

export default function CapturePage() {
  return (
    <Placeholder
      titulo="Captura"
      descripcion="El docente veterano cuenta la situación con estas preguntas guiadas. La IA la estructura sin inventar y él revisa, edita y valida antes de guardar."
      contrato="POST /api/extract { story } → { structured, source, uso } · POST /api/cases { author_alias, raw_story, structured, consent: true } → { id }"
    >
      <ol className="mt-8 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
        {preguntas.map((p, i) => (
          <li key={p} className="flex gap-3">
            <span className="font-mono text-neutral-400">{i + 1}.</span>
            <span>{p}</span>
          </li>
        ))}
      </ol>
    </Placeholder>
  );
}
