export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
      <div className="max-w-xl w-full px-4">
        <h1 className="text-3xl font-bold mb-4">
          Rasparin - Salpicadero
        </h1>
        <p className="text-sm text-slate-300 mb-6">
          Bienvenido al panel de control de Rasparina.
        </p>
        <a
          href="/dashboard"
          className="inline-block bg-white text-slate-950 px-4 py-2 rounded-md font-medium text-sm hover:bg-slate-200 transition-colors"
        >
          Ir al Panel de Control
        </a>
      </div>
    </main>
  );
}
