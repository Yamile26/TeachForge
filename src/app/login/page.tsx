"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Falta NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setLoading(false);
      return;
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message || "No se pudo iniciar sesión.");
      return;
    }

    if (!data.user) {
      setError("No se encontró la sesión del usuario.");
      return;
    }

    router.push("/cases");
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <div className="card">
        <p className="eyebrow">Ingresar</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Inicia sesión en TeachForge</h1>
        <p className="mt-2 text-muted">Usa tu correo institucional para acceder a tu perfil.</p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-ink">
            Correo institucional
            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
              placeholder="••••••••"
              required
            />
          </label>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          <button type="submit" className="btn btn-primary justify-self-start" disabled={loading}>
            {loading ? "Entrando..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </main>
  );
}
