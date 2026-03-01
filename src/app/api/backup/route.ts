import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/** Serialize Prisma Decimal to string for JSON */
function serializeRecord(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    if (v && typeof v === "object" && "toFixed" in v) {
      out[k] = (v as { toFixed: (n: number) => string }).toFixed(6);
    } else if (v instanceof Date) {
      out[k] = v.toISOString();
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** GET: Export full backup as JSON */
export async function GET() {
  try {
    const [banks, cards, counterparties, fxRates, operations, payments, allocations] = await Promise.all([
      prisma.bank.findMany({ orderBy: { name: "asc" } }),
      prisma.card.findMany({ orderBy: { alias: "asc" } }),
      prisma.counterparty.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }),
      prisma.fXRate.findMany({ orderBy: { date: "desc" } }),
      prisma.operation.findMany({ orderBy: { date: "asc" } }),
      prisma.payment.findMany({ orderBy: { date: "asc" } }),
      prisma.allocation.findMany(),
    ]);

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        banks: banks.map((r) => serializeRecord(r as unknown as Record<string, unknown>)),
        cards: cards.map((r) => serializeRecord(r as unknown as Record<string, unknown>)),
        counterparties: counterparties.map((r) => serializeRecord(r as unknown as Record<string, unknown>)),
        fxRates: fxRates.map((r) => serializeRecord(r as unknown as Record<string, unknown>)),
        operations: operations.map((r) => serializeRecord(r as unknown as Record<string, unknown>)),
        payments: payments.map((r) => serializeRecord(r as unknown as Record<string, unknown>)),
        allocations: allocations.map((r) => serializeRecord(r as unknown as Record<string, unknown>)),
      },
    };

    const json = JSON.stringify(backup, null, 2);
    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="tarjeteando-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (e) {
    console.error("Backup export error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error al exportar" }, { status: 500 });
  }
}

/** POST: Import backup from JSON */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No se envió ningún archivo" }, { status: 400 });
    }
    const text = await file.text();
    const backup = JSON.parse(text) as {
      version?: number;
      data?: {
        banks?: Record<string, unknown>[];
        cards?: Record<string, unknown>[];
        counterparties?: Record<string, unknown>[];
        fxRates?: Record<string, unknown>[];
        operations?: Record<string, unknown>[];
        payments?: Record<string, unknown>[];
        allocations?: Record<string, unknown>[];
      };
    };

    const data = backup.data;
    if (!data) {
      return NextResponse.json({ error: "Formato de respaldo inválido" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // Delete in reverse dependency order
      await tx.allocation.deleteMany();
      await tx.payment.deleteMany();
      await tx.operation.deleteMany();
      await tx.fXRate.deleteMany();
      await tx.counterparty.deleteMany();
      await tx.card.deleteMany();
      await tx.bank.deleteMany();

      // Insert in dependency order
      if (data.banks?.length) {
        for (const b of data.banks) {
          await tx.bank.create({
            data: {
              id: b.id as string,
              name: b.name as string,
            },
          });
        }
      }
      if (data.cards?.length) {
        for (const c of data.cards) {
          await tx.card.create({
            data: {
              id: c.id as string,
              bankId: c.bankId as string,
              alias: c.alias as string,
              last4: (c.last4 as string) ?? null,
              creditLimitVES: parseFloat(String(c.creditLimitVES ?? 0)),
              openingBalanceVES: parseFloat(String(c.openingBalanceVES ?? 0)),
              status: (c.status as "ACTIVE" | "INACTIVE") ?? "ACTIVE",
            },
          });
        }
      }
      if (data.counterparties?.length) {
        for (const c of data.counterparties) {
          await tx.counterparty.create({
            data: {
              id: c.id as string,
              name: c.name as string,
              type: c.type as "PERSONA" | "COMERCIO",
              contact: (c.contact as string) ?? null,
              notes: (c.notes as string) ?? null,
            },
          });
        }
      }
      if (data.fxRates?.length) {
        for (const f of data.fxRates) {
          const d = new Date(f.date as string);
          d.setUTCHours(0, 0, 0, 0);
          await tx.fXRate.create({
            data: {
              id: f.id as string,
              date: d,
              bcvRate: parseFloat(String(f.bcvRate)),
              source: (f.source as string) ?? "manual",
            },
          });
        }
      }
      if (data.operations?.length) {
        for (const o of data.operations) {
          await tx.operation.create({
            data: {
              id: o.id as string,
              date: new Date(o.date as string),
              cardId: o.cardId as string,
              counterpartyId: o.counterpartyId as string,
              usdCharged: parseFloat(String(o.usdCharged)),
              bankFeePercent: parseFloat(String(o.bankFeePercent ?? 0.015)),
              merchantFeePercent: parseFloat(String(o.merchantFeePercent ?? 0.01)),
              bcvRateOnCharge: parseFloat(String(o.bcvRateOnCharge)),
              notes: (o.notes as string) ?? null,
              status: (o.status as "OPEN" | "SETTLED" | "CANCELLED") ?? "OPEN",
            },
          });
        }
      }
      if (data.payments?.length) {
        for (const p of data.payments) {
          await tx.payment.create({
            data: {
              id: p.id as string,
              date: new Date(p.date as string),
              cardId: p.cardId as string,
              amountVES: parseFloat(String(p.amountVES)),
              bcvRateOnPayment: parseFloat(String(p.bcvRateOnPayment)),
              notes: (p.notes as string) ?? null,
            },
          });
        }
      }
      if (data.allocations?.length) {
        for (const a of data.allocations) {
          await tx.allocation.create({
            data: {
              id: a.id as string,
              paymentId: a.paymentId as string,
              operationId: a.operationId as string,
              amountVESApplied: parseFloat(String(a.amountVESApplied)),
            },
          });
        }
      }
    });

    return NextResponse.json({ ok: true, message: "Respaldo restaurado correctamente" });
  } catch (e) {
    console.error("Backup import error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al importar" },
      { status: 500 }
    );
  }
}
