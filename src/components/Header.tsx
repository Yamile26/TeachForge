"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const PASOS: { href: string; label: string; destino?: string; nuevo?: boolean }[] = [
  { href: "/capture", label: "Capturar" },
  { href: "/cases", label: "Casos" },
  // Sin caso elegido, el simulador abre el caso de ejemplo de ecuaciones.
  { href: "/simulate", label: "Simular", destino: "/simulate/seed-ecuaciones-signos" },
  { href: "/aprende", label: "Aprende", nuevo: true },
  { href: "/profile", label: "Mi perfil" },
];

export function Header({ demo }: { demo: boolean }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2 sm:px-6">
        <Link href="/" aria-label="TeachForge, inicio" className="shrink-0">
          <Image
            src="/brand/teachforge-logo-ilustrado.jpg"
            alt="TeachForge, empoderando a los maestros del Perú"
            width={1536}
            height={1024}
            priority
            className="h-[52px] w-auto"
          />
        </Link>
        <nav
          aria-label="Secciones de TeachForge"
          className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto [scrollbar-width:none] sm:justify-end"
        >
          {PASOS.map((p) => {
            const activo = pathname.startsWith(p.href);
            return (
              <Link
                key={p.href}
                href={p.destino ?? p.href}
                aria-current={activo ? "page" : undefined}
                className={`px-3 py-2 text-[15px] font-semibold whitespace-nowrap transition ${
                  activo ? "text-ember shadow-[inset_0_-2px_0_var(--ember)]" : "rounded-[0.625rem] text-ink hover:bg-sunk"
                }`}
              >
                {p.label}
                {p.nuevo && (
                  <span className="ml-1 align-[2px] text-[10px] font-bold tracking-[0.08em] text-ia uppercase">Beta</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          {demo && (
            <span
              className="chip bg-warn-soft text-warn"
              title="Sin OPENAI_API_KEY o con DEMO_MODE=true: las respuestas vienen de /fixtures"
            >
              Modo demo
            </span>
          )}
          <Link href="/login" className="btn min-h-9 px-3 py-1.5 text-sm">
            Ingresar
          </Link>
          <Link href="/register" className="btn btn-primary min-h-9 px-3 py-1.5 text-sm">
            Crear cuenta
          </Link>
        </div>
      </div>
    </header>
  );
}
