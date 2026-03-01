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
    <li className="flex flex-wrap justify-between items-center py-2 border-b border-slate-200 text-sm">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="font-mono">{new Date(operation.date).toISOString().slice(0, 10)}</span>
        <span>{operation.card.alias} ({operation.card.bank?.name})</span>
        <span>{operation.counterparty.name}</span>
        <span>{formatUSD(operation.usdCharged.toString())}</span>
        <span>{formatVES(debtVES)} VES</span>
        <span className={`font-medium ${operation.status === "OPEN" ? "text-amber-600" : operation.status === "SETTLED" ? "text-green-600" : "text-slate-500"}`}>{operation.status}</span>
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="text-red-600 hover:underline text-sm"
      >
        Eliminar
      </button>
    </li>
  );
}
