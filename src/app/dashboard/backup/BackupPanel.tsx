"use client";

import { useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export function BackupPanel() {
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleExport() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/backup");
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(err.error || "Error al exportar");
        }
        const blob = await res.blob();
        const filename = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? `tarjeteando-backup-${new Date().toISOString().slice(0, 10)}.json`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Respaldo exportado correctamente");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al exportar");
      }
    });
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".json")) {
      toast.error("El archivo debe ser JSON");
      return;
    }
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("file", file);
        const res = await fetch("/api/backup", {
          method: "POST",
          body: formData,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Error al importar");
        }
        toast.success("Respaldo restaurado correctamente");
        router.refresh();
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al importar");
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-4 p-4 bg-slate-100 rounded-lg">
      <button
        type="button"
        onClick={handleExport}
        disabled={isPending}
        className="bg-slate-800 text-white px-4 py-2 rounded-md hover:bg-slate-700 disabled:opacity-50 transition font-medium"
      >
        {isPending ? "Procesando…" : "Exportar respaldo"}
      </button>
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          disabled={isPending}
          className="hidden"
          id="backup-file"
        />
        <label
          htmlFor="backup-file"
          className={`inline-block bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 cursor-pointer transition font-medium ${isPending ? "opacity-50 pointer-events-none" : ""}`}
        >
          Importar respaldo
        </label>
        <span className="text-xs text-slate-500">(reemplaza todos los datos)</span>
      </div>
    </div>
  );
}
