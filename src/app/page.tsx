import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-lg w-full text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
          Tarjeteando
        </h1>
        <p className="text-slate-300 text-base sm:text-lg mb-8 leading-relaxed">
          Control de cash advance indirecto (USD → VES) por tarjeta. Gestiona bancos, operaciones, pagos y conciliaciones en un solo lugar.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-slate-900 px-6 py-3 font-semibold text-sm hover:bg-slate-100 transition-all shadow-lg hover:shadow-xl"
        >
          Ir al Panel de Control
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </main>
  );
}
