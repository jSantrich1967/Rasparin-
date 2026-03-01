"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Bank = { id: string; name: string };
type CreateAction = (formData: FormData) => Promise<{ ok: true } | { ok: false; message: string }>;

export function CardForm({ createAction, banks }: { createAction: CreateAction; banks: Bank[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createAction(formData);
      if (result.ok) {
        toast.success("Tarjeta creada");
        router.refresh();
        form.reset();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row flex-wrap gap-4 items-end">
      <label className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
        <span className="text-sm font-medium text-slate-600">Alias</span>
        <input type="text" name="alias" placeholder="Ej: Visa Principal" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
      </label>
      <label className="flex flex-col gap-1.5 w-full sm:w-auto">
        <span className="text-sm font-medium text-slate-600">Banco</span>
        <select name="bankId" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[160px]">
          <option value="">Selecciona un banco</option>
          {banks.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-600">Límite VES</span>
        <input type="number" name="creditLimitVES" step="0.01" min="0" defaultValue="0" className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-28 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-600">Saldo apertura VES</span>
        <input type="number" name="openingBalanceVES" step="0.01" defaultValue="0" className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-28 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
      </label>
      <button type="submit" disabled={isPending} className="btn-primary shrink-0">
        {isPending ? "Guardando…" : "Añadir"}
      </button>
    </form>
  );
}
