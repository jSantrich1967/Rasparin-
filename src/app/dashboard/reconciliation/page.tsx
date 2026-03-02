import { prisma } from "@/lib/prisma";
import { ReconciliationPanel } from "./ReconciliationPanel";
import { PageSection } from "../PageSection";
import { submitAllocations } from "../payments/actions";

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
    <PageSection
      title="Conciliación"
      description="Elige un pago y asigna montos en VES a operaciones. También puedes conciliar desde la página de Pagos (clic en Conciliar en cada pago)."
    >
      <div className="rounded-2xl stitch-glass p-4 sm:p-6 shadow-sm">
        <ReconciliationPanel
          payments={payments}
          paymentDetail={paymentDetail}
          operationsOfCard={operationsOfCard}
          submitAllocations={submitAllocations}
        />
      </div>
    </PageSection>
  );
}
