"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900 mb-2">Error en el panel</h2>
      <p className="text-slate-600 mb-2 text-sm">{error.message}</p>
      <p className="text-xs text-slate-500 mb-4">
        Si el error menciona la base de datos, verifica <code className="font-mono">DATABASE_URL</code> en <code className="font-mono">.env</code>.
      </p>
      <button onClick={reset} className="btn-primary">Intentar de nuevo</button>
    </div>
  );
}
