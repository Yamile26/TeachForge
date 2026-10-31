import Link from "next/link";

export function Placeholder({
  titulo,
  descripcion,
  contrato,
  children,
}: {
  titulo: string;
  descripcion: string;
  contrato: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← TeachForge
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{titulo}</h1>
      <p className="mt-3 text-neutral-600 dark:text-neutral-300">{descripcion}</p>
      <div className="mt-6 rounded-xl border border-dashed border-neutral-300 p-5 text-sm dark:border-neutral-700">
        <p className="font-medium">Contrato de datos</p>
        <p className="mt-1 font-mono text-xs text-neutral-500">{contrato}</p>
      </div>
      {children}
    </main>
  );
}
