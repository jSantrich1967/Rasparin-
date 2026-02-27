import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const [banks, cards, opsOpen] = await Promise.all([
    prisma.bank.count(),
    prisma.card.count(),
    prisma.operation.count({ where: { status: "OPEN" } }),
  ]);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-sm text-gray-500 mt-1">MVP — KPIs básicos (en construcción)</p>

      <div className="grid gap-4 mt-6 md:grid-cols-3">
        <div className="rounded-xl border p-4">
          <div className="text-sm text-gray-500">Bancos</div>
          <div className="text-2xl font-semibold">{banks}</div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-sm text-gray-500">Tarjetas</div>
          <div className="text-2xl font-semibold">{cards}</div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-sm text-gray-500">Operaciones OPEN</div>
          <div className="text-2xl font-semibold">{opsOpen}</div>
        </div>
      </div>
    </main>
  );
}
