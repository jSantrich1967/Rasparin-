import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { PageSection } from "../PageSection";
import { CardForm } from "./CardForm";
import { CardRow } from "./CardRow";
import { calcDebtVES, calcUsedAndAvailable } from "@/lib/calc";
import { d, round2 } from "@/lib/money";

export const dynamic = "force-dynamic";

async function createCard(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  "use server";
  const alias = (formData.get("alias") as string)?.trim();
  const bankId = formData.get("bankId") as string;
  const creditLimitVES = formData.get("creditLimitVES") as string;
  const openingBalanceVES = formData.get("openingBalanceVES") as string;
  if (!alias || !bankId) return { ok: false, message: "Alias y banco son obligatorios" };
  const limit = creditLimitVES ? parseFloat(creditLimitVES) : 0;
  const opening = openingBalanceVES ? parseFloat(openingBalanceVES) : 0;
  if (Number.isNaN(limit) || Number.isNaN(opening)) return { ok: false, message: "Límite y saldo deben ser números" };
  try {
    await prisma.card.create({
      data: {
        alias,
        bankId,
        creditLimitVES: limit,
        openingBalanceVES: opening,
      },
    });
    revalidatePath("/dashboard/cards");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Error al crear" };
  }
}

async function updateCard(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  "use server";
  const id = formData.get("id") as string;
  const alias = (formData.get("alias") as string)?.trim();
  const creditLimitVES = formData.get("creditLimitVES") as string;
  const openingBalanceVES = formData.get("openingBalanceVES") as string;
  const status = formData.get("status") as string;
  if (!id || !alias) return { ok: false, message: "ID y alias requeridos" };
  const limit = parseFloat(String(creditLimitVES || "0"));
  const opening = parseFloat(String(openingBalanceVES || "0"));
  if (Number.isNaN(limit) || Number.isNaN(opening)) return { ok: false, message: "Límite y saldo deben ser números" };
  const validStatus = status === "ACTIVE" || status === "INACTIVE" ? status : "ACTIVE";
  try {
    await prisma.card.update({
      where: { id },
      data: { alias, creditLimitVES: limit, openingBalanceVES: opening, status: validStatus },
    });
    revalidatePath("/dashboard/cards");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/operations");
    revalidatePath("/dashboard/payments");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Error al actualizar" };
  }
}

async function deleteCard(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  "use server";
  if (!id) return { ok: false, message: "ID requerido" };
  try {
    await prisma.card.delete({ where: { id } });
    revalidatePath("/dashboard/cards");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "No se puede eliminar (¿tiene operaciones o pagos?)" };
  }
}

export default async function CardsPage() {
  const [cards, operations, payments] = await Promise.all([
    prisma.card.findMany({
      include: { bank: true },
      orderBy: { alias: "asc" },
    }),
    prisma.operation.findMany({
      where: { status: { not: "CANCELLED" } },
      include: { allocations: true },
    }),
    prisma.payment.findMany(),
  ]);

  const banks = await prisma.bank.findMany({ orderBy: { name: "asc" } });

  // Por tarjeta: deuda de operaciones, pagos, usado, disponible
  const cardBalances = new Map<
    string,
    { totalDebtVES: number; totalPaymentsVES: number; usedVES: number; availableVES: number }
  >();
  for (const c of cards) {
    const opsOfCard = operations.filter((o) => o.cardId === c.id);
    const paysOfCard = payments.filter((p) => p.cardId === c.id);
    const totalDebtVES = round2(
      opsOfCard.reduce(
        (sum, op) =>
          sum.add(calcDebtVES({ usdCharged: op.usdCharged.toString(), bcvRateOnCharge: op.bcvRateOnCharge.toString() })),
        d(0)
      )
    ).toNumber();
    const totalPaymentsVES = round2(
      paysOfCard.reduce((sum, p) => sum.add(d(p.amountVES.toString())), d(0))
    ).toNumber();
    const { usedVES, availableVES } = calcUsedAndAvailable({
      creditLimitVES: c.creditLimitVES.toString(),
      openingBalanceVES: c.openingBalanceVES.toString(),
      totalDebtVES: String(totalDebtVES),
      totalPaymentsVES: String(totalPaymentsVES),
    });
    cardBalances.set(c.id, {
      totalDebtVES,
      totalPaymentsVES,
      usedVES: Number(usedVES),
      availableVES: Number(availableVES),
    });
  }

  return (
    <PageSection title="Tarjetas" description="Gestiona las tarjetas de crédito. El saldo se calcula: apertura + deuda operaciones − pagos.">
      <div className="rounded-2xl stitch-glass p-4 sm:p-5 shadow-sm mb-6">
        <CardForm createAction={createCard} banks={banks} />
      </div>
      <ul className="divide-y divide-white/10 rounded-2xl stitch-glass shadow-sm overflow-hidden">
        {cards.map((c) => {
          const bal = cardBalances.get(c.id)!;
          return (
            <CardRow
              key={c.id}
              card={{
                id: c.id,
                alias: c.alias,
                last4: c.last4,
                creditLimitVES: c.creditLimitVES.toString(),
                openingBalanceVES: c.openingBalanceVES.toString(),
                status: c.status,
                bankName: c.bank?.name ?? "",
              }}
              balance={{
                totalDebtVES: bal.totalDebtVES,
                totalPaymentsVES: bal.totalPaymentsVES,
                usedVES: bal.usedVES,
                availableVES: bal.availableVES,
              }}
              updateAction={updateCard}
              deleteAction={deleteCard}
            />
          );
        })}
      </ul>
    </PageSection>
  );
}
