import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { FXRateForm } from "./FXRateForm";
import { FXRateRow } from "./FXRateRow";
import { PageSection } from "../PageSection";

// Server action: create FX rate (date normalized to 00:00:00Z)
async function createFXRate(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  "use server";
  const dateStr = formData.get("date") as string;
  const bcvStr = formData.get("bcvRate") as string;
  if (!dateStr || !bcvStr) return { ok: false, message: "Fecha y tasa son obligatorios" };
  const date = new Date(dateStr);
  date.setUTCHours(0, 0, 0, 0);
  const bcv = parseFloat(bcvStr);
  if (Number.isNaN(bcv) || bcv <= 0) return { ok: false, message: "Tasa BCV debe ser un número positivo" };
  try {
    await prisma.fXRate.upsert({
      where: { date },
      create: { date, bcvRate: bcv, source: "manual" },
      update: { bcvRate: bcv, source: "manual" },
    });
    revalidatePath("/dashboard/fx-rates");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Error al guardar" };
  }
}

async function deleteFXRate(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  "use server";
  if (!id) return { ok: false, message: "ID requerido" };
  try {
    await prisma.fXRate.delete({ where: { id } });
    revalidatePath("/dashboard/fx-rates");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Error al eliminar" };
  }
}

export default async function FXRatesPage() {
  const rates = await prisma.fXRate.findMany({ orderBy: { date: "desc" }, take: 100 });
  return (
    <PageSection title="Tasas BCV" description="Carga la tasa BCV (VES por 1 USD) por fecha. Se usa para deuda en VES y ganancia no realizada.">
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm mb-6">
        <FXRateForm createAction={createFXRate} />
      </div>
      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {rates.map((r) => (
          <FXRateRow key={r.id} rate={r} deleteAction={deleteFXRate} />
        ))}
      </ul>
    </PageSection>
  );
}
