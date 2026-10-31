"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("Esta vista es provisional; conecta Supabase para autenticación real.");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="card p-6">
        <p className="eyebrow">Acceso</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Iniciar sesión</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-ink">
              Correo institucional
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-base text-ink"
              placeholder="docente@upn.edu.pe"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-ink">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-base text-ink"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="w-full rounded-xl bg-ember px-4 py-2.5 font-semibold text-white">
            Entrar
          </button>
        </form>

        {message ? <p className="mt-4 text-sm text-muted">{message}</p> : null}
      </div>
    </main>
  );
}
