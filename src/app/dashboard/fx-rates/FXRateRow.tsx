"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatVES } from "@/lib/money";

type FXRate = {
  id: string;
  effectiveAt: Date | null;
  date: Date | null;
  bcvRate: { toString(): string };
  marketRate: { toString(): string } | null;
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
    <li className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 sm:px-5 py-3 sm:py-4 hover:bg-white/5 transition-colors">
      <span className="font-mono text-slate-500">
        {(rate.effectiveAt ?? rate.date)
          ? new Date(rate.effectiveAt ?? rate.date!).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" })
          : "—"}
      </span>
      <div className="flex gap-3 items-center flex-wrap">
        <span className="font-medium text-white">{formatVES(rate.bcvRate.toString())} BCV</span>
        {rate.marketRate && <span className="font-medium text-emerald-600">{formatVES(rate.marketRate.toString())} Mercado</span>}
        <button type="button" onClick={handleDelete} disabled={isPending} className="btn-danger">Eliminar</button>
      </div>
    </li>
  );
}
