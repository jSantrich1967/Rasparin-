import { prisma } from "@/lib/prisma";
import { PageSection } from "../PageSection";
import { PaymentForm } from "./PaymentForm";
import { PaymentRow } from "./PaymentRow";

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
    <PageSection title="Pagos" description="Pagos en VES a la tarjeta. Primero crea operaciones (deudas) en Operaciones; luego, en cada pago, haz clic en «Asignar a deudas» para elegir qué operación pagar.">
      <div className="rounded-2xl stitch-glass p-4 sm:p-5 shadow-sm mb-6">
        <PaymentForm cards={cards} />
      </div>
      {payments.length === 0 ? (
        <div className="rounded-2xl stitch-glass p-8 text-center">
          <p className="text-slate-400 mb-2">No hay pagos registrados.</p>
          <p className="text-sm text-slate-500">
            Añade un pago con el formulario de arriba. Después de guardarlo, aparecerá aquí con el botón <strong className="text-electric-blue">«Asignar a deudas»</strong> para elegir qué operación pagar.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-white/10 rounded-2xl stitch-glass shadow-sm overflow-hidden">
          {payments.map((p) => (
          <PaymentRow
            key={p.id}
            payment={p}
            operationsOfCard={operationsByCard.get(p.cardId) ?? []}
            defaultExpanded={expandPaymentId === p.id}
          />
          ))}
        </ul>
      )}
    </PageSection>
  );
}
