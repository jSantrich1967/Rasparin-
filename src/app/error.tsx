"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 sm:p-6">
      <div className="max-w-md w-full text-center rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Algo salió mal</h2>
        <p className="text-slate-600 mb-6 text-sm">{error.message}</p>
        <button onClick={reset} className="btn-primary">Intentar de nuevo</button>
      </div>
    </div>
  );
}
