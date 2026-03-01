"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatVES } from "@/lib/money";
import { calcDebtVES } from "@/lib/calc";

type Payment = {
  id: string;
  date: Date;
  amountVES: { toString(): string };
  card: { alias: string; bank: { name: string } | null };
};

type Operation = {
  id: string;
  date: Date;
  usdCharged: { toString(): string };
  bcvRateOnCharge: { toString(): string };
  counterparty: { name: string };
  status: string;
  allocations: { amountVESApplied: { toString(): string }; paymentId: string }[];
};

type Allocation = {
  operationId: string;
  amountVESApplied: { toString(): string };
  operation: { counterparty: { name: string }; date: Date };
};

type PaymentDetail = {
  id: string;
  date: Date;
  amountVES: { toString(): string };
  bcvRateOnPayment: { toString(): string };
  card: { alias: string; bank: { name: string } | null };
  allocations: Allocation[];
};

type SubmitAction = (formData: FormData) => Promise<{ ok: true } | { ok: false; message: string }>;

export function ReconciliationPanel({
  payments,
  paymentDetail,
  operationsOfCard,
  submitAllocations,
}: {
  payments: Payment[];
  paymentDetail: PaymentDetail | null;
  operationsOfCard: Operation[];
  submitAllocations: SubmitAction;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!paymentDetail) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("paymentId", paymentDetail.id);
    startTransition(async () => {
      const result = await submitAllocations(formData);
      if (result.ok) {
        toast.success("Conciliación guardada");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  const paymentTotal = paymentDetail ? Number(paymentDetail.amountVES.toString()) : 0;
  const allocatedByOp = new Map<string, number>();
  if (paymentDetail) {
    for (const a of paymentDetail.allocations) {
      allocatedByOp.set(a.operationId, Number(a.amountVESApplied.toString()));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Seleccionar pago</label>
        <select
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-full max-w-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          value={paymentDetail?.id ?? ""}
          onChange={(e) => {
            const id = e.target.value;
            router.push(id ? `/dashboard/reconciliation?payment=${id}` : "/dashboard/reconciliation");
          }}
        >
          <option value="">-- Elige un pago --</option>
          {payments.map((p) => (
            <option key={p.id} value={p.id}>
              {new Date(p.date).toISOString().slice(0, 10)} — {p.card.alias} — {formatVES(p.amountVES.toString())} VES
            </option>
          ))}
        </select>
      </div>

      {paymentDetail && (
        <div className="p-4 sm:p-5 bg-slate-50 rounded-xl border border-slate-200">
          <p className="font-medium text-slate-900">
            Pago: {new Date(paymentDetail.date).toISOString().slice(0, 10)} — {paymentDetail.card.alias} — {formatVES(paymentDetail.amountVES.toString())} VES
          </p>
          <p className="text-sm text-slate-600 mt-1">Asigna montos a cada operación. Total asignado no puede superar el monto del pago.</p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <input type="hidden" name="paymentId" value={paymentDetail.id} />
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-2 font-medium text-slate-600">Fecha</th>
                    <th className="text-left py-3 px-2 font-medium text-slate-600">Contraparte</th>
                    <th className="text-right py-3 px-2 font-medium text-slate-600">Deuda VES</th>
                    <th className="text-right py-3 px-2 font-medium text-slate-600 hidden sm:table-cell">Ya asignado</th>
                    <th className="text-right py-3 px-2 font-medium text-slate-600">VES a asignar</th>
                  </tr>
                </thead>
                <tbody>
                  {operationsOfCard.map((op) => {
                    const debtVES = calcDebtVES({ usdCharged: op.usdCharged.toString(), bcvRateOnCharge: op.bcvRateOnCharge.toString() });
                    const totalAllocatedToOp = op.allocations.reduce((acc, a) => acc + Number(a.amountVESApplied.toString()), 0);
                    const remaining = Math.max(0, Number(debtVES.toFixed(2)) - totalAllocatedToOp);
                    const currentForThisPayment = allocatedByOp.get(op.id) ?? 0;
                    return (
                      <tr key={op.id} className="border-b border-slate-100">
                        <td className="py-2 px-2">{new Date(op.date).toISOString().slice(0, 10)}</td>
                        <td className="py-2 px-2">{op.counterparty.name}</td>
                        <td className="py-2 px-2 text-right">{formatVES(debtVES)}</td>
                        <td className="py-2 px-2 text-right hidden sm:table-cell">{formatVES(currentForThisPayment)}</td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            name={`op_${op.id}`}
                            step="0.01"
                            min="0"
                            max={remaining}
                            defaultValue={currentForThisPayment || ""}
                            placeholder="0"
                            className="w-20 sm:w-24 rounded-lg border border-slate-200 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {operationsOfCard.length === 0 && (
              <p className="text-slate-500 text-sm">No hay operaciones OPEN/SETTLED en esta tarjeta para asignar.</p>
            )}
            <button type="submit" disabled={isPending || operationsOfCard.length === 0} className="btn-primary mt-2">
              {isPending ? "Guardando…" : "Guardar conciliación"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
