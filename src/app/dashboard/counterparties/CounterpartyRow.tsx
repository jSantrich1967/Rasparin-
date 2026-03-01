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
      <li className="flex flex-wrap gap-2 items-center py-2 border-b border-slate-200">
        <form onSubmit={handleUpdate} className="flex flex-wrap gap-2 items-center">
          <input type="hidden" name="id" value={counterparty.id} />
          <input type="text" name="name" defaultValue={counterparty.name} required className="px-2 py-1 border rounded w-40" />
          <select name="type" defaultValue={counterparty.type} className="px-2 py-1 border rounded">
            <option value="PERSONA">Persona</option>
            <option value="COMERCIO">Comercio</option>
          </select>
          <input type="text" name="contact" defaultValue={counterparty.contact ?? ""} className="px-2 py-1 border rounded w-32" placeholder="Contacto" />
          <input type="text" name="notes" defaultValue={counterparty.notes ?? ""} className="px-2 py-1 border rounded w-32" placeholder="Notas" />
          <button type="submit" disabled={isPending} className="bg-slate-700 text-white px-2 py-1 rounded text-sm">Guardar</button>
          <button type="button" onClick={() => setEditing(false)} className="px-2 py-1 rounded border text-sm">Cancelar</button>
        </form>
      </li>
    );
  }

  return (
    <li className="flex justify-between items-center py-2 border-b border-slate-200">
      <span>
        <strong>{counterparty.name}</strong> <span className="text-slate-500 text-sm">({counterparty.type})</span>
        {counterparty.contact && <span className="text-slate-600 text-sm ml-2">{counterparty.contact}</span>}
      </span>
      <div className="flex gap-2">
        <button type="button" onClick={() => setEditing(true)} className="text-slate-600 hover:underline text-sm">Editar</button>
        <button type="button" onClick={handleDelete} disabled={isPending} className="text-red-600 hover:underline text-sm">Eliminar</button>
      </div>
    </li>
  );
}
