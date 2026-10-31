"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { roleFromYears, validateInstitutionalEmail } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [yearsExperience, setYearsExperience] = useState(5);
  const [institutionEmail, setInstitutionEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    const normalizedEmail = (institutionEmail || email).trim().toLowerCase();
    if (!validateInstitutionalEmail(normalizedEmail)) {
      setError("Debes usar un correo institucional válido (por ejemplo: minedu.gob.pe, unprg.edu.pe).");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        years_experience: Number(yearsExperience),
        institution_email: normalizedEmail,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(payload?.error ?? "No se pudo crear la cuenta.");
      return;
    }

    const role = roleFromYears(Number(yearsExperience));
    setMessage(
      `Cuenta creada como ${role}. Revisa tu correo institucional para confirmar la cuenta y luego inicia sesión.`,
    );

    setTimeout(() => {
      router.push("/login");
    }, 1200);
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <div className="card">
        <p className="eyebrow">Registro</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Crea tu cuenta en TeachForge</h1>
        <p className="mt-2 text-muted">
          El rol se calcula automáticamente según tus años de experiencia: veterano si son 15 o más, novato si son 15 o menos.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-ink">
            Correo personal
            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tuemail@gmail.com"
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-ink">
            Correo institucional
            <input
              className="input"
              type="email"
              value={institutionEmail}
              onChange={(event) => setInstitutionEmail(event.target.value)}
              placeholder="docente@minedu.gob.pe"
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-ink">
            Contraseña
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-ink">
            Años de experiencia docente
            <input
              className="input"
              type="number"
              min={0}
              max={60}
              value={yearsExperience}
              onChange={(event) => setYearsExperience(Number(event.target.value || 0))}
              required
            />
          </label>

          <div className="rounded-lg border border-line bg-sunk p-3 text-sm text-muted">
            Tu rol será: <b>{roleFromYears(yearsExperience)}</b>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="rounded-lg border border-good-soft bg-good-soft p-3 text-sm text-good">
              {message}
            </div>
          ) : null}

          <button type="submit" className="btn btn-primary justify-self-start" disabled={loading}>
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>
      </div>
    </main>
  );
}
