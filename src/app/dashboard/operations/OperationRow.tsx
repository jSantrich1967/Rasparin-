"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatUSD, formatVES } from "@/lib/money";
import { calcDebtVES } from "@/lib/calc";

type Operation = {
  id: string;
  date: Date;
  usdCharged: { toString(): string };
  bcvRateOnCharge: { toString(): string };
  status: string;
  card: { alias: string; bank: { name: string } | null };
  counterparty: { name: string };
};

type DeleteAction = (id: string) => Promise<{ ok: true } | { ok: false; message: string }>;

export function OperationRow({ operation, deleteAction }: { operation: Operation; deleteAction: DeleteAction }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const debtVES = calcDebtVES({ usdCharged: operation.usdCharged.toString(), bcvRateOnCharge: operation.bcvRateOnCharge.toString() });

  function handleDelete() {
    if (!confirm("¿Eliminar esta operación? No se puede si tiene conciliaciones asignadas.")) return;
    startTransition(async () => {
      const result = await deleteAction(operation.id);
      if (result.ok) {
        toast.success("Operación eliminada");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <li className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 sm:px-5 py-3 sm:py-4 hover:bg-slate-50/50 transition-colors">
      <div className="flex flex-wrap gap-2 items-center text-sm">
        <span className="font-mono text-slate-600">{new Date(operation.date).toISOString().slice(0, 10)}</span>
        <span className="text-slate-900">{operation.card.alias} ({operation.card.bank?.name})</span>
        <span className="text-slate-700">{operation.counterparty.name}</span>
        <span className="font-medium">{formatUSD(operation.usdCharged.toString())}</span>
        <span>{formatVES(debtVES)} VES</span>
        <span className={`font-medium ${operation.status === "OPEN" ? "text-amber-600" : operation.status === "SETTLED" ? "text-emerald-600" : "text-slate-500"}`}>{operation.status}</span>
      </div>
      <button type="button" onClick={handleDelete} disabled={isPending} className="btn-danger shrink-0">Eliminar</button>
    </li>
  );
}
