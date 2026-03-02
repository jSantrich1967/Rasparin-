import { prisma } from "@/lib/prisma";
import { getLatestBcvRate } from "@/lib/fx";
import { calcDebtVES, calcFees, calcProfitRealizedUSD, calcUsdEquivalentPaid } from "@/lib/calc";
import { d, round2 } from "@/lib/money";
import { StitchDashboard } from "@/components/stitch/StitchDashboard";

export const dynamic = "force-dynamic";

export default async function StitchPage() {
  try {
    const [openOperations, allocationsWithDetails, latestRate, fxRatesRecent, recentOps] = await Promise.all([
      prisma.operation.findMany({
        where: { status: "OPEN" },
        include: { counterparty: true },
      }),
      prisma.allocation.findMany({
        include: { operation: true, payment: true },
      }),
      getLatestBcvRate(),
      prisma.fXRate.findMany({
        orderBy: { date: "desc" },
        take: 30,
      }),
      prisma.operation.findMany({
        where: { status: { not: "CANCELLED" } },
        include: { counterparty: true },
        orderBy: { date: "desc" },
        take: 5,
      }),
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

    // Ganancia realizada
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

    // Tasa BCV actual
    const bcvRate = latestRate ? Number(latestRate.bcvRate) : 0;

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
    const bcvChartData = fxRatesRecent.reverse().map((r) => ({ date: r.date, rate: Number(r.bcvRate) }));

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
        bcvRate={bcvRate}
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
