import { prisma } from "@/lib/prisma";
import { d, round2 } from "@/lib/money";
import { calcDebtVES } from "@/lib/calc";

const SETTLE_TOLERANCE_VES = d(0.01);

export type AllocationInput = { operationId: string; amountVESApplied: string | number };

export async function applyAllocations(params: {
  paymentId: string;
  items: AllocationInput[];
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { paymentId } = params;

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { allocations: true },
  });
  if (!payment) return { ok: false, message: "Pago no encontrado" };

  // Collapse items by operationId and round to 2 decimals (VES rule)
  const itemsByOp = new Map<string, ReturnType<typeof round2>>();
  for (const it of params.items) {
    const amt = round2(it.amountVESApplied);
    if (amt.lte(0)) continue;
    itemsByOp.set(it.operationId, (itemsByOp.get(it.operationId) ?? d(0)).add(amt));
  }

  // Load operations and validate card match
  const operationIds = [...itemsByOp.keys()];
  const operations = await prisma.operation.findMany({
    where: { id: { in: operationIds } },
    include: {
      allocations: { include: { payment: true } },
    },
  });

  if (operations.length !== operationIds.length) {
    return { ok: false, message: "Algunas operaciones no se encontraron" };
  }

  for (const op of operations) {
    if (op.cardId !== payment.cardId) {
      return { ok: false, message: "El pago y la operación deben ser de la misma tarjeta" };
    }
    if (op.status === "CANCELLED") {
      return { ok: false, message: "No se puede asignar a una operación cancelada" };
    }
  }

  // Validate payment remaining
  const alreadyAllocated = payment.allocations.reduce((acc, a) => acc.add(d(a.amountVESApplied.toString())), d(0));
  const paymentAmount = d(payment.amountVES.toString());

  // NOTE: this action overwrites per (payment,operation) via upsert, but doesn't clear other allocations.
  // We'll compute delta against existing allocations for this payment only.
  const existingForPayment = new Map<string, ReturnType<typeof d>>();
  for (const a of payment.allocations) existingForPayment.set(a.operationId, d(a.amountVESApplied.toString()));

  let newTotalForPayment = d(0);
  for (const [opId, amt] of itemsByOp) {
    const prev = existingForPayment.get(opId) ?? d(0);
    newTotalForPayment = newTotalForPayment.add(amt);
  }

  const unchangedOtherAlloc = alreadyAllocated.sub(
    [...existingForPayment.entries()]
      .filter(([opId]) => !itemsByOp.has(opId))
      .reduce((acc, [, amt]) => acc.add(amt), d(0))
  );

  const finalAllocated = unchangedOtherAlloc.add(newTotalForPayment);
  if (finalAllocated.gt(paymentAmount.add(SETTLE_TOLERANCE_VES))) {
    return { ok: false, message: "El total asignado supera el monto del pago" };
  }

  // Validate operation remaining VES (debtVES computed from stored rate snapshot)
  for (const op of operations) {
    const debtVES = calcDebtVES({ usdCharged: op.usdCharged.toString(), bcvRateOnCharge: op.bcvRateOnCharge.toString() });
    const allocatedTotal = op.allocations.reduce((acc, a) => acc.add(d(a.amountVESApplied.toString())), d(0));
    const prevFromThisPayment = existingForPayment.get(op.id) ?? d(0);
    const nextFromThisPayment = itemsByOp.get(op.id) ?? d(0);
    const nextAllocatedTotal = allocatedTotal.sub(prevFromThisPayment).add(nextFromThisPayment);

    const remaining = round2(debtVES.sub(nextAllocatedTotal));
    if (remaining.lt(d(0).sub(SETTLE_TOLERANCE_VES))) {
      return { ok: false, message: "El monto asignado supera la deuda pendiente de una operación" };
    }
  }

  await prisma.$transaction(async (tx) => {
    // Upsert allocations for provided ops; if amount is 0, delete if exists
    for (const [operationId, amountVESApplied] of itemsByOp.entries()) {
      const amt = round2(amountVESApplied);
      if (amt.lte(0)) {
        await tx.allocation.deleteMany({ where: { paymentId, operationId } });
      } else {
        await tx.allocation.upsert({
          where: { paymentId_operationId: { paymentId, operationId } },
          create: { paymentId, operationId, amountVESApplied: amt.toFixed(2) },
          update: { amountVESApplied: amt.toFixed(2) },
        });
      }
    }

    // Recompute status for touched operations
    for (const op of operations) {
      const fresh = await tx.operation.findUnique({
        where: { id: op.id },
        include: { allocations: true },
      });
      if (!fresh) continue;

      const debtVES = calcDebtVES({
        usdCharged: fresh.usdCharged.toString(),
        bcvRateOnCharge: fresh.bcvRateOnCharge.toString(),
      });
      const allocated = fresh.allocations.reduce((acc, a) => acc.add(d(a.amountVESApplied.toString())), d(0));
      const remaining = round2(debtVES.sub(allocated));

      const nextStatus = remaining.lte(SETTLE_TOLERANCE_VES) ? "SETTLED" : "OPEN";
      if (fresh.status !== "CANCELLED" && fresh.status !== nextStatus) {
        await tx.operation.update({ where: { id: fresh.id }, data: { status: nextStatus } });
      }
    }
  });

  return { ok: true };
}
