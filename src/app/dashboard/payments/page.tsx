import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { PaymentForm } from "./PaymentForm";
import { formatVES } from "@/lib/money";

async function createPayment(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  "use server";
  const dateStr = formData.get("date") as string;
  const cardId = formData.get("cardId") as string;
  const amountVES = formData.get("amountVES") as string;
  const bcvRateOnPayment = formData.get("bcvRateOnPayment") as string;
  const notes = (formData.get("notes") as string)?.trim() || null;
  if (!dateStr || !cardId || !amountVES || !bcvRateOnPayment) {
    return { ok: false, message: "Fecha, tarjeta, monto VES y tasa BCV son obligatorios" };
  }
  const amount = parseFloat(amountVES);
  const bcv = parseFloat(bcvRateOnPayment);
  if (Number.isNaN(amount) || amount <= 0 || Number.isNaN(bcv) || bcv <= 0) {
    return { ok: false, message: "Monto y tasa deben ser positivos" };
  }
  try {
    await prisma.payment.create({
      data: {
        date: new Date(dateStr),
        cardId,
        amountVES: amount,
        bcvRateOnPayment: bcv,
        notes,
      },
    });
    revalidatePath("/dashboard/payments");
    revalidatePath("/dashboard/reconciliation");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Error al guardar" };
  }
}

export default async function PaymentsPage() {
  const [payments, cards] = await Promise.all([
    prisma.payment.findMany({
      include: { card: { include: { bank: true } }, allocations: true },
      orderBy: { date: "desc" },
      take: 200,
    }),
    prisma.card.findMany({ include: { bank: true }, orderBy: { alias: "asc" } }),
  ]);

  return (
    <section className="p-6">
      <h2 className="text-2xl font-bold mb-4">Pagos</h2>
      <p className="text-sm text-slate-600 mb-4">Pagos en VES a la tarjeta. Luego concilia en la pestaña Conciliación.</p>
      <PaymentForm createAction={createPayment} cards={cards} />
      <ul className="mt-6 space-y-2">
        {payments.map((p) => {
          const allocated = p.allocations.reduce((acc, a) => acc + Number(a.amountVESApplied), 0);
          const remaining = Number(p.amountVES) - allocated;
          return (
            <li key={p.id} className="flex flex-wrap justify-between items-center py-2 border-b border-slate-200 text-sm">
              <span className="font-mono">{new Date(p.date).toISOString().slice(0, 10)}</span>
              <span>{p.card.alias} ({p.card.bank?.name})</span>
              <span>{formatVES(p.amountVES.toString())} VES</span>
              <span className="text-slate-500">Asignado: {formatVES(allocated)}</span>
              <span className={remaining > 0 ? "text-amber-600" : "text-green-600"}>Restante: {formatVES(remaining)}</span>
              <Link href={`/dashboard/reconciliation?payment=${p.id}`} className="text-slate-600 hover:underline">Conciliar</Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-sm">
        <Link href="/dashboard" className="text-slate-600 hover:underline">← Volver al Resumen</Link>
      </p>
    </section>
  );
}
