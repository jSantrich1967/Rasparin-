"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="bg-slate-50">
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
          <div className="max-w-md w-full text-center rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Error crítico</h2>
            <p className="text-slate-600 mb-6 text-sm">{error.message}</p>
            <button onClick={reset} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition">Intentar de nuevo</button>
          </div>
        </div>
      </body>
    </html>
  );
}
