"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Counterparty = { id: string; name: string; type: string; contact: string | null; notes: string | null };

type UpdateAction = (formData: FormData) => Promise<{ ok: true } | { ok: false; message: string }>;
type DeleteAction = (id: string) => Promise<{ ok: true } | { ok: false; message: string }>;

export function CounterpartyRow({
  counterparty,
  updateAction,
  deleteAction,
}: {
  counterparty: Counterparty;
  updateAction: UpdateAction;
  deleteAction: DeleteAction;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("id", counterparty.id);
    startTransition(async () => {
      const result = await updateAction(formData);
      if (result.ok) {
        toast.success("Contraparte actualizada");
        router.refresh();
        setEditing(false);
      } else toast.error(result.message);
    });
  }

  function handleDelete() {
    if (!confirm("¿Eliminar esta contraparte?")) return;
    startTransition(async () => {
      const result = await deleteAction(counterparty.id);
      if (result.ok) {
        toast.success("Contraparte eliminada");
        router.refresh();
      } else toast.error(result.message);
    });
  }

  if (editing) {
    return (
      <li className="px-4 sm:px-5 py-3 sm:py-4 bg-slate-50">
        <form onSubmit={handleUpdate} className="flex flex-col sm:flex-row flex-wrap gap-2 sm:items-center">
          <input type="hidden" name="id" value={counterparty.id} />
          <input type="text" name="name" defaultValue={counterparty.name} required className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-full sm:w-40" />
          <select name="type" defaultValue={counterparty.type} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="PERSONA">Persona</option>
            <option value="COMERCIO">Comercio</option>
          </select>
          <input type="text" name="contact" defaultValue={counterparty.contact ?? ""} className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-32" placeholder="Contacto" />
          <input type="text" name="notes" defaultValue={counterparty.notes ?? ""} className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-32" placeholder="Notas" />
          <div className="flex gap-2">
            <button type="submit" disabled={isPending} className="btn-primary text-sm py-1.5">Guardar</button>
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary text-sm py-1.5">Cancelar</button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 sm:px-5 py-3 sm:py-4 hover:bg-slate-50/50 transition-colors">
      <span className="text-sm">
        <strong className="text-slate-900">{counterparty.name}</strong> <span className="text-slate-500">({counterparty.type})</span>
        {counterparty.contact && <span className="text-slate-600 ml-2">{counterparty.contact}</span>}
      </span>
      <div className="flex gap-3">
        <button type="button" onClick={() => setEditing(true)} className="text-sm text-blue-600 hover:underline">Editar</button>
        <button type="button" onClick={handleDelete} disabled={isPending} className="btn-danger">Eliminar</button>
      </div>
    </li>
  );
}
