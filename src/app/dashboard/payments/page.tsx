import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { PageSection } from "../PageSection";
import { PaymentForm } from "./PaymentForm";
import { PaymentRow } from "./PaymentRow";
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

async function deletePayment(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  "use server";
  if (!id) return { ok: false, message: "ID requerido" };
  try {
    await prisma.payment.delete({ where: { id } });
    revalidatePath("/dashboard/payments");
    revalidatePath("/dashboard/reconciliation");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Error al eliminar" };
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
    <PageSection title="Pagos" description="Pagos en VES a la tarjeta. Luego concilia en la pestaña Conciliación.">
      <div className="rounded-2xl stitch-glass p-4 sm:p-5 shadow-sm mb-6">
        <PaymentForm createAction={createPayment} cards={cards} />
      </div>
      <ul className="divide-y divide-white/10 rounded-2xl stitch-glass shadow-sm overflow-hidden">
        {payments.map((p) => (
          <PaymentRow key={p.id} payment={p} deleteAction={deletePayment} />
        ))}
      </ul>
    </PageSection>
  );
}
