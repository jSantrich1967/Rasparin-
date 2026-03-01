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
    <li className="flex justify-between items-center py-2 border-b border-slate-200">
      <span className="font-mono">{new Date(rate.date).toISOString().slice(0, 10)}</span>
      <div className="flex gap-2 items-center">
        <span>{formatVES(rate.bcvRate.toString())} VES/USD</span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="text-red-600 hover:underline text-sm"
        >
          Eliminar
        </button>
      </div>
    </li>
  );
}
