"use client";

import { useTransition, useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatVES } from "@/lib/money";
import { calcDebtVES } from "@/lib/calc";

type Operation = {
  id: string;
  date: Date;
  usdCharged: { toString(): string };
  bcvRateOnCharge: { toString(): string };
  counterparty: { name: string };
  status: string;
  allocations: { amountVESApplied: { toString(): string }; paymentId: string }[];
};

type PaymentDetail = {
  id: string;
  date: Date;
  amountVES: { toString(): string };
  bcvRateOnPayment: { toString(): string };
  marketRate: { toString(): string } | null;
  card: { alias: string; bank: { name: string } | null };
  allocations: { operationId: string; amountVESApplied: { toString(): string } }[];
};

type SubmitAction = (formData: FormData) => Promise<{ ok: true } | { ok: false; message: string }>;

export function PaymentReconciliationForm({
  paymentDetail,
  operationsOfCard,
  submitAllocations,
}: {
  paymentDetail: PaymentDetail;
  operationsOfCard: Operation[];
  submitAllocations: SubmitAction;
}) {
  const [isPending, startTransition] = useTransition();
  const [totalAssigned, setTotalAssigned] = useState(0);
  const router = useRouter();
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const paymentTotal = Number(paymentDetail.amountVES.toString());
  const allocatedByOp = new Map<string, number>();
  for (const a of paymentDetail.allocations) {
    allocatedByOp.set(a.operationId, Number(a.amountVESApplied.toString()));
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
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("paymentId", paymentDetail.id);
    const hasAnyAmount = operationsOfCard.some((op) => {
      const val = formData.get(`op_${op.id}`);
      return val && parseFloat(String(val)) > 0;
    });
    if (!hasAnyAmount) {
      toast.error("Ingresa al menos un monto en VES a asignar");
      return;
    }
    const marketRateVal = formData.get("marketRate") as string;
    const marketRateNum = marketRateVal ? parseFloat(marketRateVal) : NaN;
    if (!Number.isFinite(marketRateNum) || marketRateNum <= 0) {
      toast.error("Ingresa la tasa de mercado (paralela) para calcular la ganancia");
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
      }
    });
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm font-semibold text-white">Bolívares del pago:</span>
        <span className="text-lg font-bold text-electric-blue">{formatVES(paymentDetail.amountVES.toString())} VES</span>
      </div>
      <p className="text-sm text-slate-300 mb-2">
        Asigna montos en <strong>VES</strong> a operaciones de {paymentDetail.card.alias}. Clic en el monto azul o escribe.
      </p>
      <form key={paymentDetail.id} onSubmit={handleSubmit} className="space-y-3">
        <input type="hidden" name="paymentId" value={paymentDetail.id} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[400px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-2 font-medium text-slate-400">Fecha</th>
                <th className="text-left py-2 px-2 font-medium text-slate-400">Contraparte</th>
                <th className="text-right py-2 px-2 font-medium text-slate-400">Deuda (VES)</th>
                <th className="text-right py-2 px-2 font-medium text-slate-400">VES a asignar</th>
              </tr>
            </thead>
            <tbody>
              {operationsOfCard.map((op) => {
                const debtVES = calcDebtVES({ usdCharged: op.usdCharged.toString(), bcvRateOnCharge: op.bcvRateOnCharge.toString() });
                const totalAllocatedToOp = op.allocations.reduce((acc, a) => acc + Number(a.amountVESApplied.toString()), 0);
                const remaining = Math.max(0, Number(debtVES.toFixed(2)) - totalAllocatedToOp);
                const currentForThisPayment = allocatedByOp.get(op.id) ?? 0;
                return (
                  <tr key={op.id} className="border-b border-white/5">
                    <td className="py-2 px-2 text-slate-400 font-mono text-xs">{new Date(op.date).toISOString().slice(0, 10)}</td>
                    <td className="py-2 px-2 text-white">{op.counterparty.name}</td>
                    <td className="py-2 px-2 text-right text-slate-300">{formatVES(debtVES)}</td>
                    <td className="py-2 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {remaining > 0 && (
                          <button
                            type="button"
                            onClick={() => handleAssignClick(op.id, remaining)}
                            className="px-2 py-0.5 rounded bg-electric-blue/20 text-electric-blue text-xs font-semibold hover:bg-electric-blue/30"
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
                          className="w-24 rounded border border-white/20 bg-slate-900/50 px-2 py-1 text-right text-sm text-white"
                        />
                        <span className="text-[10px] text-slate-500">VES</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {operationsOfCard.length === 0 ? (
          <p className="text-amber-400 text-sm">No hay operaciones OPEN/SETTLED en esta tarjeta.</p>
        ) : (
          <>
            <div className={`flex flex-wrap items-center gap-2 text-sm ${totalAssigned > paymentTotal ? "text-red-400" : "text-slate-300"}`}>
              <span>Total:</span>
              <span>{formatVES(totalAssigned)}</span>
              <span>/ {formatVES(paymentDetail.amountVES.toString())} VES</span>
              <label className="flex items-center gap-2 ml-2">
                <span className="text-slate-400">Tasa mercado:</span>
                <input
                  type="number"
                  name="marketRate"
                  step="0.000001"
                  min="0.000001"
                  required
                  defaultValue={paymentDetail.marketRate ? paymentDetail.marketRate.toString() : ""}
                  placeholder="38.50"
                  className="w-20 rounded border border-white/20 bg-slate-900/50 px-2 py-1 text-right text-sm text-white"
                />
              </label>
            </div>
            <button type="submit" disabled={isPending || totalAssigned > paymentTotal} className="btn-primary text-sm py-1.5 px-3">
              {isPending ? "Guardando…" : "Guardar conciliación"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
