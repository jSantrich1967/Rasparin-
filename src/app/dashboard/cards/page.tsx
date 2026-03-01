import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { CardForm } from "./CardForm";
import { CardRow } from "./CardRow";
async function createCard(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  "use server";
  const alias = (formData.get("alias") as string)?.trim();
  const bankId = formData.get("bankId") as string;
  const creditLimitVES = formData.get("creditLimitVES") as string;
  const openingBalanceVES = formData.get("openingBalanceVES") as string;
  if (!alias || !bankId) return { ok: false, message: "Alias y banco son obligatorios" };
  const limit = creditLimitVES ? parseFloat(creditLimitVES) : 0;
  const opening = openingBalanceVES ? parseFloat(openingBalanceVES) : 0;
  if (Number.isNaN(limit) || Number.isNaN(opening)) return { ok: false, message: "Límite y saldo deben ser números" };
  try {
    await prisma.card.create({
      data: {
        alias,
        bankId,
        creditLimitVES: limit,
        openingBalanceVES: opening,
      },
    });
    revalidatePath("/dashboard/cards");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Error al crear" };
  }
}

async function updateCard(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  "use server";
  const id = formData.get("id") as string;
  const alias = (formData.get("alias") as string)?.trim();
  const creditLimitVES = formData.get("creditLimitVES") as string;
  const openingBalanceVES = formData.get("openingBalanceVES") as string;
  const status = formData.get("status") as string;
  if (!id || !alias) return { ok: false, message: "ID y alias requeridos" };
  const limit = creditLimitVES ? parseFloat(creditLimitVES) : 0;
  const opening = openingBalanceVES ? parseFloat(openingBalanceVES) : 0;
  if (Number.isNaN(limit) || Number.isNaN(opening)) return { ok: false, message: "Límite y saldo deben ser números" };
  const validStatus = status === "ACTIVE" || status === "INACTIVE" ? status : "ACTIVE";
  try {
    await prisma.card.update({
      where: { id },
      data: { alias, creditLimitVES: limit, openingBalanceVES: opening, status: validStatus },
    });
    revalidatePath("/dashboard/cards");
    revalidatePath("/dashboard/operations");
    revalidatePath("/dashboard/payments");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Error al actualizar" };
  }
}

async function deleteCard(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  "use server";
  if (!id) return { ok: false, message: "ID requerido" };
  try {
    await prisma.card.delete({ where: { id } });
    revalidatePath("/dashboard/cards");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "No se puede eliminar (¿tiene operaciones o pagos?)" };
  }
}

export default async function CardsPage() {
  const cards = await prisma.card.findMany({
    include: { bank: true },
    orderBy: { alias: "asc" },
  });
  const banks = await prisma.bank.findMany({ orderBy: { name: "asc" } });
  return (
    <section className="p-6">
      <h2 className="text-2xl font-bold mb-4">Tarjetas</h2>
      <CardForm createAction={createCard} banks={banks} />
      <ul className="mt-6 space-y-2">
        {cards.map((c) => (
          <CardRow
            key={c.id}
            card={{
              id: c.id,
              alias: c.alias,
              last4: c.last4,
              creditLimitVES: c.creditLimitVES.toString(),
              openingBalanceVES: c.openingBalanceVES.toString(),
              status: c.status,
              bankName: c.bank?.name ?? "",
            }}
            updateAction={updateCard}
            deleteAction={deleteCard}
          />
        ))}
      </ul>
      <p className="mt-4 text-sm">
        <Link href="/dashboard" className="text-slate-600 hover:underline">← Volver al Resumen</Link>
      </p>
    </section>
  );
}
