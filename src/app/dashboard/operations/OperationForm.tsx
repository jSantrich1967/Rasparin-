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
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end p-4 bg-slate-100 rounded-lg">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Fecha</span>
        <input type="date" name="date" required className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Tarjeta</span>
        <select name="cardId" required className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 min-w-[160px]">
          <option value="">Selecciona</option>
          {cards.map((c) => (
            <option key={c.id} value={c.id}>{c.alias} ({c.bank?.name})</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Contraparte</span>
        <select name="counterpartyId" required className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 min-w-[140px]">
          <option value="">Selecciona</option>
          {counterparties.map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">USD cargado</span>
        <input type="number" name="usdCharged" step="0.01" min="0" required placeholder="100" className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 w-24" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">% fee banco</span>
        <input type="number" name="bankFeePercent" step="0.001" min="0" max="1" defaultValue="0.015" placeholder="1.5%" className="px-3 py-2 border rounded-md w-20" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">% fee comercio</span>
        <input type="number" name="merchantFeePercent" step="0.001" min="0" max="1" defaultValue="0.01" placeholder="1%" className="px-3 py-2 border rounded-md w-20" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Tasa BCV al cargo</span>
        <input type="number" name="bcvRateOnCharge" step="0.000001" min="0" required placeholder="36.5" className="px-3 py-2 border rounded-md w-24" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Notas</span>
        <input type="text" name="notes" className="px-3 py-2 border rounded-md w-32" />
      </label>
      <button type="submit" disabled={isPending} className="bg-slate-800 text-white px-4 py-2 rounded-md hover:bg-slate-700 disabled:opacity-50 transition">
        {isPending ? "Guardando…" : "Añadir"}
      </button>
    </form>
  );
}
