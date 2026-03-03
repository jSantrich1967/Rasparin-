import { prisma } from "@/lib/prisma";
import { PageSection } from "../PageSection";
import { PaymentForm } from "./PaymentForm";
import { PaymentRow } from "./PaymentRow";
import { deletePayment, submitAllocations } from "./actions";

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
    <PageSection title="Pagos" description="Pagos en VES a la tarjeta. Haz clic en «Asignar a deudas» en cada pago para elegir qué operación pagar.">
      <div className="rounded-2xl stitch-glass p-4 sm:p-5 shadow-sm mb-6">
        <PaymentForm cards={cards} />
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
