"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full text-center">
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Algo salió mal</h2>
        <p className="text-slate-600 mb-4 text-sm">{error.message}</p>
        <button
          onClick={reset}
          className="bg-slate-800 text-white px-4 py-2 rounded-md hover:bg-slate-700 transition"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
