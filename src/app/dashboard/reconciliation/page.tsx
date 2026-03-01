import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ReconciliationPanel } from "./ReconciliationPanel";
import { applyAllocations } from "@/lib/reconciliation";
import { revalidatePath } from "next/cache";

async function submitAllocations(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  "use server";
  const paymentId = formData.get("paymentId") as string;
  if (!paymentId) return { ok: false, message: "Falta paymentId" };
  const items: { operationId: string; amountVESApplied: string }[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("op_") && value && typeof value === "string") {
      const operationId = key.slice(3);
      const amount = parseFloat(value);
      if (!Number.isNaN(amount) && amount > 0) items.push({ operationId, amountVESApplied: value });
    }
  }
  const result = await applyAllocations({ paymentId, items });
  if (result.ok) {
    revalidatePath("/dashboard/reconciliation");
    revalidatePath(`/dashboard/reconciliation?payment=${paymentId}`);
    revalidatePath("/dashboard/payments");
    revalidatePath("/dashboard");
  }
  return result;
}

export default async function ReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const params = await searchParams;
  const paymentId = params.payment ?? null;

  const [payments, paymentDetail, cards] = await Promise.all([
    prisma.payment.findMany({
      include: { card: { include: { bank: true } } },
      orderBy: { date: "desc" },
      take: 100,
    }),
    paymentId
      ? prisma.payment.findUnique({
          where: { id: paymentId },
          include: {
            card: { include: { bank: true } },
            allocations: { include: { operation: { include: { counterparty: true } } } },
          },
        })
      : null,
    prisma.card.findMany({ include: { bank: true }, orderBy: { alias: "asc" } }),
  ]);

  // For selected payment: get OPEN/SETTLED operations of same card to show allocation inputs
  const operationsOfCard = paymentDetail
    ? await prisma.operation.findMany({
        where: { cardId: paymentDetail.cardId, status: { in: ["OPEN", "SETTLED"] } },
        include: { counterparty: true, allocations: true },
        orderBy: { date: "asc" },
      })
    : [];

  return (
    <section className="p-6">
      <h2 className="text-2xl font-bold mb-4">Conciliación</h2>
      <p className="text-sm text-slate-600 mb-4">
        Elige un pago y asigna montos en VES a operaciones de la misma tarjeta. No puedes superar el monto del pago ni la deuda pendiente de cada operación.
      </p>
      <ReconciliationPanel
        payments={payments}
        paymentDetail={paymentDetail}
        operationsOfCard={operationsOfCard}
        submitAllocations={submitAllocations}
      />
      <p className="mt-4 text-sm">
        <Link href="/dashboard" className="text-slate-600 hover:underline">← Volver al Resumen</Link>
      </p>
    </section>
  );
}
