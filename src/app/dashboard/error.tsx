"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-slate-800 mb-2">Error en el panel</h2>
      <p className="text-slate-600 mb-4 text-sm">
        {error.message}
      </p>
      <p className="text-xs text-slate-500 mb-4">
        Si el error menciona la base de datos, verifica que <code className="font-mono">DATABASE_URL</code> esté configurado en <code className="font-mono">.env</code>.
      </p>
      <button
        onClick={reset}
        className="bg-slate-800 text-white px-4 py-2 rounded-md hover:bg-slate-700 transition"
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
