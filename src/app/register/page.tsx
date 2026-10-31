"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { roleFromYears, validateInstitutionalEmail, type PerfilRole } from "@/lib/auth";

const PASOS = ["Tu cuenta", "Tu perfil docente", "Tu colegio", "Privacidad"];

const SITUACIONES = [
  "Enseño actualmente",
  "Estoy jubilado o jubilada",
  "Estudio pedagogía o educación",
  "Estoy por empezar a enseñar",
];
const NIVELES = [
  ["inicial", "Inicial"],
  ["primaria", "Primaria"],
  ["secundaria", "Secundaria"],
] as const;
const AREAS = [
  "Matemática",
  "Comunicación",
  "Ciencia y Tecnología",
  "Ciencias Sociales",
  "Inglés",
  "Educación para el Trabajo",
  "Otra",
];
const GESTIONES = ["Pública", "Privada", "Pública de gestión privada (convenio)"];
const REGIONES = [
  "Amazonas", "Áncash", "Apurímac", "Arequipa", "Ayacucho", "Cajamarca", "Callao", "Cusco",
  "Huancavelica", "Huánuco", "Ica", "Junín", "La Libertad", "Lambayeque", "Lima Metropolitana",
  "Lima Provincias", "Loreto", "Madre de Dios", "Moquegua", "Pasco", "Piura", "Puno", "San Martín",
  "Tacna", "Tumbes", "Ucayali",
];

type Nivel = (typeof NIVELES)[number][0];

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function contrasenaValida(v: string) {
  return v.length >= 8 && /[a-zA-Z]/.test(v) && /\d/.test(v);
}

