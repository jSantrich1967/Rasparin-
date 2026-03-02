"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatVES, formatUSD } from "@/lib/money";
import { PaymentReconciliationForm } from "./PaymentReconciliationForm";

type Payment = {
  id: string;
  date: Date;
  amountVES: { toString(): string };
  bcvRateOnPayment: { toString(): string };
  marketRate: { toString(): string } | null;
  card: { alias: string; bank: { name: string } | null };
  allocations: { operationId: string; amountVESApplied: { toString(): string } }[];
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

type DeleteAction = (id: string) => Promise<{ ok: true } | { ok: false; message: string }>;
type SubmitAllocationsAction = (formData: FormData) => Promise<{ ok: true } | { ok: false; message: string }>;

export function PaymentRow({
  payment,
  operationsOfCard,
  deleteAction,
  submitAllocations,
  defaultExpanded = false,
}: {
  payment: Payment;
  operationsOfCard: Operation[];
  deleteAction: DeleteAction;
  submitAllocations: SubmitAllocationsAction;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const allocated = payment.allocations.reduce((acc, a) => acc + Number(a.amountVESApplied.toString()), 0);
  const remaining = Number(payment.amountVES.toString()) - allocated;

  const amountVES = Number(payment.amountVES.toString());
  const bcvRate = Number(payment.bcvRateOnPayment.toString());
  const marketRate = payment.marketRate ? Number(payment.marketRate.toString()) : null;

  const usdAtBcv = bcvRate > 0 ? amountVES / bcvRate : 0;
  const usdAtMarket = marketRate && marketRate > 0 ? amountVES / marketRate : null;

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
    <li className="flex flex-col gap-3 px-4 sm:px-5 py-3 sm:py-4 hover:bg-white/5 transition-colors">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
        <div className="flex flex-wrap gap-2 items-center text-sm">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
            title={expanded ? "Ocultar conciliación" : "Conciliar"}
          >
            <svg className={`w-5 h-5 transition-transform ${expanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <span className="font-mono text-slate-600">{new Date(payment.date).toISOString().slice(0, 10)}</span>
          <span className="text-white font-medium">{payment.card.alias}</span>
          <span className="text-slate-400">({payment.card.bank?.name})</span>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-electric-blue hover:underline"
          >
            {expanded ? "Ocultar" : "Conciliar"}
          </button>
        </div>
        <button type="button" onClick={handleDelete} disabled={isPending} className="btn-danger shrink-0 self-end sm:self-center">Eliminar</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
        <div className="rounded-lg bg-slate-800/50 px-3 py-2">
          <div className="text-[10px] uppercase text-slate-500 font-medium">VES pagados</div>
          <div className="font-semibold text-white">{formatVES(amountVES)}</div>
        </div>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2">
          <div className="text-[10px] uppercase text-slate-500 font-medium">Tasa BCV</div>
          <div className="font-medium text-slate-300">{bcvRate.toFixed(2)}</div>
        </div>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2">
          <div className="text-[10px] uppercase text-slate-500 font-medium">Tasa mercado</div>
          <div className="font-medium text-slate-300">{marketRate != null ? marketRate.toFixed(2) : "—"}</div>
        </div>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2 border border-electric-blue/30">
          <div className="text-[10px] uppercase text-electric-blue/90 font-medium">USD a BCV</div>
          <div className="font-semibold text-white">{formatUSD(usdAtBcv)}</div>
          <div className="text-[10px] text-slate-500">Pagado a la tarjeta</div>
        </div>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2 border border-emerald-500/30">
          <div className="text-[10px] uppercase text-emerald-500/90 font-medium">USD real (mercado)</div>
          <div className="font-semibold text-white">{usdAtMarket != null ? formatUSD(usdAtMarket) : "—"}</div>
          <div className="text-[10px] text-slate-500">Costo real en dólares</div>
        </div>
        <div className="rounded-lg bg-slate-800/50 px-3 py-2">
          <div className="text-[10px] uppercase text-slate-500 font-medium">Asignado / Restante</div>
          <div className="font-medium text-slate-300">{formatVES(allocated)} / {formatVES(remaining)}</div>
        </div>
      </div>
      {expanded && (
        <PaymentReconciliationForm
          paymentDetail={{
            id: payment.id,
            date: payment.date,
            amountVES: payment.amountVES,
            bcvRateOnPayment: payment.bcvRateOnPayment,
            marketRate: payment.marketRate,
            card: payment.card,
            allocations: payment.allocations,
          }}
          operationsOfCard={operationsOfCard}
          submitAllocations={submitAllocations}
        />
      )}
    </li>
  );
}
