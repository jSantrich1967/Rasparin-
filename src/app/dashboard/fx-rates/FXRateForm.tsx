"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type CreateAction = (formData: FormData) => Promise<{ ok: true } | { ok: false; message: string }>;

export function FXRateForm({ createAction }: { createAction: CreateAction }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createAction(formData);
      if (result.ok) {
        toast.success("Tasas guardadas");
        router.refresh();
        form.reset();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row flex-wrap gap-4 items-end">
      <label className="flex flex-col gap-1.5 w-full sm:w-auto">
        <span className="text-sm font-medium text-slate-600">Fecha y hora</span>
        <input type="datetime-local" name="effectiveAt" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
      </label>
      <label className="flex flex-col gap-1.5 w-full sm:w-auto">
        <span className="text-sm font-medium text-slate-600">Tasa BCV (VES/USD)</span>
        <input type="number" name="bcvRate" step="0.000001" min="0" required placeholder="36.50" className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-full sm:w-32 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
      </label>
      <label className="flex flex-col gap-1.5 w-full sm:w-auto">
        <span className="text-sm font-medium text-slate-600">Tasa Mercado (VES/USD)</span>
        <input type="number" name="marketRate" step="0.000001" min="0" placeholder="38.00 (paralela)" className="rounded-lg border border-emerald-200 px-3 py-2 text-sm w-full sm:w-36 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-emerald-50/50" title="Tasa paralela para calcular ganancia realizada" />
        <span className="text-[10px] text-slate-500">Opcional • Usada para ganancia</span>
      </label>
      <button type="submit" disabled={isPending} className="btn-primary shrink-0">
        {isPending ? "Guardando…" : "Añadir"}
      </button>
    </form>
  );
}