export default function RegisterPage() {
  const router = useRouter();
  const [paso, setPaso] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [intento, setIntento] = useState(false);

  const [f, setF] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    password2: "",
    phone: "",
    role: "veterano" as PerfilRole,
    years: "",
    status: "",
    levels: ["secundaria"] as Nivel[],
    areas: [] as string[],
    training_institution: "",
    school_name: "",
    school_code: "",
    school_type: "",
    region: "",
    ugel: "",
    zone: "urbana" as "urbana" | "rural",
    public_alias: "",
    accepts_terms: false,
    consents_cases: false,
    wants_news: false,
  });

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  function alternar<T extends string>(lista: T[], valor: T): T[] {
    return lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor];
  }

  const errores: Record<string, string | null> = {
    first_name: f.first_name.trim() ? null : "Escribe tus nombres.",
    last_name: f.last_name.trim() ? null : "Escribe tus apellidos.",
    email: CORREO.test(f.email.trim()) ? null : "Revisa el formato del correo.",
    password: contrasenaValida(f.password) ? null : "Usa 8 caracteres o más, con una letra y un número.",
    password2: f.password2 && f.password2 === f.password ? null : "Las contraseñas no coinciden.",
    years: f.years !== "" && Number(f.years) >= 0 && Number(f.years) <= 60 ? null : "Escribe un número entre 0 y 60.",
    status: f.status ? null : "Elige tu situación actual.",
    levels: f.levels.length ? null : "Marca al menos un nivel.",
    areas: f.areas.length ? null : "Marca al menos un área.",
    school_name: f.school_name.trim() ? null : "Escribe el nombre del colegio.",
    school_type: f.school_type ? null : "Elige el tipo de gestión.",
    region: f.region ? null : "Elige tu región.",
    public_alias: f.public_alias.trim().length >= 2 ? null : "Escribe cómo quieres aparecer.",
    accepts_terms: f.accepts_terms ? null : "Debes aceptar los términos para crear tu cuenta.",
  };

  const camposPorPaso: string[][] = [
    ["first_name", "last_name", "email", "password", "password2"],
    ["years", "status", "levels", "areas"],
    ["school_name", "school_type", "region"],
    ["public_alias", "accepts_terms"],
  ];

  const pasoValido = (n: number) => camposPorPaso[n].every((k) => !errores[k]);
  const err = (k: string) => (intento ? errores[k] : null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!pasoValido(paso)) {
      setIntento(true);
      return;
    }
    setIntento(false);
    if (paso < PASOS.length - 1) {
      setPaso(paso + 1);
      return;
    }

    setEnviando(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: f.email.trim().toLowerCase(),
          password: f.password,
          years_experience: Number(f.years),
          first_name: f.first_name.trim(),
          last_name: f.last_name.trim(),
          phone: f.phone.trim() || undefined,
          role: f.role,
          status: f.status,
          levels: f.levels,
          areas: f.areas,
          training_institution: f.training_institution.trim() || undefined,
          school_name: f.school_name.trim(),
          school_code: f.school_code.trim() || undefined,
          school_type: f.school_type,
          region: f.region,
          ugel: f.ugel.trim() || undefined,
          zone: f.zone,
          public_alias: f.public_alias.trim(),
          accepts_terms: true,
          consents_cases: f.consents_cases,
          wants_news: f.wants_news,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload?.error ?? "No se pudo crear la cuenta.");
        return;
      }
      setExito(payload?.message ?? "Cuenta creada. Revisa tu correo para confirmarla.");
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setError("No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  const sugerido = f.years === "" ? null : roleFromYears(Number(f.years));
  const verificado = CORREO.test(f.email.trim()) && validateInstitutionalEmail(f.email);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.3fr]">
      <aside className="hex-band grid gap-4 rounded-2xl bg-ink p-6 text-white">
        <h2 className="text-[clamp(1.5rem,2.6vw,2rem)] font-extrabold text-white">Crea tu cuenta de docente</h2>
        <p className="text-[#c9cce0]">
          Toma unos 3 minutos. Solo pedimos lo necesario para ubicar tu experiencia y proteger a quienes
          comparten sus casos.
        </p>
        <ol className="grid gap-3">
          {[
            ["Tu cuenta", "nombres, apellidos, correo y contraseña."],
            ["Tu perfil docente", "rol, años de aula, nivel y área."],
            ["Tu colegio", "institución, gestión, región y UGEL."],
            ["Privacidad", "tu alias público y tus consentimientos."],
          ].map(([t, d], i) => (
            <li key={t} className="grid grid-cols-[1.6rem_1fr] items-start gap-2.5 text-[15px] text-[#e4e6f2]">
              <span className={`hexicon h-6.5 w-6.5 text-xs font-extrabold ${i <= paso ? "bg-gold text-ink" : "bg-white/20 text-white"}`}>
                {i + 1}
              </span>
              <span>
                <b className="text-white">{t}:</b> {d}
              </span>
            </li>
          ))}
        </ol>
        <p className="text-sm text-[#c9cce0]">No pedimos tu DNI ni datos de tus alumnos.</p>
      </aside>

      <form onSubmit={onSubmit} noValidate className="card grid gap-5">
        <div>
          <span className="eyebrow">Registro de profesores</span>
          <h1 className="mt-3 text-[clamp(1.8rem,3vw,2.4rem)] font-extrabold">
            {exito ? "Listo, ya eres parte de TeachForge" : `Paso ${paso + 1} de 4 · ${PASOS[paso]}`}
          </h1>
        </div>
        <ol className="flex gap-1.5" aria-label="Pasos del registro">
          {PASOS.map((p, i) => (
            <li key={p} className={`grid flex-1 gap-1.5 text-xs font-bold ${i <= paso ? "text-ink" : "text-muted"}`}>
              <span className={`h-1.5 rounded-full ${i <= paso ? "bg-ember" : "bg-line"}`} />
              {p}
            </li>
          ))}
        </ol>

        {exito ? (
          <div className="grid gap-1 rounded-2xl border border-good bg-good-soft p-4">
            <b>¡Cuenta creada!</b>
            <span>{exito}</span>
          </div>
        ) : (
          <>
            {paso === 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="first_name" label="Nombres" req error={err("first_name")}>
                  <input id="first_name" className="input" autoComplete="given-name" placeholder="María Elena" value={f.first_name} onChange={(e) => set("first_name", e.target.value)} />
                </Campo>
                <Campo id="last_name" label="Apellidos" req error={err("last_name")}>
                  <input id="last_name" className="input" autoComplete="family-name" placeholder="Quispe Huamán" value={f.last_name} onChange={(e) => set("last_name", e.target.value)} />
                </Campo>
                <Campo
                  id="email"
                  label="Correo electrónico"
                  req
                  full
                  error={err("email")}
                  ayuda={
                    verificado
                      ? "Correo institucional: tu cuenta aparecerá como verificada."
                      : "Si usas tu correo institucional, tu cuenta aparecerá como verificada. También puedes usar uno personal."
                  }
                >
                  <input id="email" type="email" className="input" autoComplete="email" placeholder="maria.quispe@colegio.edu.pe" value={f.email} onChange={(e) => set("email", e.target.value)} />
                </Campo>
                <Campo id="password" label="Contraseña" req error={err("password")} ayuda="Al menos 8 caracteres, con una letra y un número.">
                  <input id="password" type="password" className="input" autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={f.password} onChange={(e) => set("password", e.target.value)} />
                </Campo>
                <Campo id="password2" label="Confirmar contraseña" req error={err("password2")}>
                  <input id="password2" type="password" className="input" autoComplete="new-password" placeholder="Repite la contraseña" value={f.password2} onChange={(e) => set("password2", e.target.value)} />
                </Campo>
                <Campo id="phone" label="Celular" opcional full ayuda="Solo para recordatorios de práctica, si los activas.">
                  <input id="phone" type="tel" className="input" autoComplete="tel" placeholder="987 654 321" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
                </Campo>
              </div>
            )}

            {paso === 1 && (
              <div className="grid gap-4">
                <fieldset className="grid gap-2">
                  <legend className="mb-2 font-semibold">
                    ¿Cómo usarás TeachForge? <span className="text-ember">*</span>
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        ["veterano", "Docente con experiencia", "Quiero compartir casos de mi aula y validarlos."],
                        ["novato", "Docente en formación o que empieza", "Quiero practicar con casos reales y mejorar."],
                      ] as const
                    ).map(([v, t, d]) => (
                      <label key={v} className={`grid cursor-pointer grid-cols-[auto_1fr] items-start gap-3 rounded-2xl border p-4 transition ${f.role === v ? "border-ember ring-3 ring-ember/15" : "border-line"}`}>
                        <input type="radio" name="role" className="mt-1 accent-ember" checked={f.role === v} onChange={() => set("role", v)} />
                        <span>
                          <b className="block">{t}</b>
                          <span className="text-sm text-muted">{d}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo
                    id="years"
                    label="Años de experiencia en aula"
                    req
                    error={err("years")}
                    ayuda={sugerido ? `Con ${f.years} años te sugerimos el perfil ${sugerido === "veterano" ? "con experiencia" : "en formación"}.` : "Con 15 años o más te sugerimos el perfil con experiencia."}
                  >
                    <input
                      id="years"
                      type="number"
                      min={0}
                      max={60}
                      inputMode="numeric"
                      className="input"
                      placeholder="22"
                      value={f.years}
                      onChange={(e) => {
                        set("years", e.target.value);
                        if (e.target.value !== "") set("role", roleFromYears(Number(e.target.value)));
                      }}
                    />
                  </Campo>
                  <Campo id="status" label="Situación actual" req error={err("status")}>
                    <select id="status" className="input" value={f.status} onChange={(e) => set("status", e.target.value)}>
                      <option value="">Elige una opción</option>
                      {SITUACIONES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Campo>
                </div>
                <Chips label="Nivel que enseñas" error={err("levels")}>
                  {NIVELES.map(([v, t]) => (
                    <Chip key={v} checked={f.levels.includes(v)} onChange={() => set("levels", alternar(f.levels, v))}>
                      {t}
                    </Chip>
                  ))}
                </Chips>
                <Chips label="Área o especialidad" error={err("areas")}>
                  {AREAS.map((a) => (
                    <Chip key={a} checked={f.areas.includes(a)} onChange={() => set("areas", alternar(f.areas, a))}>
                      {a}
                    </Chip>
                  ))}
                </Chips>
                <Campo id="training_institution" label="Institución donde te formaste" opcional>
                  <input id="training_institution" className="input" placeholder="Instituto pedagógico o universidad" value={f.training_institution} onChange={(e) => set("training_institution", e.target.value)} />
                </Campo>
              </div>
            )}

            {paso === 2 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="school_name" label="Colegio donde trabajas" req full error={err("school_name")} ayuda="Si estudias o estás jubilado, escribe tu último colegio o tu instituto.">
                  <input id="school_name" className="input" placeholder="I.E. N.° 7059 José Carlos Mariátegui" value={f.school_name} onChange={(e) => set("school_name", e.target.value)} />
                </Campo>
                <Campo id="school_code" label="Código modular" opcional ayuda="Ayuda a ubicar tu colegio en el padrón del Minedu.">
                  <input id="school_code" inputMode="numeric" className="input" placeholder="0123456" value={f.school_code} onChange={(e) => set("school_code", e.target.value)} />
                </Campo>
                <Campo id="school_type" label="Tipo de gestión" req error={err("school_type")}>
                  <select id="school_type" className="input" value={f.school_type} onChange={(e) => set("school_type", e.target.value)}>
                    <option value="">Elige una opción</option>
                    {GESTIONES.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </Campo>
                <Campo id="region" label="Región" req error={err("region")}>
                  <select id="region" className="input" value={f.region} onChange={(e) => set("region", e.target.value)}>
                    <option value="">Elige tu región</option>
                    {REGIONES.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </Campo>
                <Campo id="ugel" label="UGEL" opcional>
                  <input id="ugel" className="input" placeholder="UGEL 01 San Juan de Miraflores" value={f.ugel} onChange={(e) => set("ugel", e.target.value)} />
                </Campo>
                <div className="sm:col-span-2">
                  <Chips label="Zona del colegio">
                    {(["urbana", "rural"] as const).map((z) => (
                      <Chip key={z} radio checked={f.zone === z} onChange={() => set("zone", z)}>
                        {z === "urbana" ? "Urbana" : "Rural"}
                      </Chip>
                    ))}
                  </Chips>
                </div>
              </div>
            )}

            {paso === 3 && (
              <div className="grid gap-4">
                <Campo id="public_alias" label="Alias público" req error={err("public_alias")} ayuda="Así aparecerás en los casos y en la biblioteca. Tu nombre completo no se muestra.">
                  <input id="public_alias" className="input" placeholder="Profe María, Matemática, Lima" value={f.public_alias} onChange={(e) => set("public_alias", e.target.value)} />
                </Campo>
                <Check checked={f.accepts_terms} onChange={(v) => set("accepts_terms", v)}>
                  Acepto los términos de uso y la política de privacidad, conforme a la Ley N.° 29733 de Protección de Datos Personales. <span className="text-ember">*</span>
                </Check>
                <Check checked={f.consents_cases} onChange={(v) => set("consents_cases", v)}>
                  Si comparto casos, acepto que se usen con mi alias para formar a otros docentes. Puedo retirarlos cuando quiera.
                </Check>
                <Check checked={f.wants_news} onChange={(v) => set("wants_news", v)}>
                  Quiero recibir novedades y recordatorios de práctica. <span className="text-muted">(opcional)</span>
                </Check>
                <p className="text-sm text-muted">Nunca subas nombres reales de alumnos en tus casos.</p>
                {err("accepts_terms") && <p className="text-sm font-semibold text-ember">{err("accepts_terms")}</p>}
              </div>
            )}

            {error && <div className="rounded-xl border border-ember bg-ember-soft p-3 text-sm text-bad">{error}</div>}

            <div className="flex flex-wrap items-center justify-between gap-3">
              {paso > 0 ? (
                <button type="button" className="btn" onClick={() => setPaso(paso - 1)}>
                  ← Atrás
                </button>
              ) : (
                <span className="text-sm text-muted">
                  Los campos con <span className="text-ember">*</span> son obligatorios.
                </span>
              )}
              <button type="submit" className="btn btn-primary" disabled={enviando}>
                {enviando ? "Creando cuenta…" : paso === PASOS.length - 1 ? "Crear mi cuenta" : "Continuar"}
              </button>
            </div>
          </>
        )}

        <p className="text-center text-sm text-muted">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-bold text-ember underline underline-offset-4">
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  );
}

function Campo({
  id,
  label,
  req,
  opcional,
  full,
  error,
  ayuda,
  children,
}: {
  id: string;
  label: string;
  req?: boolean;
  opcional?: boolean;
  full?: boolean;
  error?: string | null;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`grid content-start gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <label htmlFor={id} className="font-semibold">
        {label} {req && <span className="text-ember">*</span>}
        {opcional && <span className="text-sm font-normal text-muted">(opcional)</span>}
      </label>
      {children}
      {ayuda && <small className="text-[13px] text-muted">{ayuda}</small>}
      {error && <span className="text-[13px] font-semibold text-ember">{error}</span>}
    </div>
  );
}

function Chips({ label, error, children }: { label: string; error?: string | null; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 font-semibold">
        {label} <span className="text-ember">*</span>
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
      {error && <span className="text-[13px] font-semibold text-ember">{error}</span>}
    </fieldset>
  );
}

function Chip({
  checked,
  radio,
  onChange,
  children,
}: {
  checked: boolean;
  radio?: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[15px] transition ${checked ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
      <input type={radio ? "radio" : "checkbox"} className="accent-ember" checked={checked} onChange={onChange} />
      {children}
    </label>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-2.5">
      <input type="checkbox" className="mt-1.5 accent-ember" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}
