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
    <li className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 sm:px-5 py-3 sm:py-4 hover:bg-white/5 transition-colors">
      <div className="flex flex-wrap gap-2 items-center text-sm">
        <span className="font-mono text-slate-600">{new Date(payment.date).toISOString().slice(0, 10)}</span>
        <span className="text-white">{payment.card.alias} ({payment.card.bank?.name})</span>
        <span className="font-medium">{formatVES(payment.amountVES.toString())} VES</span>
        <span className="text-slate-500">Asignado: {formatVES(allocated)}</span>
        <span className={remaining > 0 ? "text-amber-600" : "text-emerald-600"}>Restante: {formatVES(remaining)}</span>
        <Link href={`/dashboard/reconciliation?payment=${payment.id}`} className="text-blue-600 hover:underline">Conciliar</Link>
      </div>
      <button type="button" onClick={handleDelete} disabled={isPending} className="btn-danger shrink-0">Eliminar</button>
    </li>
  );
}
