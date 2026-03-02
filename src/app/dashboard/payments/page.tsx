import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { PageSection } from "../PageSection";
import { PaymentForm } from "./PaymentForm";
import { PaymentRow } from "./PaymentRow";
import { applyAllocations } from "@/lib/reconciliation";
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
    revalidatePath("/stitch");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg || "Error al guardar. Verifica la conexión a la base de datos." };
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

async function submitAllocations(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  "use server";
  const paymentId = formData.get("paymentId") as string;
  if (!paymentId) return { ok: false, message: "Falta paymentId" };
  const marketRateStr = formData.get("marketRate") as string;
  const marketRate = marketRateStr ? parseFloat(marketRateStr) : NaN;
  if (!Number.isFinite(marketRate) || marketRate <= 0) {
    return { ok: false, message: "Ingresa la tasa de mercado (paralela) para calcular la ganancia" };
  }
  const items: { operationId: string; amountVESApplied: string }[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("op_") && value && typeof value === "string") {
      const operationId = key.slice(3);
      const amount = parseFloat(value);
      if (!Number.isNaN(amount) && amount > 0) items.push({ operationId, amountVESApplied: value });
    }
  }
  const result = await applyAllocations({ paymentId, items, marketRate });
  if (result.ok) {
    revalidatePath("/dashboard/payments");
    revalidatePath("/dashboard/reconciliation");
    revalidatePath("/dashboard");
    revalidatePath("/stitch");
  }
  return result;
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const params = await searchParams;
  const expandPaymentId = params.payment ?? null;
  const payments = await prisma.payment.findMany({
    include: { card: { include: { bank: true } }, allocations: true },
    orderBy: { date: "desc" },
    take: 200,
  });
  const cardIds = [...new Set(payments.map((p) => p.cardId))];
  const [cards, operations] = await Promise.all([
    prisma.card.findMany({ include: { bank: true }, orderBy: { alias: "asc" } }),
    cardIds.length > 0
      ? prisma.operation.findMany({
          where: { cardId: { in: cardIds }, status: { in: ["OPEN", "SETTLED"] } },
          include: { counterparty: true, allocations: true },
          orderBy: { date: "asc" },
        })
      : [],
  ]);

  const operationsByCard = new Map<string, typeof operations>();
  for (const op of operations) {
    const list = operationsByCard.get(op.cardId) ?? [];
    list.push(op);
    operationsByCard.set(op.cardId, list);
  }

  return (
    <PageSection title="Pagos" description="Pagos en VES a la tarjeta. Haz clic en Conciliar para asignar a operaciones.">
      <div className="rounded-2xl stitch-glass p-4 sm:p-5 shadow-sm mb-6">
        <PaymentForm createAction={createPayment} cards={cards} />
      </div>
      <ul className="divide-y divide-white/10 rounded-2xl stitch-glass shadow-sm overflow-hidden">
        {payments.map((p) => (
          <PaymentRow
            key={p.id}
            payment={p}
            operationsOfCard={operationsByCard.get(p.cardId) ?? []}
            deleteAction={deletePayment}
            submitAllocations={submitAllocations}
            defaultExpanded={expandPaymentId === p.id}
          />
        ))}
      </ul>
    </PageSection>
  );
}
