"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
type Balance = {
  totalDebtVES: number;
  totalPaymentsVES: number;
  usedVES: number;
  availableVES: number;
};
type UpdateAction = (formData: FormData) => Promise<{ ok: true } | { ok: false; message: string }>;
type DeleteAction = (id: string) => Promise<{ ok: true } | { ok: false; message: string }>;

export function CardRow({
  card,
  balance,
  updateAction,
  deleteAction,
}: {
  card: Card;
  balance: Balance;
  updateAction: UpdateAction;
  deleteAction: DeleteAction;
}) {
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
      <motion.li layout className="px-4 sm:px-5 py-3 sm:py-4 bg-slate-50">
        <form onSubmit={handleUpdate} className="flex flex-col sm:flex-row flex-wrap gap-2 sm:items-center">
          <input type="hidden" name="id" value={card.id} />
          <input type="text" name="alias" defaultValue={card.alias} required className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-full sm:w-40" placeholder="Alias" />
          <input type="number" name="creditLimitVES" step="0.01" min="0" defaultValue={card.creditLimitVES} className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-28" />
          <input type="number" name="openingBalanceVES" step="0.01" defaultValue={card.openingBalanceVES} className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-28" />
          <select name="status" defaultValue={card.status} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="ACTIVE">Activa</option>
            <option value="INACTIVE">Inactiva</option>
          </select>
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
      <span className="text-sm flex flex-wrap items-center gap-x-3 gap-y-1">
        <strong className="text-white">{card.alias}</strong>
        <span className="text-slate-400">({card.bankName})</span>
        <span className="text-slate-400">|</span>
        <span title={`Apertura + Ops (${formatVES(balance.totalDebtVES)}) − Pagos (${formatVES(balance.totalPaymentsVES)}) = Deuda`}>
          <span className="text-slate-400">Límite</span>
          <span className="ml-1 font-semibold text-electric-blue">{formatVES(card.creditLimitVES)}</span>
        </span>
        <span>
          <span className="text-slate-400">Deuda</span>
          <span className="ml-1 font-semibold text-amber-400">{formatVES(balance.usedVES)}</span>
        </span>
        <span>
          <span className="text-slate-400">Disponible</span>
          <span className={`ml-1 font-semibold ${balance.availableVES >= 0 ? "text-emerald-accent" : "text-red-400"}`}>
            {formatVES(balance.availableVES)}
          </span>
        </span>
        <Link href={`/dashboard/operations?card=${card.id}`} className="text-electric-blue hover:underline font-medium">Ver ops</Link>
        {balance.usedVES > parseFloat(card.creditLimitVES) && (
          <span className="text-amber-400 font-medium" title="La deuda supera el límite. Revisa operaciones o saldo apertura.">
            ⚠ Sobrelímite
          </span>
        )}
        <span className={`text-xs font-medium ${card.status === "ACTIVE" ? "text-emerald-accent" : "text-slate-500"}`}>{card.status}</span>
      </span>
      <div className="flex gap-3">
        <button type="button" onClick={() => setEditing(true)} className="text-sm text-blue-600 hover:underline">Editar</button>
        <button type="button" onClick={handleDelete} disabled={isPending} className="btn-danger">Eliminar</button>
      </div>
    </motion.li>
  );
}
