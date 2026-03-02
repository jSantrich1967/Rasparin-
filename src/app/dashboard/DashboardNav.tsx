"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/stitch", label: "Inicio" },
  { href: "/dashboard", label: "Resumen" },
  { href: "/dashboard/reports", label: "Reportes" },
  { href: "/dashboard/banks", label: "Bancos" },
  { href: "/dashboard/cards", label: "Tarjetas" },
  { href: "/dashboard/fx-rates", label: "Tasas BCV y Mercado" },
  { href: "/dashboard/counterparties", label: "Contrapartes" },
  { href: "/dashboard/operations", label: "Operaciones" },
  { href: "/dashboard/payments", label: "Pagos" },
  { href: "/dashboard/reconciliation", label: "Conciliación" },
  { href: "/dashboard/backup", label: "Respaldo" },
];

export function DashboardNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="sm:hidden fixed top-4 right-4 z-50 p-2 rounded-lg bg-slate-900 text-white shadow-lg"
        aria-label="Menú"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {mobileOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="sm:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - desktop always visible, mobile as drawer */}
      <aside
        className={`
          fixed sm:static inset-y-0 left-0 z-40 w-64 flex flex-col
          bg-slate-900 text-white transform transition-transform duration-200 ease-out
          sm:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800 sm:border-b">
          <Link href="/dashboard" className="text-xl font-bold tracking-tight" onClick={() => setMobileOpen(false)}>
            Tarjeteando
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  block py-2.5 px-3 rounded-lg text-sm font-medium transition-colors
                  ${isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/80 hover:text-white"}
                `}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
