import Image from "next/image";
import Link from "next/link";

const ENLACES = [
  { href: "/", label: "Inicio" },
  { href: "/capture", label: "Capturar" },
  { href: "/cases", label: "Casos" },
  { href: "/simulate/seed-ecuaciones-signos", label: "Simular" },
  { href: "/aprende", label: "Aprende" },
  { href: "/profile", label: "Mi perfil" },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
        <div className="grid gap-3">
          <Image
            src="/brand/teachforge-logo-ilustrado.jpg"
            alt="TeachForge"
            width={1536}
            height={1024}
            className="h-[70px] w-auto"
          />
          <nav aria-label="Pie de página" className="flex flex-wrap gap-x-5 gap-y-1 font-semibold">
            {ENLACES.map((e) => (
              <Link key={e.href} href={e.href} className="hover:text-ember">
                {e.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="motto">#ElCriterioNoSeJubila</p>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-4 text-sm text-muted sm:px-6">
          TeachForge · DSC HACK 2026 · Grieta 03: docentes sin relevo. Los casos marcados «Ejemplo»
          son ficticios; los puntajes de la simulación son indicativos.
        </p>
      </div>
    </footer>
  );
}
