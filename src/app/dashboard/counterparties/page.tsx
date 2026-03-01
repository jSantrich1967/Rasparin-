import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { CounterpartyForm } from "./CounterpartyForm";
import { CounterpartyRow } from "./CounterpartyRow";

async function createCounterparty(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  "use server";
  const name = (formData.get("name") as string)?.trim();
  const type = formData.get("type") as string;
  const contact = (formData.get("contact") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  if (!name || (type !== "PERSONA" && type !== "COMERCIO")) return { ok: false, message: "Nombre y tipo son obligatorios" };
  try {
    await prisma.counterparty.create({ data: { name, type: type as "PERSONA" | "COMERCIO", contact, notes } });
    revalidatePath("/dashboard/counterparties");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Error al guardar (¿nombre+tipo duplicado?)" };
  }
}

async function updateCounterparty(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  "use server";
  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  const type = formData.get("type") as string;
  const contact = (formData.get("contact") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  if (!id || !name || (type !== "PERSONA" && type !== "COMERCIO")) return { ok: false, message: "Datos inválidos" };
  try {
    await prisma.counterparty.update({
      where: { id },
      data: { name, type: type as "PERSONA" | "COMERCIO", contact, notes },
    });
    revalidatePath("/dashboard/counterparties");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Error al actualizar" };
  }
}

async function deleteCounterparty(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  "use server";
  if (!id) return { ok: false, message: "ID requerido" };
  try {
    await prisma.counterparty.delete({ where: { id } });
    revalidatePath("/dashboard/counterparties");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "No se puede eliminar (¿tiene operaciones?)" };
  }
}

export default async function CounterpartiesPage() {
  const list = await prisma.counterparty.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] });
  return (
    <section className="p-6">
      <h2 className="text-2xl font-bold mb-4">Contrapartes</h2>
      <p className="text-sm text-slate-600 mb-4">Personas o comercios con los que realizas operaciones.</p>
      <CounterpartyForm createAction={createCounterparty} />
      <ul className="mt-6 space-y-2">
        {list.map((c) => (
          <CounterpartyRow
            key={c.id}
            counterparty={c}
            updateAction={updateCounterparty}
            deleteAction={deleteCounterparty}
          />
        ))}
      </ul>
      <p className="mt-4 text-sm">
        <Link href="/dashboard" className="text-slate-600 hover:underline">← Volver al Resumen</Link>
      </p>
    </section>
  );
}
