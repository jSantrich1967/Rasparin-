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
      <motion.li layout className="px-4 sm:px-5 py-3 sm:py-4 bg-slate-50">
        <form onSubmit={handleUpdate} className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input type="hidden" name="id" value={bank.id} />
          <input type="text" name="name" defaultValue={bank.name} required className="rounded-lg border border-slate-200 px-3 py-2 text-sm sm:min-w-[180px]" />
          <div className="flex gap-2">
            <button type="submit" disabled={isPending} className="btn-primary text-sm py-1.5">Guardar</button>
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary text-sm py-1.5">Cancelar</button>
          </div>
        </form>
      </motion.li>
    );
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 sm:px-5 py-3 sm:py-4 hover:bg-white/5 transition-colors"
    >
      <span className="font-medium text-white">{bank.name}</span>
      <div className="flex gap-3">
        <button type="button" onClick={() => setEditing(true)} className="text-sm text-blue-600 hover:underline">Editar</button>
        <button type="button" onClick={handleDelete} disabled={isPending} className="btn-danger">Eliminar</button>
      </div>
    </motion.li>
  );
}
