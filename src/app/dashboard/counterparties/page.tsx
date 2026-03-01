import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { CounterpartyForm } from "./CounterpartyForm";
import { CounterpartyRow } from "./CounterpartyRow";
import { PageSection } from "../PageSection";

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
    <PageSection title="Contrapartes" description="Personas o comercios con los que realizas operaciones.">
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm mb-6">
        <CounterpartyForm createAction={createCounterparty} />
      </div>
      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {list.map((c) => (
          <CounterpartyRow key={c.id} counterparty={c} updateAction={updateCounterparty} deleteAction={deleteCounterparty} />
        ))}
      </ul>
    </PageSection>
  );
}
