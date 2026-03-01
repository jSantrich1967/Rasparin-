"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { formatVES } from "@/lib/money";

type Card = {
  id: string;
  alias: string;
  last4: string | null;
  creditLimitVES: string;
  openingBalanceVES: string;
  status: string;
  bankName: string;
};
type UpdateAction = (formData: FormData) => Promise<{ ok: true } | { ok: false; message: string }>;
type DeleteAction = (id: string) => Promise<{ ok: true } | { ok: false; message: string }>;

export function CardRow({ card, updateAction, deleteAction }: { card: Card; updateAction: UpdateAction; deleteAction: DeleteAction }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("id", card.id);
    startTransition(async () => {
      const result = await updateAction(formData);
      if (result.ok) {
        toast.success("Tarjeta actualizada");
        router.refresh();
        setEditing(false);
      } else toast.error(result.message);
    });
  }

  function handleDelete() {
    if (!confirm("¿Eliminar esta tarjeta? No se puede si tiene operaciones o pagos.")) return;
    startTransition(async () => {
      const result = await deleteAction(card.id);
      if (result.ok) {
        toast.success("Tarjeta eliminada");
        router.refresh();
      } else toast.error(result.message);
    });
  }

  if (editing) {
    return (
      <motion.li layout className="py-2 border-b border-slate-200">
        <form onSubmit={handleUpdate} className="flex flex-wrap gap-2 items-center">
          <input type="hidden" name="id" value={card.id} />
          <input type="text" name="alias" defaultValue={card.alias} required className="px-2 py-1 border rounded w-36" placeholder="Alias" />
          <input type="number" name="creditLimitVES" step="0.01" min="0" defaultValue={card.creditLimitVES} className="px-2 py-1 border rounded w-24" />
          <input type="number" name="openingBalanceVES" step="0.01" defaultValue={card.openingBalanceVES} className="px-2 py-1 border rounded w-24" />
          <select name="status" defaultValue={card.status} className="px-2 py-1 border rounded">
            <option value="ACTIVE">Activa</option>
            <option value="INACTIVE">Inactiva</option>
          </select>
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
      <span>
        <strong>{card.alias}</strong> <span className="text-slate-500 text-sm">({card.bankName})</span>
        <span className="text-slate-600 text-sm ml-2">Límite: {formatVES(card.creditLimitVES)} — Saldo apertura: {formatVES(card.openingBalanceVES)}</span>
        <span className={`ml-2 text-xs ${card.status === "ACTIVE" ? "text-green-600" : "text-slate-500"}`}>{card.status}</span>
      </span>
      <div className="flex gap-2">
        <button type="button" onClick={() => setEditing(true)} className="text-slate-600 hover:underline text-sm">Editar</button>
        <button type="button" onClick={handleDelete} disabled={isPending} className="text-red-600 hover:underline text-sm">Eliminar</button>
      </div>
    </motion.li>
  );
}
