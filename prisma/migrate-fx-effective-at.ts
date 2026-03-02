/**
 * Migración única: asigna effectiveAt para registros FXRate que tienen date pero no effectiveAt.
 * Si varios comparten la misma fecha, se añade 1 segundo de offset para respetar unique.
 * Ejecutar con: npx tsx prisma/migrate-fx-effective-at.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rates = await prisma.fXRate.findMany({
    where: { effectiveAt: null, date: { not: null } },
    orderBy: { date: "asc" },
  });
  if (rates.length === 0) {
    console.log("No hay registros que migrar.");
    return;
  }
  const used = new Set<number>();
  for (const r of rates) {
    if (r.date) {
      let effectiveAt = new Date(r.date);
      while (used.has(effectiveAt.getTime())) {
        effectiveAt = new Date(effectiveAt.getTime() + 1000);
      }
      used.add(effectiveAt.getTime());
      await prisma.fXRate.update({
        where: { id: r.id },
        data: { effectiveAt },
      });
      console.log(`Migrado: ${r.id} -> effectiveAt = ${effectiveAt.toISOString()}`);
    }
  }
  console.log(`Migración completada: ${rates.length} registros.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
