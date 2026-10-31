import type { Metadata } from "next";
import { IBM_Plex_Mono, Lora, Outfit } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { demoActivo } from "@/lib/demo";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  style: ["italic"],
  weight: ["600", "700"],
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
        className={`${outfit.variable} ${lora.variable} ${plexMono.variable} font-sans text-[16px] leading-relaxed antialiased`}
      >
        <Header demo={demoActivo()} />
        <main className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
