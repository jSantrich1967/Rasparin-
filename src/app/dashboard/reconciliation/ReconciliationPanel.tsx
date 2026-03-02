"use client";

import { useTransition, useState, useRef, useCallback, useEffect } from "react";
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
  const [totalAssigned, setTotalAssigned] = useState(0);
  const router = useRouter();
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const paymentTotal = paymentDetail ? Number(paymentDetail.amountVES.toString()) : 0;
  const allocatedByOp = new Map<string, number>();
  if (paymentDetail) {
    for (const a of paymentDetail.allocations) {
      allocatedByOp.set(a.operationId, Number(a.amountVESApplied.toString()));
    }
  }

  const updateTotal = useCallback(() => {
    let sum = 0;
    operationsOfCard.forEach((op) => {
      const input = inputRefs.current[op.id];
      if (input) sum += parseFloat(input.value) || 0;
    });
    setTotalAssigned(sum);
  }, [operationsOfCard]);

  useEffect(() => {
    if (operationsOfCard.length > 0) updateTotal();
  }, [operationsOfCard, updateTotal]);

  const handleAssignClick = useCallback(
    (opId: string, remaining: number) => {
      const input = inputRefs.current[opId];
      if (!input) return;
      let otherTotal = 0;
      operationsOfCard.forEach((o) => {
        if (o.id !== opId) {
          const inp = inputRefs.current[o.id];
          if (inp) otherTotal += parseFloat(inp.value) || 0;
        }
      });
      const paymentRemaining = Math.max(0, paymentTotal - otherTotal);
      const toAssign = Math.min(remaining, paymentRemaining);
      input.value = toAssign.toFixed(2);
      updateTotal();
      input.focus();
    },
    [operationsOfCard, paymentTotal, updateTotal]
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!paymentDetail) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("paymentId", paymentDetail.id);
    // Validar que al menos un monto sea > 0
    const hasAnyAmount = operationsOfCard.some((op) => {
      const val = formData.get(`op_${op.id}`);
      return val && parseFloat(String(val)) > 0;
    });
    if (!hasAnyAmount) {
      toast.error("Ingresa al menos un monto en VES a asignar");
      return;
    }
    startTransition(async () => {
      try {
        const result = await submitAllocations(formData);
        if (result.ok) {
          toast.success("Conciliación guardada");
          router.refresh();
        } else {
          toast.error(result.message);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error de conexión";
        toast.error(`No se pudo guardar: ${msg}`);
        console.error("Reconciliation submit error:", err);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">Seleccionar pago</label>
        <select
          className="rounded-lg border border-white/20 bg-slate-800/50 px-3 py-2.5 text-sm w-full max-w-md text-white focus:border-electric-blue focus:outline-none focus:ring-2 focus:ring-electric-blue/30"
          value={paymentDetail?.id ?? ""}
          onChange={(e) => {
            const id = e.target.value;
            router.push(id ? `/dashboard/reconciliation?payment=${id}` : "/dashboard/reconciliation");
          }}
        >
          <option value="" className="bg-slate-800 text-slate-300">-- Elige un pago --</option>
          {payments.map((p) => (
            <option key={p.id} value={p.id} className="bg-slate-800 text-white">
              {new Date(p.date).toISOString().slice(0, 10)} — {p.card.alias} — {formatVES(p.amountVES.toString())} VES
            </option>
          ))}
        </select>
      </div>

      {paymentDetail && (
        <div className="p-4 sm:p-5 bg-slate-800/40 rounded-xl border border-white/10">
          <p className="font-semibold text-white text-base">
            Pago: {new Date(paymentDetail.date).toISOString().slice(0, 10)} — {paymentDetail.card.alias} — {formatVES(paymentDetail.amountVES.toString())} VES
          </p>
          <p className="text-sm text-slate-300 mt-1">Haz clic en el monto sugerido o escribe uno distinto si hay diferencia.</p>

          <form key={paymentDetail.id} onSubmit={handleSubmit} className="mt-4 space-y-3">
            <input type="hidden" name="paymentId" value={paymentDetail.id} />
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-2 font-medium text-slate-300">Fecha</th>
                    <th className="text-left py-3 px-2 font-medium text-slate-300">Contraparte</th>
                    <th className="text-right py-3 px-2 font-medium text-slate-300">Deuda VES</th>
                    <th className="text-right py-3 px-2 font-medium text-slate-300 hidden sm:table-cell">Ya asignado</th>
                    <th className="text-right py-3 px-2 font-medium text-slate-300">VES a asignar</th>
                  </tr>
                </thead>
                <tbody>
                  {operationsOfCard.map((op) => {
                    const debtVES = calcDebtVES({ usdCharged: op.usdCharged.toString(), bcvRateOnCharge: op.bcvRateOnCharge.toString() });
                    const totalAllocatedToOp = op.allocations.reduce((acc, a) => acc + Number(a.amountVESApplied.toString()), 0);
                    const remaining = Math.max(0, Number(debtVES.toFixed(2)) - totalAllocatedToOp);
                    const currentForThisPayment = allocatedByOp.get(op.id) ?? 0;
                    const suggestedAmount = remaining > 0 ? remaining.toFixed(2) : "";
                    return (
                      <tr key={op.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-2.5 px-2 text-slate-200">{new Date(op.date).toISOString().slice(0, 10)}</td>
                        <td className="py-2.5 px-2 text-white font-medium">{op.counterparty.name}</td>
                        <td className="py-2.5 px-2 text-right text-slate-200">{formatVES(debtVES)}</td>
                        <td className="py-2.5 px-2 text-right text-slate-400 hidden sm:table-cell">{formatVES(currentForThisPayment)}</td>
                        <td className="py-2.5 px-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {remaining > 0 && (
                              <button
                                type="button"
                                onClick={() => handleAssignClick(op.id, remaining)}
                                className="px-2 py-1 rounded-lg bg-electric-blue/20 text-electric-blue text-xs font-semibold hover:bg-electric-blue/30 transition-colors"
                              >
                                {formatVES(remaining)}
                              </button>
                            )}
                            <input
                              ref={(el) => { inputRefs.current[op.id] = el; }}
                              type="number"
                              name={`op_${op.id}`}
                              step="0.01"
                              min="0"
                              inputMode="decimal"
                              defaultValue={currentForThisPayment || ""}
                              placeholder="0"
                              onChange={updateTotal}
                              className="w-24 sm:w-28 rounded-lg border border-white/20 bg-slate-900/50 px-2 py-1.5 text-right text-sm text-white placeholder-slate-500 focus:border-electric-blue focus:outline-none focus:ring-2 focus:ring-electric-blue/30"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {operationsOfCard.length === 0 ? (
              <div className="space-y-1">
                <p className="text-amber-400 text-sm font-medium">No hay operaciones para asignar en esta tarjeta.</p>
                <p className="text-slate-400 text-xs">El pago es de {paymentDetail.card.alias}. Necesitas operaciones OPEN o SETTLED de la misma tarjeta.</p>
              </div>
            ) : (
              <>
                <div className={`flex items-center gap-2 text-sm font-medium ${totalAssigned > paymentTotal ? "text-red-400" : "text-slate-300"}`}>
                  <span>Total asignado:</span>
                  <span>{formatVES(totalAssigned)}</span>
                  <span>/ {formatVES(paymentDetail.amountVES.toString())}</span>
                  {totalAssigned > paymentTotal && <span className="text-xs">(reduce el total)</span>}
                </div>
                <p className="text-slate-400 text-xs">Clic en el monto azul para llenar (se limita al pago disponible). O escribe uno distinto.</p>
              </>
            )}
            <button type="submit" disabled={isPending || operationsOfCard.length === 0 || totalAssigned > paymentTotal} className="btn-primary mt-2">
              {isPending ? "Guardando…" : "Guardar conciliación"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
