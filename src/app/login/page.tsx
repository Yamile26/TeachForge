"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
    <div className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.3fr]">
      <aside className="hex-band grid gap-4 rounded-2xl bg-ink p-6 text-white">
        <Image
          src="/brand/teachforge-logo-ilustrado.jpg"
          alt="TeachForge, empoderando a los maestros del Perú"
          width={1536}
          height={1024}
          className="h-auto w-full rounded-xl bg-white"
        />
        <h2 className="text-[clamp(1.5rem,2.6vw,2rem)] font-extrabold text-white">Bienvenido de vuelta</h2>
        <p className="text-[#c9cce0]">Entra para seguir con tus prácticas o revisar cómo van tus casos.</p>
        <ul className="grid gap-3 text-[15px] text-[#e4e6f2]">
          <li>
            <b className="text-white">Veteranos:</b> tus casos y cuántos docentes practicaron con ellos.
          </li>
          <li>
            <b className="text-white">Docentes en formación:</b> tu perfil por competencia y tu siguiente práctica.
          </li>
        </ul>
      </aside>

      <form onSubmit={handleSubmit} className="card grid gap-4">
        <div>
          <span className="eyebrow">Ingresar</span>
          <h1 className="mt-3 text-[clamp(1.8rem,3vw,2.4rem)] font-extrabold">Inicia sesión en TeachForge</h1>
        </div>

        <label className="grid gap-1.5 font-semibold">
          Correo electrónico
          <input
            className="input font-normal"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="maria.quispe@colegio.edu.pe"
            required
          />
        </label>

        <label className="grid gap-1.5 font-semibold">
          Contraseña
          <input
            className="input font-normal"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Tu contraseña"
            required
          />
        </label>

        {error ? (
          <div className="rounded-xl border border-ember bg-ember-soft p-3 text-sm text-bad">{error}</div>
        ) : null}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Entrando…" : "Ingresar"}
        </button>

        <p className="flex items-center gap-3 text-sm text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
          ¿Aún no tienes cuenta?
        </p>
        <Link href="/register" className="btn">
          Crear cuenta de docente
        </Link>
      </form>
    </div>
  );
}
