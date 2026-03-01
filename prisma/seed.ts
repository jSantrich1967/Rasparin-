import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create a sample bank
  const bank = await prisma.bank.upsert({
    where: { name: "Banco Demo" },
    update: {},
    create: { name: "Banco Demo" },
  });

  // Create a sample card if none exists for this bank
  let card = await prisma.card.findFirst({ where: { bankId: bank.id, alias: "Visa Demo" } });
  if (!card) {
    card = await prisma.card.create({
      data: {
        bankId: bank.id,
        alias: "Visa Demo",
        creditLimitVES: 10000,
        openingBalanceVES: 0,
      },
    });
  }

  // Create counterparties
  const cp1 = await prisma.counterparty.upsert({
    where: { name_type: { name: "Juan Pérez", type: "PERSONA" } },
    update: {},
    create: { name: "Juan Pérez", type: "PERSONA", contact: "0414-1234567" },
  });
  const cp2 = await prisma.counterparty.upsert({
    where: { name_type: { name: "Comercio ABC", type: "COMERCIO" } },
    update: {},
    create: { name: "Comercio ABC", type: "COMERCIO" },
  });

  // Create FX rate for today
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  await prisma.fXRate.upsert({
    where: { date: today },
    update: { bcvRate: 36.5 },
    create: { date: today, bcvRate: 36.5, source: "seed" },
  });

  // Optional: one sample operation
  const op = await prisma.operation.findFirst({ where: { cardId: card.id } });
  if (!op) {
    await prisma.operation.create({
      data: {
        date: new Date(),
        cardId: card.id,
        counterpartyId: cp1.id,
        usdCharged: 100,
        bankFeePercent: 0.015,
        merchantFeePercent: 0.01,
        bcvRateOnCharge: 36.5,
        notes: "Operación de ejemplo (seed)",
      },
    });
  }

  console.log("Seed completado: Banco Demo, tarjeta Visa Demo, contrapartes, tasa BCV y opción de operación.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
