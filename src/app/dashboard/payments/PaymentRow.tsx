"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { formatVES } from "@/lib/money";

type Payment = {
  id: string;
  date: Date;
  amountVES: { toString(): string };
  card: { alias: string; bank: { name: string } | null };
  allocations: { amountVESApplied: { toString(): string } }[];
};

type DeleteAction = (id: string) => Promise<{ ok: true } | { ok: false; message: string }>;

export function PaymentRow({ payment, deleteAction }: { payment: Payment; deleteAction: DeleteAction }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const allocated = payment.allocations.reduce((acc, a) => acc + Number(a.amountVESApplied.toString()), 0);
  const remaining = Number(payment.amountVES.toString()) - allocated;

  function handleDelete() {
    if (!confirm("¿Eliminar este pago? Se eliminarán también sus conciliaciones asignadas.")) return;
    startTransition(async () => {
      const result = await deleteAction(payment.id);
      if (result.ok) {
        toast.success("Pago eliminado");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <li className="flex flex-wrap justify-between items-center py-2 border-b border-slate-200 text-sm">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="font-mono">{new Date(payment.date).toISOString().slice(0, 10)}</span>
        <span>{payment.card.alias} ({payment.card.bank?.name})</span>
        <span>{formatVES(payment.amountVES.toString())} VES</span>
        <span className="text-slate-500">Asignado: {formatVES(allocated)}</span>
        <span className={remaining > 0 ? "text-amber-600" : "text-green-600"}>Restante: {formatVES(remaining)}</span>
        <Link href={`/dashboard/reconciliation?payment=${payment.id}`} className="text-slate-600 hover:underline">Conciliar</Link>
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
