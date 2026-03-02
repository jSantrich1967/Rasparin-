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
        include: { operation: true, payment: true },
      }),
      prisma.operation.findMany({
        where: { status: "OPEN" },
        include: { counterparty: true },
      }),
    ]);

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
      <main>
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Resumen</h1>
          <p className="text-slate-500 text-sm mt-1">Tarjeteando — Control de cash advance (USD → VES)</p>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
          <Link href="/dashboard/reports" className="rounded-xl border-2 border-blue-300 bg-blue-50 p-4 sm:p-5 shadow-sm hover:bg-blue-100 hover:border-blue-400 transition-colors block order-first">
            <div className="text-sm font-medium text-blue-700">Reportes</div>
            <div className="text-xl font-bold mt-1 text-blue-900">Operaciones + Fees</div>
            <p className="text-xs text-blue-600 mt-1">Imprimir, PDF, Excel</p>
          </Link>
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Bancos</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{banks}</div>
            <Link href="/dashboard/banks" className="text-sm text-blue-600 hover:underline mt-2 block">Ver bancos</Link>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Tarjetas</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{cards}</div>
            <Link href="/dashboard/cards" className="text-sm text-blue-600 hover:underline mt-2 block">Ver tarjetas</Link>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Operaciones OPEN</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{opsOpen}</div>
            <Link href="/dashboard/operations?status=OPEN" className="text-sm text-blue-600 hover:underline mt-2 block">Ver operaciones</Link>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Ganancia realizada (USD)</div>
            <div className={`text-2xl font-bold mt-1 ${Number(realizedProfitUSD) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatUSD(realizedProfitUSD)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Por conciliaciones aplicadas</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Ganancia no realizada (USD)</div>
            <div className={`text-2xl font-bold mt-1 ${Number(unrealizedProfitUSD) >= 0 ? "text-amber-600" : "text-red-600"}`}>
              {formatUSD(unrealizedProfitUSD)}
            </div>
            <p className="text-xs text-slate-500 mt-1">OPEN valoradas con última tasa BCV</p>
          </div>
        </div>

        <div className="mt-6 sm:mt-8">
          <h3 className="text-sm font-medium text-slate-600 mb-3">Accesos rápidos</h3>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Link href="/dashboard/reports" className="rounded-lg border-2 border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors">Reportes</Link>
            <Link href="/stitch" className="rounded-lg border-2 border-slate-300 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors">Vista móvil (Stitch)</Link>
            <Link href="/dashboard/fx-rates" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Tasas BCV</Link>
            <Link href="/dashboard/counterparties" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Contrapartes</Link>
            <Link href="/dashboard/operations" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Operaciones</Link>
            <Link href="/dashboard/payments" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Pagos</Link>
            <Link href="/dashboard/reconciliation" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Conciliación</Link>
            <Link href="/dashboard/backup" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Respaldo</Link>
          </div>
        </div>
      </main>
    );
  } catch {
    return (
      <main>
        <h1 className="text-2xl font-bold text-slate-900">Resumen</h1>
        <p className="text-red-600 mt-2 text-sm">
          No se pudo conectar a la base de datos. Verifica <code className="font-mono">DATABASE_URL</code> en tu entorno.
        </p>
      </main>
    );
  }
}
