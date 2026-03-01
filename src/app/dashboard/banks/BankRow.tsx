"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

type Bank = { id: string; name: string };
type UpdateAction = (formData: FormData) => Promise<{ ok: true } | { ok: false; message: string }>;
type DeleteAction = (id: string) => Promise<{ ok: true } | { ok: false; message: string }>;

export function BankRow({ bank, updateAction, deleteAction }: { bank: Bank; updateAction: UpdateAction; deleteAction: DeleteAction }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("id", bank.id);
    startTransition(async () => {
      const result = await updateAction(formData);
      if (result.ok) {
        toast.success("Banco actualizado");
        router.refresh();
        setEditing(false);
      } else toast.error(result.message);
    });
  }

  function handleDelete() {
    if (!confirm("¿Eliminar este banco? No se puede si tiene tarjetas.")) return;
    startTransition(async () => {
      const result = await deleteAction(bank.id);
      if (result.ok) {
        toast.success("Banco eliminado");
        router.refresh();
      } else toast.error(result.message);
    });
  }

  if (editing) {
    return (
      <motion.li layout className="flex gap-2 items-center py-2 border-b border-slate-200">
        <form onSubmit={handleUpdate} className="flex gap-2 items-center">
          <input type="hidden" name="id" value={bank.id} />
          <input type="text" name="name" defaultValue={bank.name} required className="px-2 py-1 border rounded w-48" />
          <button type="submit" disabled={isPending} className="bg-slate-700 text-white px-2 py-1 rounded text-sm">Guardar</button>
          <button type="button" onClick={() => setEditing(false)} className="px-2 py-1 rounded border text-sm">Cancelar</button>
        </form>
      </motion.li>
    );
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={{ scale: 1.01 }}
      className="flex justify-between items-center py-2 border-b border-slate-200"
    >
      <span>{bank.name}</span>
      <div className="flex gap-2">
        <button type="button" onClick={() => setEditing(true)} className="text-slate-600 hover:underline text-sm">Editar</button>
        <button type="button" onClick={handleDelete} disabled={isPending} className="text-red-600 hover:underline text-sm">Eliminar</button>
      </div>
    </motion.li>
  );
}
