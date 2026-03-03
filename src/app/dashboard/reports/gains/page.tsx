import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageSection } from "../../PageSection";
import { getLastBcvRateForDate, buildRateLookup } from "@/lib/fx";
import { calcDebtVES, calcFees, calcProfitRealizedUSDWithMarket } from "@/lib/calc";
import { d, round2, formatUSD, formatVES } from "@/lib/money";

export const dynamic = "force-dynamic";

type GainsRow = {
  allocationId: string;
  opDate: string;
  counterpartyName: string;
  cardAlias: string;
  amountVESApplied: number;
  rateUsed: number;
  usdCost: number;
  usdCashReceivedShare: number;
  profitUSD: number;
  rateSource: "mercado" | "bcv";
};

export default async function GainsReportPage() {
  try {
    const [allocationsWithDetails, openOperations, allFxRates] = await Promise.all([
      prisma.allocation.findMany({
        include: { operation: { include: { counterparty: true, card: true } }, payment: true },
      }),
      prisma.operation.findMany({
        where: { status: "OPEN" },
        include: { counterparty: true },
      }),
      prisma.fXRate.findMany({ orderBy: { date: "desc" }, take: 365 }),
    ]);

    const getRate = buildRateLookup(allFxRates);

    // Ganancia realizada: detalle por asignación
    const realizedRows: GainsRow[] = [];
    let realizedProfitUSD = d(0);

    for (const a of allocationsWithDetails) {
      const op = a.operation;
      const payment = a.payment;
      const debtVES = calcDebtVES({
        usdCharged: op.usdCharged.toString(),
        bcvRateOnCharge: op.bcvRateOnCharge.toString(),
      });
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
      const usedMarket = !!paymentMarketRate;

      const profit = calcProfitRealizedUSDWithMarket({
        usdCashReceived: shareUsdCashReceived,
        amountVESApplied: amountVES,
        marketOrBcvRate: marketOrBcv,
      });

      realizedProfitUSD = realizedProfitUSD.add(profit);

      const rateNum = Number(marketOrBcv);
      const usdCost = amountVES.div(rateNum).toNumber();

      realizedRows.push({
        allocationId: a.id,
        opDate: new Date(op.date).toISOString().slice(0, 10),
        counterpartyName: op.counterparty.name,
        cardAlias: op.card.alias,
        amountVESApplied: Number(amountVES),
        rateUsed: rateNum,
        usdCost,
        usdCashReceivedShare: Number(shareUsdCashReceived),
        profitUSD: Number(profit),
        rateSource: usedMarket ? "mercado" : "bcv",
      });
    }

    realizedProfitUSD = round2(realizedProfitUSD);

    // Ganancia no realizada: OPEN valoradas con última tasa BCV
    let unrealizedProfitUSD = d(0);
    for (const op of openOperations) {
      const lastRate = await getLastBcvRateForDate(op.date);
      if (!lastRate) continue;
      const debtVES = calcDebtVES({
        usdCharged: op.usdCharged.toString(),
        bcvRateOnCharge: op.bcvRateOnCharge.toString(),
      });
      const debtUSDAtLastRate = debtVES.div(lastRate.bcvRate);
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
      <PageSection
        title="Reporte de Ganancias"
        description="Cálculo de ganancia realizada (conciliada) y no realizada (OPEN). Incluye desglose por asignación."
      >
        <div className="space-y-6">
          {/* Fórmula explicada */}
          <div className="rounded-2xl stitch-glass p-4 sm:p-5 border border-electric-blue/20">
            <h3 className="text-sm font-semibold text-electric-blue mb-2">Fórmula de ganancia realizada</h3>
            <p className="text-slate-300 text-sm">
              Para cada asignación (conciliación): <strong>Ganancia = USD recibido − (VES asignados ÷ tasa)</strong>
            </p>
            <p className="text-slate-400 text-xs mt-2">
              El &quot;USD recibido&quot; es la parte proporcional del efectivo neto (tras fees). La tasa usada es la de mercado si existe para la fecha del pago; si no, BCV.
            </p>
          </div>

          {/* Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl stitch-glass p-4 sm:p-5">
              <div className="text-sm font-medium text-slate-500">Ganancia realizada</div>
              <div className={`text-2xl font-bold mt-1 ${Number(realizedProfitUSD) >= 0 ? "text-emerald-accent" : "text-red-400"}`}>
                {formatUSD(realizedProfitUSD)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Por conciliaciones aplicadas</p>
            </div>
            <div className="rounded-2xl stitch-glass p-4 sm:p-5">
              <div className="text-sm font-medium text-slate-500">Ganancia no realizada</div>
              <div className={`text-2xl font-bold mt-1 ${Number(unrealizedProfitUSD) >= 0 ? "text-amber-400" : "text-red-400"}`}>
                {formatUSD(unrealizedProfitUSD)}
              </div>
              <p className="text-xs text-slate-500 mt-1">OPEN valoradas con última tasa BCV</p>
            </div>
            <div className="rounded-2xl stitch-glass p-4 sm:p-5 border border-electric-blue/30">
              <div className="text-sm font-medium text-electric-blue">Total estimado</div>
              <div className={`text-2xl font-bold mt-1 ${Number(totalProfitUSD) >= 0 ? "text-white" : "text-red-400"}`}>
                {formatUSD(totalProfitUSD)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Realizada + no realizada</p>
            </div>
          </div>

          {/* Tabla detalle ganancia realizada */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Desglose por asignación (ganancia realizada)</h3>
            {realizedRows.length === 0 ? (
              <div className="rounded-2xl stitch-glass p-6 text-center text-slate-400">
                No hay asignaciones. La ganancia realizada se genera al asignar pagos a operaciones en la página de Pagos (clic en «Asignar a deudas» en cada pago).
              </div>
            ) : (
              <div className="rounded-2xl stitch-glass overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="text-left px-4 py-3 font-medium text-slate-400">Fecha op.</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-400">Contraparte</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-400">Tarjeta</th>
                        <th className="text-right px-4 py-3 font-medium text-slate-400">VES asignados</th>
                        <th className="text-right px-4 py-3 font-medium text-slate-400">Tasa usada</th>
                        <th className="text-right px-4 py-3 font-medium text-slate-400">USD costo</th>
                        <th className="text-right px-4 py-3 font-medium text-slate-400">USD recibido</th>
                        <th className="text-right px-4 py-3 font-medium text-slate-400">Ganancia USD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {realizedRows.map((r) => (
                        <tr key={r.allocationId} className="border-b border-white/5 hover:bg-white/5">
                          <td className="px-4 py-2.5 font-mono text-slate-500">{r.opDate}</td>
                          <td className="px-4 py-2.5 text-white">{r.counterpartyName}</td>
                          <td className="px-4 py-2.5 text-slate-400">{r.cardAlias}</td>
                          <td className="px-4 py-2.5 text-right text-slate-300">{formatVES(r.amountVESApplied)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={r.rateSource === "mercado" ? "text-emerald-400" : "text-slate-400"}>
                              {r.rateUsed.toFixed(2)} ({r.rateSource})
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-slate-400">{formatUSD(r.usdCost)}</td>
                          <td className="px-4 py-2.5 text-right text-emerald-accent">{formatUSD(r.usdCashReceivedShare)}</td>
                          <td className={`px-4 py-2.5 text-right font-semibold ${r.profitUSD >= 0 ? "text-emerald-accent" : "text-red-400"}`}>
                            {r.profitUSD >= 0 ? "+" : ""}{formatUSD(r.profitUSD)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-white/10 font-semibold border-t-2 border-white/20">
                        <td className="px-4 py-3 text-slate-300" colSpan={7}>
                          Total ganancia realizada ({realizedRows.length} asignaciones)
                        </td>
                        <td className={`px-4 py-3 text-right font-bold ${Number(realizedProfitUSD) >= 0 ? "text-emerald-accent" : "text-red-400"}`}>
                          {formatUSD(realizedProfitUSD)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/reports" className="rounded-lg stitch-glass px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5">
              ← Reportes
            </Link>
            <Link href="/dashboard" className="rounded-lg stitch-glass px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5">
              Resumen
            </Link>
          </div>
        </div>
      </PageSection>
    );
  } catch (err) {
    return (
      <PageSection title="Reporte de Ganancias" description="Error al cargar.">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
          <p className="font-medium">No se pudo cargar el reporte de ganancias.</p>
          <p className="text-sm mt-2">{err instanceof Error ? err.message : "Error desconocido"}</p>
        </div>
      </PageSection>
    );
  }
}
