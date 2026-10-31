import { Placeholder } from "@/components/Placeholder";

export default function ProfilePage() {
  return (
    <Placeholder
      titulo="Perfil de competencias"
      descripcion="Puntajes 0-3 por competencia, con la evolución entre intentos y la siguiente práctica recomendada. Sin evidencia no hay puntaje: no se castiga con 0."
      contrato="GET /api/profile?alias=X → { attempts, competencies { clave: { nombre, latest, history[] } }, next_focus }"
    >
      <p className="mt-8 text-sm text-neutral-500">
        La regla de recomendación es explícita y sin IA: la competencia con el puntaje más bajo
        manda la siguiente práctica.
      </p>
    </Placeholder>
  );
}
