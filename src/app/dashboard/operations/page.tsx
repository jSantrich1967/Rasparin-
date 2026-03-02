import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { PageSection } from "../PageSection";
import { OperationForm } from "./OperationForm";
import { OperationRow } from "./OperationRow";

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

async function deleteOperation(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  "use server";
  if (!id) return { ok: false, message: "ID requerido" };
  try {
    await prisma.operation.delete({ where: { id } });
    revalidatePath("/dashboard/operations");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "No se puede eliminar (¿tiene conciliaciones asignadas?)" };
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
    <PageSection title="Operaciones" description="Cargas en POS (USD). La deuda en VES se calcula con la tasa BCV al cargo.">
      <div className="rounded-2xl stitch-glass p-4 sm:p-5 mb-6">
        <OperationForm createAction={createOperation} cards={cards} counterparties={counterparties} />
      </div>
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <span className="text-sm font-medium text-slate-500">Filtrar:</span>
        <Link href="/dashboard/operations" className="rounded-lg stitch-glass px-3 py-1.5 text-sm hover:bg-white/5 text-slate-300">Todas</Link>
        {cards.map((c) => (
          <Link key={c.id} href={`/dashboard/operations?card=${c.id}`} className="rounded-lg stitch-glass px-3 py-1.5 text-sm hover:bg-white/5 text-slate-300">{c.alias}</Link>
        ))}
        <span className="ml-2 text-sm font-medium text-slate-500">Estado:</span>
        <Link href={cardId ? `/dashboard/operations?card=${cardId}&status=OPEN` : "/dashboard/operations?status=OPEN"} className="rounded-lg stitch-glass px-3 py-1.5 text-sm hover:bg-white/5 text-slate-300">OPEN</Link>
        <Link href={cardId ? `/dashboard/operations?card=${cardId}&status=SETTLED` : "/dashboard/operations?status=SETTLED"} className="rounded-lg stitch-glass px-3 py-1.5 text-sm hover:bg-white/5 text-slate-300">SETTLED</Link>
      </div>
      <ul className="divide-y divide-white/10 rounded-2xl stitch-glass overflow-hidden">
        {operations.map((op) => (
          <OperationRow key={op.id} operation={op} deleteAction={deleteOperation} />
        ))}
      </ul>
    </PageSection>
  );
}
