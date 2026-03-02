"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Card = { id: string; alias: string; bank: { name: string } | null };
type Counterparty = { id: string; name: string; type: string };

type CreateAction = (formData: FormData) => Promise<{ ok: true } | { ok: false; message: string }>;

export function OperationForm({
  createAction,
  cards,
  counterparties,
}: {
  createAction: CreateAction;
  cards: Card[];
  counterparties: Counterparty[];
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createAction(formData);
      if (result.ok) {
        toast.success("Operación creada");
        router.refresh();
        form.reset();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row flex-wrap gap-4 items-end">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-600">Fecha</span>
        <input type="date" name="date" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
      </label>
      <label className="flex flex-col gap-1.5 w-full sm:w-auto">
        <span className="text-sm font-medium text-slate-600">Tarjeta</span>
        <select name="cardId" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm min-w-[160px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
          <option value="">Selecciona</option>
          {cards.map((c) => (
            <option key={c.id} value={c.id}>{c.alias} ({c.bank?.name})</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 w-full sm:w-auto">
        <span className="text-sm font-medium text-slate-600">Contraparte</span>
        <select name="counterpartyId" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm min-w-[140px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
          <option value="">Selecciona</option>
          {counterparties.map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-600">USD cargado</span>
        <input type="number" name="usdCharged" step="0.01" min="0" required placeholder="100" className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-24 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-600">% fee banco</span>
        <input type="number" name="bankFeePercent" step="0.001" min="0" max="1" defaultValue="0.015" className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-20 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-600">% fee comercio</span>
        <input type="number" name="merchantFeePercent" step="0.001" min="0" max="1" defaultValue="0.01" className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-20 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-600">Tasa BCV (VES/USD)</span>
        <input type="number" name="bcvRateOnCharge" step="0.000001" min="0" required placeholder="36.5" title="Tasa para convertir USD a VES. Ej: 36.5" className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-24 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        <span className="text-[10px] text-slate-500">Usada para calcular la deuda en VES</span>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-600">Notas</span>
        <input type="text" name="notes" className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-32 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
      </label>
      <button type="submit" disabled={isPending} className="btn-primary shrink-0">
        {isPending ? "Guardando…" : "Añadir"}
      </button>
    </form>
  );
}
