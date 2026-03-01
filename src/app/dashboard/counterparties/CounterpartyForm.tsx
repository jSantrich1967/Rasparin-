"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type CreateAction = (formData: FormData) => Promise<{ ok: true } | { ok: false; message: string }>;

export function CounterpartyForm({ createAction }: { createAction: CreateAction }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createAction(formData);
      if (result.ok) {
        toast.success("Contraparte creada");
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
        <span className="text-sm text-slate-600">Nombre</span>
        <input type="text" name="name" required className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Tipo</span>
        <select name="type" className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500">
          <option value="PERSONA">Persona</option>
          <option value="COMERCIO">Comercio</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Contacto</span>
        <input type="text" name="contact" className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Notas</span>
        <input type="text" name="notes" className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500" />
      </label>
      <button type="submit" disabled={isPending} className="bg-slate-800 text-white px-4 py-2 rounded-md hover:bg-slate-700 disabled:opacity-50 transition">
        {isPending ? "Guardando…" : "Añadir"}
      </button>
    </form>
  );
}
