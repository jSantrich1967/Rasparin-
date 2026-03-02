"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { applyAllocations } from "@/lib/reconciliation";

export async function createPayment(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  const dateStr = formData.get("date") as string;
  const cardId = formData.get("cardId") as string;
  const amountVES = formData.get("amountVES") as string;
  const bcvRateOnPayment = formData.get("bcvRateOnPayment") as string;
  const marketRateStr = (formData.get("marketRate") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  if (!dateStr || !cardId || !amountVES || !bcvRateOnPayment) {
    return { ok: false, message: "Fecha, tarjeta, monto VES y tasa BCV son obligatorios" };
  }
  const amount = parseFloat(amountVES);
  const bcv = parseFloat(bcvRateOnPayment);
  if (Number.isNaN(amount) || amount <= 0 || Number.isNaN(bcv) || bcv <= 0) {
    return { ok: false, message: "Monto y tasa deben ser positivos" };
  }
  const marketRateNum = marketRateStr ? parseFloat(marketRateStr) : NaN;
  const marketRate = Number.isFinite(marketRateNum) && marketRateNum > 0 ? marketRateNum : null;
  if (marketRateStr && marketRate == null) {
    return { ok: false, message: "La tasa de mercado debe ser un número positivo" };
  }
  try {
    await prisma.payment.create({
      data: {
        date: new Date(dateStr),
        cardId,
        amountVES: amount,
        bcvRateOnPayment: bcv,
        marketRate: marketRate ?? undefined,
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

export async function deletePayment(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
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

export async function submitAllocations(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
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
    revalidatePath(`/dashboard/reconciliation?payment=${paymentId}`);
    revalidatePath("/dashboard");
    revalidatePath("/stitch");
  }
  return result;
}
