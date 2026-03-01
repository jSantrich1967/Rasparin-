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
    <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-center">
      <button
        type="button"
        onClick={handleExport}
        disabled={isPending}
        className="btn-primary"
      >
        {isPending ? "Procesando…" : "Exportar respaldo"}
      </button>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
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
          className={`inline-flex items-center justify-center rounded-lg border border-amber-600 bg-amber-600 px-4 py-2 text-sm font-medium text-white cursor-pointer hover:bg-amber-700 transition-colors ${isPending ? "opacity-50 pointer-events-none" : ""}`}
        >
          Importar respaldo
        </label>
        <span className="text-xs text-slate-500">(reemplaza todos los datos)</span>
      </div>
    </div>
  );
}
