import { prisma } from "@/lib/prisma";

/** Returns the most recent BCV and market rate in the system. */
export async function getLatestBcvRate(): Promise<{ bcvRate: string; marketRate: string | null; date: Date } | null> {
  const rates = await prisma.fXRate.findMany({ take: 50 });
  const sorted = rates
    .map((r) => ({ rate: r, moment: r.effectiveAt ?? r.date }))
    .filter((x) => x.moment)
    .sort((a, b) => (b.moment!.getTime() - a.moment!.getTime()));
  const first = sorted[0];
  if (!first) return null;
  return {
    bcvRate: first.rate.bcvRate.toString(),
    marketRate: first.rate.marketRate?.toString() ?? null,
    date: first.moment!,
  };
}

/**
 * Returns the latest BCV rate with moment <= the given date/time.
 * Used for unrealized profit: value OPEN operations at "last known rate".
 */
export async function getLastBcvRateForDate(date: Date): Promise<{ bcvRate: string } | null> {
  const rates = await prisma.fXRate.findMany({ take: 200 });
  const valid = rates
    .map((r) => ({ rate: r, moment: r.effectiveAt ?? r.date }))
    .filter((x) => x.moment && x.moment <= date)
    .sort((a, b) => b.moment!.getTime() - a.moment!.getTime());
  const first = valid[0];
  if (!first) return null;
  return { bcvRate: first.rate.bcvRate.toString() };
}

/**
 * Returns the latest market rate with moment <= the given date/time.
 * Used for realized profit: cost of VES paid at market rate.
 * Falls back to BCV if no market rate is set.
 */
export async function getLastMarketRateForDate(date: Date): Promise<{ marketRate: string; bcvRate: string } | null> {
  const rates = await prisma.fXRate.findMany({ take: 200 });
  const valid = rates
    .map((r) => ({ rate: r, moment: r.effectiveAt ?? r.date }))
    .filter((x) => x.moment && x.moment <= date)
    .sort((a, b) => b.moment!.getTime() - a.moment!.getTime());
  const first = valid[0];
  if (!first) return null;
  const market = first.rate.marketRate?.toString();
  return { marketRate: market ?? first.rate.bcvRate.toString(), bcvRate: first.rate.bcvRate.toString() };
}

/** Returns a function to get rate for any moment from a preloaded list of FXRate records. */
export function buildRateLookup(
  rates: { effectiveAt: Date | null; date: Date | null; bcvRate: { toString(): string }; marketRate: { toString(): string } | null }[]
) {
  const withMoment = rates
    .map((r) => ({ ...r, moment: r.effectiveAt ?? r.date }))
    .filter((x) => x.moment)
    .sort((a, b) => b.moment!.getTime() - a.moment!.getTime());
  return (targetMoment: Date) => {
    const r = withMoment.find((x) => x.moment! <= targetMoment);
    if (!r) return null;
    const market = r.marketRate?.toString();
    return { marketRate: market ?? r.bcvRate.toString(), bcvRate: r.bcvRate.toString() };
  };
}
