import { prisma } from "@/lib/prisma";
import { getLatestBcvRate, buildRateLookup } from "@/lib/fx";
import { calcDebtVES, calcFees, calcProfitRealizedUSDWithMarket } from "@/lib/calc";
import { d, round2 } from "@/lib/money";
import { StitchDashboard } from "@/components/stitch/StitchDashboard";

export const dynamic = "force-dynamic";

export default async function StitchPage() {
  try {
    const [openOperations, allocationsWithDetails, latestRate, fxRatesRecent, recentOps, allFxRates, allOpsNonCancelled, allPayments] = await Promise.all([
      prisma.operation.findMany({
        where: { status: "OPEN" },
        include: { counterparty: true },
      }),
      prisma.allocation.findMany({
        include: { operation: true, payment: true },
      }),
      getLatestBcvRate(),
      prisma.fXRate.findMany({ take: 50 }),
      prisma.operation.findMany({
        where: { status: { not: "CANCELLED" } },
        include: { counterparty: true },
        orderBy: { date: "desc" },
        take: 5,
      }),
      prisma.fXRate.findMany({ orderBy: { date: "desc" }, take: 365 }),
      prisma.operation.findMany({ where: { status: { not: "CANCELLED" } } }),
      prisma.payment.findMany(),
    ]);

    // Deuda total pendiente (OPEN): suma de usdCharged y debtVES
    // USD netos recibidos (post-fees): usdCharged - bankFee - merchantFee
    let totalDebtUSD = d(0);
    let totalDebtVES = d(0);
    let totalNetUsdReceived = d(0);
    for (const op of openOperations) {
      totalDebtUSD = totalDebtUSD.add(op.usdCharged);
      totalDebtVES = totalDebtVES.add(calcDebtVES({ usdCharged: op.usdCharged.toString(), bcvRateOnCharge: op.bcvRateOnCharge.toString() }));
      const fees = calcFees({
        usdCharged: op.usdCharged.toString(),
        bankFeePercent: op.bankFeePercent.toString(),
        merchantFeePercent: op.merchantFeePercent.toString(),
      });
      totalNetUsdReceived = totalNetUsdReceived.add(fees.usdCashReceived);
    }
    totalDebtUSD = round2(totalDebtUSD);
    totalDebtVES = round2(totalDebtVES);
    totalNetUsdReceived = round2(totalNetUsdReceived);

    // Operaciones USD: total cargado en operaciones (OPEN + SETTLED)
    let totalOperationsUSD = d(0);
    let totalUsdObtained = d(0);
    for (const op of allOpsNonCancelled) {
      totalOperationsUSD = totalOperationsUSD.add(op.usdCharged);
      const fees = calcFees({
        usdCharged: op.usdCharged.toString(),
        bankFeePercent: op.bankFeePercent.toString(),
        merchantFeePercent: op.merchantFeePercent.toString(),
      });
      totalUsdObtained = totalUsdObtained.add(fees.usdCashReceived);
    }
    totalOperationsUSD = round2(totalOperationsUSD);
    totalUsdObtained = round2(totalUsdObtained);

    // USD Pagados: total pagado a la tarjeta (VES / tasa BCV por pago)
    let totalUsdPaid = d(0);
    for (const p of allPayments) {
      const bcv = Number(p.bcvRateOnPayment.toString());
      if (bcv > 0) totalUsdPaid = totalUsdPaid.add(d(p.amountVES.toString()).div(bcv));
    }
    totalUsdPaid = round2(totalUsdPaid);

    // USD a Mercado: total pagado en USD a tasa de mercado (VES / marketRate por pago)
    const getRate = buildRateLookup(allFxRates);
    let totalUsdAtMarket = d(0);
    for (const p of allPayments) {
      const rate = p.marketRate?.toString()
        ?? (() => {
          const dayEnd = new Date(p.date);
          dayEnd.setUTCHours(23, 59, 59, 999);
          const info = getRate(dayEnd);
          return info?.marketRate ?? info?.bcvRate ?? p.bcvRateOnPayment.toString();
        })();
      const r = Number(rate);
      if (r > 0) totalUsdAtMarket = totalUsdAtMarket.add(d(p.amountVES.toString()).div(r));
    }
    totalUsdAtMarket = round2(totalUsdAtMarket);

    // Ganancia realizada (usa tasa de mercado si existe; si no, BCV)
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

    // Tasa BCV y mercado actual
    const bcvRate = latestRate ? Number(latestRate.bcvRate) : 0;
    const marketRate = latestRate?.marketRate ? Number(latestRate.marketRate) : 0;

    // Conteo por estatus
    const [countOpen, countSettled, countCancelled] = await Promise.all([
      prisma.operation.count({ where: { status: "OPEN" } }),
      prisma.operation.count({ where: { status: "SETTLED" } }),
      prisma.operation.count({ where: { status: "CANCELLED" } }),
    ]);
    const totalOps = countOpen + countSettled + countCancelled;
    const pctOpen = totalOps > 0 ? Math.round((countOpen / totalOps) * 100) : 0;
    const pctSettled = totalOps > 0 ? Math.round((countSettled / totalOps) * 100) : 0;
    const pctCancelled = totalOps > 0 ? Math.round((countCancelled / totalOps) * 100) : 0;

    // Datos para gráfico BCV (últimas tasas)
    const sortedRates = [...fxRatesRecent].sort((a, b) => {
      const am = (a.effectiveAt ?? a.date)?.getTime() ?? 0;
      const bm = (b.effectiveAt ?? b.date)?.getTime() ?? 0;
      return am - bm;
    });
    const bcvChartData = sortedRates.map((r) => ({
      date: (r.effectiveAt ?? r.date)!,
      rate: Number(r.bcvRate),
    }));

    // Actividad reciente
    const activityItems = recentOps.map((op) => ({
      id: op.id,
      name: op.counterparty.name,
      date: op.date,
      amount: Number(op.usdCharged),
      status: op.status,
    }));

    return (
      <StitchDashboard
        totalDebtUSD={Number(totalDebtUSD)}
        totalDebtVES={Number(totalDebtVES)}
        totalNetUsdReceived={Number(totalNetUsdReceived)}
        totalOperationsUSD={Number(totalOperationsUSD)}
        totalUsdPaid={Number(totalUsdPaid)}
        totalUsdObtained={Number(totalUsdObtained)}
        totalUsdAtMarket={Number(totalUsdAtMarket)}
        bcvRate={bcvRate}
        marketRate={marketRate}
        realizedProfitUSD={Number(realizedProfitUSD)}
        pendingDebtUSD={Number(totalDebtUSD)}
        opsCount={totalOps}
        pctOpen={pctOpen}
        pctSettled={pctSettled}
        pctCancelled={pctCancelled}
        bcvChartData={bcvChartData}
        activityItems={activityItems}
      />
    );
  } catch (err) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 stitch-bg text-red-400">
        <p>Error al cargar datos: {err instanceof Error ? err.message : "Error desconocido"}</p>
      </div>
    );
  }
}
