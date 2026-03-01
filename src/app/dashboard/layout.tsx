import Link from "next/link";
import { ReactNode } from "react";

export default function DashboardLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-900">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-950 text-slate-50 flex flex-col hidden sm:flex">
                <div className="p-6 border-b border-slate-800">
                    <h2 className="text-xl font-bold tracking-tight">Tarjeteando</h2>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <Link
                        href="/dashboard"
                        className="block py-2 px-3 rounded-md hover:bg-slate-800 transition-colors"
                    >
                        Resumen
                    </Link>
                    <Link
                        href="/dashboard/banks"
                        className="block py-2 px-3 rounded-md hover:bg-slate-800 transition-colors"
                    >
                        Bancos
                    </Link>
                    <Link
                        href="/dashboard/cards"
                        className="block py-2 px-3 rounded-md hover:bg-slate-800 transition-colors"
                    >
                        Tarjetas
                    </Link>
                    <Link
                        href="/dashboard/fx-rates"
                        className="block py-2 px-3 rounded-md hover:bg-slate-800 transition-colors"
                    >
                        Tasas BCV
                    </Link>
                    <Link
                        href="/dashboard/counterparties"
                        className="block py-2 px-3 rounded-md hover:bg-slate-800 transition-colors"
                    >
                        Contrapartes
                    </Link>
                    <Link
                        href="/dashboard/operations"
                        className="block py-2 px-3 rounded-md hover:bg-slate-800 transition-colors"
                    >
                        Operaciones
                    </Link>
                    <Link
                        href="/dashboard/payments"
                        className="block py-2 px-3 rounded-md hover:bg-slate-800 transition-colors"
                    >
                        Pagos
                    </Link>
                    <Link
                        href="/dashboard/reconciliation"
                        className="block py-2 px-3 rounded-md hover:bg-slate-800 transition-colors"
                    >
                        Conciliación
                    </Link>
                </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
                {/* Mobile Header (Simple) */}
                <header className="sm:hidden bg-slate-950 text-slate-50 p-4 flex justify-between items-center">
                    <h2 className="font-bold">Tarjeteando</h2>
                    <div className="text-sm flex flex-wrap gap-2">
                        <Link href="/dashboard" className="hover:text-slate-300">Resumen</Link>
                        <Link href="/dashboard/banks" className="hover:text-slate-300">Bancos</Link>
                        <Link href="/dashboard/cards" className="hover:text-slate-300">Tarjetas</Link>
                        <Link href="/dashboard/fx-rates" className="hover:text-slate-300">Tasas</Link>
                        <Link href="/dashboard/operations" className="hover:text-slate-300">Ops</Link>
                        <Link href="/dashboard/payments" className="hover:text-slate-300">Pagos</Link>
                        <Link href="/dashboard/reconciliation" className="hover:text-slate-300">Concil</Link>
                    </div>
                </header>

                {children}
            </div>
        </div>
    );
}
