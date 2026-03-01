"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Card = { id: string; alias: string; bank: { name: string } | null };
type CreateAction = (formData: FormData) => Promise<{ ok: true } | { ok: false; message: string }>;

export function PaymentForm({ createAction, cards }: { createAction: CreateAction; cards: Card[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createAction(formData);
      if (result.ok) {
        toast.success("Pago registrado");
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
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-600">Monto VES</span>
        <input type="number" name="amountVES" step="0.01" min="0" required placeholder="1000" className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-28 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-600">Tasa BCV al pago</span>
        <input type="number" name="bcvRateOnPayment" step="0.000001" min="0" required placeholder="36.5" className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-24 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
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
