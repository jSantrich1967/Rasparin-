"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type CreateAction = (formData: FormData) => Promise<{ ok: true } | { ok: false; message: string }>;

export function BankForm({ createAction }: { createAction: CreateAction }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createAction(formData);
      if (result.ok) {
        toast.success("Banco creado");
        router.refresh();
        form.reset();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center mb-6">
      <input
        type="text"
        name="name"
        placeholder="Nuevo banco"
        className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
        required
      />
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
