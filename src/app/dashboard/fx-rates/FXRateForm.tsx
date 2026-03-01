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
        toast.success("Tasa BCV guardada");
        router.refresh();
        form.reset();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Fecha</span>
        <input
          type="date"
          name="date"
          required
          className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Tasa BCV (VES/USD)</span>
        <input
          type="number"
          name="bcvRate"
          step="0.000001"
          min="0"
          required
          placeholder="36.50"
          className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 w-32"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="bg-slate-800 text-white px-4 py-2 rounded-md hover:bg-slate-700 disabled:opacity-50 transition"
      >
        {isPending ? "Guardando…" : "Añadir"}
      </button>
    </form>
  );
}
