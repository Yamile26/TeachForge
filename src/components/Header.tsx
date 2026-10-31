"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";

const PASOS: { href: string; label: string; destino?: string }[] = [
  { href: "/capture", label: "Capturar" },
  { href: "/cases", label: "Biblioteca" },
  // Sin caso elegido, el simulador abre el caso de ejemplo de ecuaciones.
  { href: "/simulate", label: "Simular", destino: "/simulate/seed-ecuaciones-signos" },
  { href: "/profile", label: "Perfil" },
  { href: "/aprende", label: "Aprende" },
];

export function Header({ demo }: { demo: boolean }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 sm:px-6">
        <Link href="/" aria-label="TeachForge, inicio">
          <Logo />
        </Link>
        <nav
          aria-label="Ciclo de TeachForge"
          className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]"
        >
          {PASOS.map((p, i) => {
            const activo = pathname.startsWith(p.href);
            return (
              <Link
                key={p.href}
                href={p.destino ?? p.href}
                aria-current={activo ? "page" : undefined}
                className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm whitespace-nowrap transition ${
                  activo ? "bg-steel text-steel-ink" : "text-muted hover:bg-sunk hover:text-ink"
                }`}
              >
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full font-mono text-[11px] ${
                    activo ? "bg-ember text-ember-ink" : "border border-line"
                  }`}
                >
                  {i + 1}
                </span>
                {p.label}
              </Link>
            );
          })}
        </nav>
        {demo && (
          <span
            className="chip bg-warn-soft text-warn"
            title="Sin OPENAI_API_KEY o con DEMO_MODE=true: las respuestas vienen de /fixtures"
          >
            Modo demo
          </span>
        )}
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn px-3 py-1.5 text-sm">
            Ingresar
          </Link>
          <Link href="/register" className="btn btn-primary px-3 py-1.5 text-sm">
            Crear cuenta
          </Link>
        </div>
      </div>
    </header>
  );
}
