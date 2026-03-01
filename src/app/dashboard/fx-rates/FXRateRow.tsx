"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatVES } from "@/lib/money";

type FXRate = {
  id: string;
  date: Date;
  bcvRate: { toString(): string };
};

type DeleteAction = (id: string) => Promise<{ ok: true } | { ok: false; message: string }>;

export function FXRateRow({ rate, deleteAction }: { rate: FXRate; deleteAction: DeleteAction }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm("¿Eliminar esta tasa BCV?")) return;
    startTransition(async () => {
      const result = await deleteAction(rate.id);
      if (result.ok) {
        toast.success("Tasa BCV eliminada");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <li className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 sm:px-5 py-3 sm:py-4 hover:bg-slate-50/50 transition-colors">
      <span className="font-mono text-slate-700">{new Date(rate.date).toISOString().slice(0, 10)}</span>
      <div className="flex gap-3 items-center">
        <span className="font-medium text-slate-900">{formatVES(rate.bcvRate.toString())} VES/USD</span>
        <button type="button" onClick={handleDelete} disabled={isPending} className="btn-danger">Eliminar</button>
      </div>
    </li>
  );
}
