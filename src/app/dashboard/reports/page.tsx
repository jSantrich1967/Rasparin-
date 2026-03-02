import { prisma } from "@/lib/prisma";
import { PageSection } from "../PageSection";
import { ReportPanel } from "./ReportPanel";
import { calcDebtVES, calcFees } from "@/lib/calc";

export const dynamic = "force-dynamic";

export type ReportRow = {
  id: string;
  date: string;
  cardAlias: string;
  bankName: string;
  counterpartyName: string;
  usdCharged: number;
  bankFeePercent: number;
  merchantFeePercent: number;
  bankFeeUSD: number;
  merchantFeeUSD: number;
  totalFeeUSD: number;
  usdCashReceived: number;
  debtVES: number;
  bcvRate: number;
  status: string;
};

export type ReportSummary = {
  totalUsdCharged: number;
  totalBankFeeUSD: number;
  totalMerchantFeeUSD: number;
  totalFeesUSD: number;
  totalUsdCashReceived: number;
  totalDebtVES: number;
  count: number;
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; card?: string; status?: string }>;
}) {
  try {
    const params = await searchParams;
    const fromStr = params.from;
    const toStr = params.to;
    const cardId = params.card ?? undefined;
    const status = params.status === "OPEN" || params.status === "SETTLED" || params.status === "CANCELLED" ? params.status : undefined;

    const fromDate = fromStr ? new Date(fromStr + "T00:00:00") : undefined;
    const toDate = toStr ? new Date(toStr + "T23:59:59.999") : undefined;

    const where: Record<string, unknown> = {};
    if (cardId) where.cardId = cardId;
    if (status) where.status = status;
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) (where.date as Record<string, Date>).gte = fromDate;
      if (toDate) (where.date as Record<string, Date>).lte = toDate;
    }

    const operations = await prisma.operation.findMany({
      where,
      include: { card: { include: { bank: true } }, counterparty: true },
      orderBy: { date: "desc" },
      take: 500,
    });

    const cards = await prisma.card.findMany({
      include: { bank: true },
      orderBy: { alias: "asc" },
    });

    const rows: ReportRow[] = operations.map((op) => {
    const fees = calcFees({
      usdCharged: op.usdCharged.toString(),
      bankFeePercent: op.bankFeePercent.toString(),
      merchantFeePercent: op.merchantFeePercent.toString(),
    });
    const debtVES = calcDebtVES({
      usdCharged: op.usdCharged.toString(),
      bcvRateOnCharge: op.bcvRateOnCharge.toString(),
    });
      return {
        id: op.id,
        date: new Date(op.date).toISOString().slice(0, 10),
        cardAlias: op.card.alias,
        bankName: op.card.bank?.name ?? "",
        counterpartyName: op.counterparty.name,
        usdCharged: Number(op.usdCharged),
        bankFeePercent: Number(op.bankFeePercent) * 100,
        merchantFeePercent: Number(op.merchantFeePercent) * 100,
        bankFeeUSD: Number(fees.bankFeeUSD),
        merchantFeeUSD: Number(fees.merchantFeeUSD),
        totalFeeUSD: Number(fees.totalFeeUSD),
        usdCashReceived: Number(fees.usdCashReceived),
        debtVES: Number(debtVES),
        bcvRate: Number(op.bcvRateOnCharge),
        status: op.status,
      };
    });

    const summary: ReportSummary = rows.reduce(
      (acc, r) => ({
        totalUsdCharged: acc.totalUsdCharged + r.usdCharged,
        totalBankFeeUSD: acc.totalBankFeeUSD + r.bankFeeUSD,
        totalMerchantFeeUSD: acc.totalMerchantFeeUSD + r.merchantFeeUSD,
        totalFeesUSD: acc.totalFeesUSD + r.totalFeeUSD,
        totalUsdCashReceived: acc.totalUsdCashReceived + r.usdCashReceived,
        totalDebtVES: acc.totalDebtVES + r.debtVES,
        count: acc.count + 1,
      }),
      { totalUsdCharged: 0, totalBankFeeUSD: 0, totalMerchantFeeUSD: 0, totalFeesUSD: 0, totalUsdCashReceived: 0, totalDebtVES: 0, count: 0 }
    );

    return (
      <PageSection
        title="Reportes"
        description="Resumen de operaciones con fees. Imprime, exporta a PDF o Excel."
      >
        <div className="space-y-4">
          {/* Filtros */}
          <div className="rounded-2xl stitch-glass p-4">
            <form method="get" className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Desde</label>
                <input type="date" name="from" defaultValue={fromStr ?? ""} className="rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Hasta</label>
                <input type="date" name="to" defaultValue={toStr ?? ""} className="rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tarjeta</label>
                <select name="card" defaultValue={cardId ?? ""} className="rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-sm min-w-[140px] text-white">
                  <option value="">Todas</option>
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>{c.alias}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Estado</label>
                <select name="status" defaultValue={status ?? ""} className="rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-sm text-white">
                  <option value="">Todos</option>
                  <option value="OPEN">OPEN</option>
                  <option value="SETTLED">SETTLED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
              <button type="submit" className="rounded-lg bg-gradient-to-tr from-electric-blue to-blue-400 text-white px-4 py-2 text-sm font-medium hover:opacity-90">
                Filtrar
              </button>
            </form>
          </div>

          <ReportPanel rows={rows} summary={summary} />
        </div>
      </PageSection>
    );
  } catch (err) {
    return (
      <PageSection title="Reportes" description="Error al cargar el reporte.">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
          <p className="font-medium">No se pudo cargar el reporte.</p>
          <p className="text-sm mt-2">
            Verifica la conexión a la base de datos (DATABASE_URL) y que las migraciones estén aplicadas.
          </p>
          <p className="text-xs mt-2 text-red-600">
            {err instanceof Error ? err.message : "Error desconocido"}
          </p>
        </div>
      </PageSection>
    );
  }
}
