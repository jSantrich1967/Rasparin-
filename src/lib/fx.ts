import { prisma } from "@/lib/prisma";

/** Returns the most recent BCV rate in the system. */
export async function getLatestBcvRate(): Promise<{ bcvRate: string; date: Date } | null> {
  const rate = await prisma.fXRate.findFirst({
    orderBy: { date: "desc" },
  });
  if (!rate) return null;
  return { bcvRate: rate.bcvRate.toString(), date: rate.date };
}

/**
 * Returns the latest BCV rate with date <= the given date (normalized to start of day).
 * Used for unrealized profit: value OPEN operations at "last known rate" for that date.
 */
export async function getLastBcvRateForDate(date: Date): Promise<{ bcvRate: string } | null> {
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);

  const rate = await prisma.fXRate.findFirst({
    where: { date: { lte: dayStart } },
    orderBy: { date: "desc" },
  });
  if (!rate) return null;
  return { bcvRate: rate.bcvRate.toString() };
}
