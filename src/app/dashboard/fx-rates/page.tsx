import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { FXRateForm } from "./FXRateForm";
import { formatVES } from "@/lib/money";

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

export default async function FXRatesPage() {
  const rates = await prisma.fXRate.findMany({ orderBy: { date: "desc" }, take: 100 });
  return (
    <section className="p-6">
      <h2 className="text-2xl font-bold mb-4">Tasas BCV</h2>
      <p className="text-sm text-slate-600 mb-4">
        Carga la tasa BCV (VES por 1 USD) por fecha. Se usa para deuda en VES y ganancia no realizada.
      </p>
      <FXRateForm createAction={createFXRate} />
      <ul className="mt-6 space-y-2">
        {rates.map((r) => (
          <li key={r.id} className="flex justify-between items-center py-2 border-b border-slate-200">
            <span className="font-mono">{new Date(r.date).toISOString().slice(0, 10)}</span>
            <span>{formatVES(r.bcvRate.toString())} VES/USD</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm">
        <Link href="/dashboard" className="text-slate-600 hover:underline">← Volver al Resumen</Link>
      </p>
    </section>
  );
}
