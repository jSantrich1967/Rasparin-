import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { FXRateForm } from "./FXRateForm";
import { FXRateRow } from "./FXRateRow";
import { PageSection } from "../PageSection";

// Server action: create FX rate (permite múltiples tasas por día)
async function createFXRate(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  "use server";
  const datetimeStr = formData.get("effectiveAt") as string;
  const bcvStr = formData.get("bcvRate") as string;
  const marketStr = (formData.get("marketRate") as string)?.trim();
  if (!datetimeStr || !bcvStr) return { ok: false, message: "Fecha/hora y tasa BCV son obligatorios" };
  const effectiveAt = new Date(datetimeStr);
  if (Number.isNaN(effectiveAt.getTime())) return { ok: false, message: "Fecha/hora inválida" };
  const bcv = parseFloat(bcvStr);
  if (Number.isNaN(bcv) || bcv <= 0) return { ok: false, message: "Tasa BCV debe ser un número positivo" };
  const market = marketStr ? parseFloat(marketStr) : null;
  if (market !== null && (Number.isNaN(market) || market <= 0)) return { ok: false, message: "Tasa de mercado debe ser un número positivo" };
  try {
    await prisma.fXRate.create({
      data: { effectiveAt, bcvRate: bcv, marketRate: market ?? undefined, source: "manual" },
    });
    revalidatePath("/dashboard/fx-rates");
    revalidatePath("/dashboard");
    revalidatePath("/stitch");
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
    revalidatePath("/stitch");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Error al eliminar" };
  }
}

export default async function FXRatesPage() {
  const rates = await prisma.fXRate.findMany({ take: 200 });
  rates.sort((a, b) => {
    const am = (a.effectiveAt ?? a.date)?.getTime() ?? 0;
    const bm = (b.effectiveAt ?? b.date)?.getTime() ?? 0;
    return bm - am;
  });
  return (
    <PageSection title="Tasas BCV y Mercado" description="Carga la tasa BCV (oficial) y opcionalmente la tasa de mercado (paralela) por fecha. La tasa de mercado se usa para calcular la ganancia realizada.">
      <div className="rounded-2xl stitch-glass p-4 sm:p-5 shadow-sm mb-6">
        <FXRateForm createAction={createFXRate} />
      </div>
      <ul className="divide-y divide-white/10 rounded-2xl stitch-glass shadow-sm overflow-hidden">
        {rates.map((r) => (
          <FXRateRow key={r.id} rate={r} deleteAction={deleteFXRate} />
        ))}
      </ul>
    </PageSection>
  );
}
