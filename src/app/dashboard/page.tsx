import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { buildRateLookup } from "@/lib/fx";
import { calcDebtVES, calcFees, calcProfitRealizedUSDWithMarket } from "@/lib/calc";
import { d, round2, formatUSD } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    const [banks, cards, opsOpen, allocationsWithDetails, openOperations, allFxRates] = await Promise.all([
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
      prisma.fXRate.findMany({ orderBy: { date: "desc" }, take: 365 }),
    ]);

    const getRate = buildRateLookup(allFxRates);
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
      // Usar tasa de mercado del pago (ingresada al conciliar); si no hay, fallback a FX/BCV
      const paymentMarketRate = payment.marketRate?.toString();
      const marketOrBcv = paymentMarketRate ?? (() => {
        const paymentDayEnd = new Date(payment.date);
        paymentDayEnd.setUTCHours(23, 59, 59, 999);
        const rateInfo = getRate(paymentDayEnd);
        return rateInfo?.marketRate ?? rateInfo?.bcvRate ?? payment.bcvRateOnPayment.toString();
      })();
      realizedProfitUSD = realizedProfitUSD.add(
        calcProfitRealizedUSDWithMarket({
          usdCashReceived: shareUsdCashReceived,
          amountVESApplied: amountVES,
          marketOrBcvRate: marketOrBcv,
        })
      );
    }
    realizedProfitUSD = round2(realizedProfitUSD);

    // Ganancia no realizada: usa la última tasa de mercado registrada
    const lastRateInfo = getRate(new Date());
    let unrealizedProfitUSD = d(0);
    for (const op of openOperations) {
      const debtVES = calcDebtVES({ usdCharged: op.usdCharged.toString(), bcvRateOnCharge: op.bcvRateOnCharge.toString() });
      const marketRate = lastRateInfo?.marketRate ?? lastRateInfo?.bcvRate ?? op.bcvRateOnCharge.toString();
      const rateNum = Number(marketRate);
      if (rateNum <= 0) continue;
      const debtUSDAtLastRate = debtVES.div(rateNum);
      const fees = calcFees({
        usdCharged: op.usdCharged.toString(),
        bankFeePercent: op.bankFeePercent.toString(),
        merchantFeePercent: op.merchantFeePercent.toString(),
      });
      unrealizedProfitUSD = unrealizedProfitUSD.add(fees.usdCashReceived.sub(debtUSDAtLastRate));
    }
    unrealizedProfitUSD = round2(unrealizedProfitUSD);
    const totalProfitUSD = realizedProfitUSD.add(unrealizedProfitUSD);

    return (
      <main>
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Resumen</h1>
          <p className="text-slate-400 text-sm mt-1">Tarjeteando — Control de cash advance (USD → VES)</p>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
          <Link href="/dashboard/reports/gains" className="rounded-2xl stitch-glass p-4 sm:p-5 hover:bg-white/5 transition-colors block order-first border-electric-blue/30">
            <div className="text-sm font-medium text-electric-blue">Ganancias</div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-500">Realizada</span>
                <span className={`font-bold ${Number(realizedProfitUSD) >= 0 ? "text-emerald-accent" : "text-red-400"}`}>
                  {formatUSD(realizedProfitUSD)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-500">No realizada</span>
                <span className={`font-bold ${Number(unrealizedProfitUSD) >= 0 ? "text-amber-400" : "text-red-400"}`}>
                  {formatUSD(unrealizedProfitUSD)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-white/10">
                <span className="text-[11px] text-slate-400">Total</span>
                <span className={`font-bold ${Number(totalProfitUSD) >= 0 ? "text-white" : "text-red-400"}`}>
                  {formatUSD(totalProfitUSD)}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">Ver reporte detallado →</p>
          </Link>
          <Link href="/dashboard/reports" className="rounded-2xl stitch-glass p-4 sm:p-5 hover:bg-white/5 transition-colors block">
            <div className="text-sm font-medium text-slate-500">Reportes</div>
            <div className="text-xl font-bold mt-1 text-white">Operaciones + Fees</div>
            <p className="text-xs text-slate-400 mt-1">Imprimir, PDF, Excel</p>
          </Link>
          <Link href="/dashboard/banks" className="rounded-2xl stitch-glass p-4 sm:p-5 hover:bg-white/5 transition-colors block">
            <div className="text-sm font-medium text-slate-500">Bancos</div>
            <div className="text-2xl font-bold text-white mt-1">{banks}</div>
            <p className="text-sm text-electric-blue hover:underline mt-2">Ver bancos</p>
          </Link>
          <Link href="/dashboard/cards" className="rounded-2xl stitch-glass p-4 sm:p-5 hover:bg-white/5 transition-colors block">
            <div className="text-sm font-medium text-slate-500">Tarjetas</div>
            <div className="text-2xl font-bold text-white mt-1">{cards}</div>
            <p className="text-sm text-electric-blue hover:underline mt-2">Ver tarjetas</p>
          </Link>
          <Link href="/dashboard/operations?status=OPEN" className="rounded-2xl stitch-glass p-4 sm:p-5 hover:bg-white/5 transition-colors block">
            <div className="text-sm font-medium text-slate-500">Operaciones OPEN</div>
            <div className="text-2xl font-bold text-white mt-1">{opsOpen}</div>
            <p className="text-sm text-electric-blue hover:underline mt-2">Ver operaciones</p>
          </Link>
          <div className="rounded-2xl stitch-glass p-4 sm:p-5">
            <div className="text-sm font-medium text-slate-500">Ganancia realizada (USD)</div>
            <div className={`text-2xl font-bold mt-1 ${Number(realizedProfitUSD) >= 0 ? "text-emerald-accent" : "text-red-400"}`}>
              {formatUSD(realizedProfitUSD)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Por conciliaciones aplicadas</p>
          </div>
          <div className="rounded-2xl stitch-glass p-4 sm:p-5">
            <div className="text-sm font-medium text-slate-500">Ganancia no realizada (USD)</div>
            <div className={`text-2xl font-bold mt-1 ${Number(unrealizedProfitUSD) >= 0 ? "text-amber-400" : "text-red-400"}`}>
              {formatUSD(unrealizedProfitUSD)}
            </div>
            <p className="text-xs text-slate-500 mt-1">OPEN con última tasa mercado</p>
          </div>
        </div>

        <div className="mt-6 sm:mt-8">
          <h3 className="text-sm font-medium text-slate-500 mb-3">Accesos rápidos</h3>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Link href="/dashboard/reports" className="rounded-lg stitch-glass px-4 py-2 text-sm font-medium text-electric-blue hover:bg-white/5 transition-colors">Reportes</Link>
            <Link href="/stitch" className="rounded-lg stitch-glass px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors">Inicio</Link>
            <Link href="/dashboard/fx-rates" className="rounded-lg stitch-glass px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors">Tasas BCV y Mercado</Link>
            <Link href="/dashboard/counterparties" className="rounded-lg stitch-glass px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors">Contrapartes</Link>
            <Link href="/dashboard/operations" className="rounded-lg stitch-glass px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors">Operaciones</Link>
            <Link href="/dashboard/payments" className="rounded-lg stitch-glass px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors">Pagos</Link>
            <Link href="/dashboard/backup" className="rounded-lg stitch-glass px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors">Respaldo</Link>
          </div>
        </div>
      </main>
    );
  } catch {
    return (
      <main>
        <h1 className="text-2xl font-bold text-white">Resumen</h1>
        <p className="text-red-400 mt-2 text-sm">
          No se pudo conectar a la base de datos. Verifica <code className="font-mono">DATABASE_URL</code> en tu entorno.
        </p>
      </main>
    );
  }
}
