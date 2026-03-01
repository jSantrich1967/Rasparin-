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
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end p-4 bg-slate-100 rounded-lg mb-6">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Alias</span>
        <input type="text" name="alias" placeholder="Ej: Visa Principal" required className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Banco</span>
        <select name="bankId" required className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500">
          <option value="">Selecciona un banco</option>
          {banks.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Límite VES</span>
        <input type="number" name="creditLimitVES" step="0.01" min="0" defaultValue="0" className="px-3 py-2 border rounded-md w-28" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Saldo apertura VES</span>
        <input type="number" name="openingBalanceVES" step="0.01" defaultValue="0" className="px-3 py-2 border rounded-md w-28" />
      </label>
      <button type="submit" disabled={isPending} className="bg-slate-800 text-white px-4 py-2 rounded-md hover:bg-slate-700 disabled:opacity-50 transition">
        {isPending ? "Guardando…" : "Añadir"}
      </button>
    </form>
  );
}
