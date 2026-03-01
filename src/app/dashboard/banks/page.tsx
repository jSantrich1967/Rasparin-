import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { BankForm } from "./BankForm";
import { BankRow } from "./BankRow";

async function createBank(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  "use server";
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { ok: false, message: "Nombre requerido" };
  try {
    await prisma.bank.create({ data: { name } });
    revalidatePath("/dashboard/banks");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Error al crear (¿nombre duplicado?)" };
  }
}

async function updateBank(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  "use server";
  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  if (!id || !name) return { ok: false, message: "ID y nombre requeridos" };
  try {
    await prisma.bank.update({ where: { id }, data: { name } });
    revalidatePath("/dashboard/banks");
    revalidatePath("/dashboard/cards");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Error al actualizar" };
  }
}

async function deleteBank(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  "use server";
  if (!id) return { ok: false, message: "ID requerido" };
  try {
    await prisma.bank.delete({ where: { id } });
    revalidatePath("/dashboard/banks");
    revalidatePath("/dashboard/cards");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "No se puede eliminar (¿tiene tarjetas?)" };
  }
}

export default async function BanksPage() {
  const banks = await prisma.bank.findMany({ orderBy: { name: "asc" } });
  return (
    <section className="p-6">
      <h2 className="text-2xl font-bold mb-4">Bancos</h2>
      <BankForm createAction={createBank} />
      <ul className="mt-6 space-y-2">
        {banks.map((b) => (
          <BankRow key={b.id} bank={b} updateAction={updateBank} deleteAction={deleteBank} />
        ))}
      </ul>
      <p className="mt-4 text-sm">
        <Link href="/dashboard" className="text-slate-600 hover:underline">← Volver al Resumen</Link>
      </p>
    </section>
  );
}
