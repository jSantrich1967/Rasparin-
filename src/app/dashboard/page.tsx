import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getLastBcvRateForDate } from "@/lib/fx";
import { calcDebtVES, calcFees, calcProfitRealizedUSD, calcUsdEquivalentPaid } from "@/lib/calc";
import { d, round2, formatUSD } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    const [banks, cards, opsOpen, allocationsWithDetails, openOperations] = await Promise.all([
      prisma.bank.count(),
      prisma.card.count(),
      prisma.operation.count({ where: { status: "OPEN" } }),
      prisma.allocation.findMany({
        include: {
          operation: true,
          payment: true,
        },
      }),
      prisma.operation.findMany({
        where: { status: "OPEN" },
        include: { counterparty: true },
      }),
    ]);

    // Realized profit: for each allocation, prorate usdCashReceived by (amountVESApplied / debtVES) and subtract usdRealPaid
    let realizedProfitUSD = d(0);
    for (const a of allocationsWithDetails) {
      const op = a.operation;
      const payment = a.payment;
      const debtVES = calcDebtVES({ usdCharged: op.usdCharged.toString(), bcvRateOnCharge: op.bcvRateOnCharge.toString() });
      const amountVES = d(a.amountVESApplied.toString());
      if (debtVES.lte(0)) continue;
      const share = amountVES.div(debtVES);
      const fees = calcFees({
        usdCharged: op.usdCharged.toString(),
        bankFeePercent: op.bankFeePercent.toString(),
        merchantFeePercent: op.merchantFeePercent.toString(),
      });
      const shareUsdCashReceived = fees.usdCashReceived.mul(share);
      const usdRealPaid = calcUsdEquivalentPaid({
        amountVES: a.amountVESApplied.toString(),
        bcvRateOnPayment: payment.bcvRateOnPayment.toString(),
      });
      realizedProfitUSD = realizedProfitUSD.add(calcProfitRealizedUSD({ usdCashReceived: shareUsdCashReceived, usdRealPaid }));
    }
    realizedProfitUSD = round2(realizedProfitUSD);

    // Unrealized profit: for each OPEN op, use last BCV rate for op date; value debt in USD at that rate; profit = usdCashReceived - debtUSD
    let unrealizedProfitUSD = d(0);
    for (const op of openOperations) {
      const lastRate = await getLastBcvRateForDate(op.date);
      if (!lastRate) continue;
      const debtVES = calcDebtVES({ usdCharged: op.usdCharged.toString(), bcvRateOnCharge: op.bcvRateOnCharge.toString() });
      const debtUSDAtLastRate = debtVES.div(lastRate.bcvRate);
      const fees = calcFees({
        usdCharged: op.usdCharged.toString(),
        bankFeePercent: op.bankFeePercent.toString(),
        merchantFeePercent: op.merchantFeePercent.toString(),
      });
      unrealizedProfitUSD = unrealizedProfitUSD.add(fees.usdCashReceived.sub(debtUSDAtLastRate));
    }
    unrealizedProfitUSD = round2(unrealizedProfitUSD);

    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold">Resumen</h1>
        <p className="text-sm text-slate-500 mt-1">Tarjeteando — Control de cash advance (USD → VES)</p>

        <div className="grid gap-4 mt-6 md:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border p-4">
            <div className="text-sm text-slate-500">Bancos</div>
            <div className="text-2xl font-semibold">{banks}</div>
            <Link href="/dashboard/banks" className="text-sm text-slate-600 hover:underline mt-1 block">Ver bancos</Link>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-sm text-slate-500">Tarjetas</div>
            <div className="text-2xl font-semibold">{cards}</div>
            <Link href="/dashboard/cards" className="text-sm text-slate-600 hover:underline mt-1 block">Ver tarjetas</Link>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-sm text-slate-500">Operaciones OPEN</div>
            <div className="text-2xl font-semibold">{opsOpen}</div>
            <Link href="/dashboard/operations?status=OPEN" className="text-sm text-slate-600 hover:underline mt-1 block">Ver operaciones</Link>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-sm text-slate-500">Ganancia realizada (USD)</div>
            <div className={`text-2xl font-semibold ${Number(realizedProfitUSD) >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatUSD(realizedProfitUSD)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Por conciliaciones aplicadas</p>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-sm text-slate-500">Ganancia no realizada (USD)</div>
            <div className={`text-2xl font-semibold ${Number(unrealizedProfitUSD) >= 0 ? "text-amber-600" : "text-red-600"}`}>
              {formatUSD(unrealizedProfitUSD)}
            </div>
            <p className="text-xs text-slate-500 mt-1">OPEN valoradas con última tasa BCV por fecha</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard/fx-rates" className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-100">Tasas BCV</Link>
          <Link href="/dashboard/counterparties" className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-100">Contrapartes</Link>
          <Link href="/dashboard/operations" className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-100">Operaciones</Link>
          <Link href="/dashboard/payments" className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-100">Pagos</Link>
          <Link href="/dashboard/reconciliation" className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-100">Conciliación</Link>
        </div>
      </main>
    );
  } catch {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold">Resumen</h1>
        <p className="text-sm text-red-600 mt-2">
          No se pudo conectar a la base de datos. Verifica <code className="font-mono">DATABASE_URL</code> en tu entorno.
        </p>
      </main>
    );
  }
}
