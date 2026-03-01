import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { OperationForm } from "./OperationForm";
import { formatUSD, formatVES } from "@/lib/money";
import { calcDebtVES } from "@/lib/calc";

async function createOperation(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  "use server";
  const dateStr = formData.get("date") as string;
  const cardId = formData.get("cardId") as string;
  const counterpartyId = formData.get("counterpartyId") as string;
  const usdCharged = formData.get("usdCharged") as string;
  const bankFeePercent = formData.get("bankFeePercent") as string;
  const merchantFeePercent = formData.get("merchantFeePercent") as string;
  const bcvRateOnCharge = formData.get("bcvRateOnCharge") as string;
  const notes = (formData.get("notes") as string)?.trim() || null;
  if (!dateStr || !cardId || !counterpartyId || !usdCharged || !bcvRateOnCharge) {
    return { ok: false, message: "Fecha, tarjeta, contraparte, USD y tasa BCV son obligatorios" };
  }
  const usd = parseFloat(usdCharged);
  const bcv = parseFloat(bcvRateOnCharge);
  const bankPct = bankFeePercent ? parseFloat(bankFeePercent) : 0.015;
  const merchantPct = merchantFeePercent ? parseFloat(merchantFeePercent) : 0.01;
  if (Number.isNaN(usd) || usd <= 0 || Number.isNaN(bcv) || bcv <= 0) {
    return { ok: false, message: "USD y tasa BCV deben ser números positivos" };
  }
  try {
    await prisma.operation.create({
      data: {
        date: new Date(dateStr),
        cardId,
        counterpartyId,
        usdCharged: usd,
        bankFeePercent: Number.isNaN(bankPct) ? 0.015 : bankPct,
        merchantFeePercent: Number.isNaN(merchantPct) ? 0.01 : merchantPct,
        bcvRateOnCharge: bcv,
        notes,
      },
    });
    revalidatePath("/dashboard/operations");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Error al guardar" };
  }
}

export default async function OperationsPage({
  searchParams,
}: {
  searchParams: Promise<{ card?: string; status?: string }>;
}) {
  const params = await searchParams;
  const cardId = params.card ?? undefined;
  const status = params.status === "OPEN" || params.status === "SETTLED" || params.status === "CANCELLED" ? params.status : undefined;

  const [operations, cards, counterparties] = await Promise.all([
    prisma.operation.findMany({
      where: { ...(cardId && { cardId }), ...(status && { status }) },
      include: { card: { include: { bank: true } }, counterparty: true },
      orderBy: { date: "desc" },
      take: 200,
    }),
    prisma.card.findMany({ include: { bank: true }, orderBy: { alias: "asc" } }),
    prisma.counterparty.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <section className="p-6">
      <h2 className="text-2xl font-bold mb-4">Operaciones</h2>
      <p className="text-sm text-slate-600 mb-4">Cargas en POS (USD). La deuda en VES se calcula con la tasa BCV al cargo.</p>
      <OperationForm createAction={createOperation} cards={cards} counterparties={counterparties} />
      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-2 items-center">
        <span className="text-sm text-slate-600">Filtrar:</span>
        <Link href="/dashboard/operations" className="px-2 py-1 rounded border text-sm hover:bg-slate-100">Todas</Link>
        {cards.map((c) => (
          <Link key={c.id} href={`/dashboard/operations?card=${c.id}`} className="px-2 py-1 rounded border text-sm hover:bg-slate-100">{c.alias}</Link>
        ))}
        <span className="ml-2 text-sm text-slate-600">Estado:</span>
        <Link href={cardId ? `/dashboard/operations?card=${cardId}&status=OPEN` : "/dashboard/operations?status=OPEN"} className="px-2 py-1 rounded border text-sm hover:bg-slate-100">OPEN</Link>
        <Link href={cardId ? `/dashboard/operations?card=${cardId}&status=SETTLED` : "/dashboard/operations?status=SETTLED"} className="px-2 py-1 rounded border text-sm hover:bg-slate-100">SETTLED</Link>
      </div>
      <ul className="mt-4 space-y-2">
        {operations.map((op) => {
          const debtVES = calcDebtVES({ usdCharged: op.usdCharged.toString(), bcvRateOnCharge: op.bcvRateOnCharge.toString() });
          return (
            <li key={op.id} className="flex flex-wrap justify-between items-center py-2 border-b border-slate-200 text-sm">
              <span className="font-mono">{new Date(op.date).toISOString().slice(0, 10)}</span>
              <span>{op.card.alias} ({op.card.bank?.name})</span>
              <span>{op.counterparty.name}</span>
              <span>{formatUSD(op.usdCharged.toString())}</span>
              <span>{formatVES(debtVES)} VES</span>
              <span className={`font-medium ${op.status === "OPEN" ? "text-amber-600" : op.status === "SETTLED" ? "text-green-600" : "text-slate-500"}`}>{op.status}</span>
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
