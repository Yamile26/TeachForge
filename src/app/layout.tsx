import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Lexend } from "next/font/google";
import { Header } from "@/components/Header";
import { demoActivo } from "@/lib/demo";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "TeachForge · el criterio pedagógico no se jubila",
  description:
    "Capturamos la experiencia de docentes veteranos y la convertimos en simulaciones de aula para entrenar a docentes en formación.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${bricolage.variable} ${lexend.variable} ${plexMono.variable} font-sans text-[15px] leading-relaxed antialiased`}
      >
        <Header demo={demoActivo()} />
        <main className="mx-auto max-w-5xl px-4 pt-8 pb-16 sm:px-6">{children}</main>
        <footer className="border-t border-line">
          <p className="mx-auto max-w-5xl px-4 py-6 text-sm text-muted sm:px-6">
            TeachForge · DSC HACK 2026 · Grieta 03: docentes sin relevo. Los casos marcados
            «Ejemplo» son ficticios; los puntajes de la simulación son indicativos.
          </p>
        </footer>
      </body>
    </html>
  );
}
