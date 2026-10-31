import { notFound } from "next/navigation";
import { Simulator } from "@/components/Simulator";
import { obtenerCaso } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SimulatePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const caso = await obtenerCaso(caseId);
  if (!caso) notFound();

  return <Simulator caso={caso} />;
}
