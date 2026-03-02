"use client";

import Link from "next/link";
import { formatUSD, formatVES } from "@/lib/money";

export type StitchDashboardProps = {
  totalDebtUSD: number;
  totalDebtVES: number;
  totalNetUsdReceived: number;
  bcvRate: number;
  realizedProfitUSD: number;
  pendingDebtUSD: number;
  opsCount: number;
  pctOpen: number;
  pctSettled: number;
  pctCancelled: number;
  bcvChartData: { date: Date; rate: number }[];
  activityItems: { id: string; name: string; date: Date; amount: number; status: string }[];
};

export function StitchDashboard({
  totalDebtUSD,
  totalDebtVES,
  totalNetUsdReceived,
  bcvRate,
  realizedProfitUSD,
  pendingDebtUSD,
  opsCount,
  pctOpen,
  pctSettled,
  pctCancelled,
  bcvChartData,
  activityItems,
}: StitchDashboardProps) {
  const totalCircumference = 100;
  const openDash = (pctOpen / 100) * totalCircumference;
  const settledDash = (pctSettled / 100) * totalCircumference;
  return (
    <div className="min-h-screen flex flex-col bg-charcoal text-slate-200 antialiased stitch-dashboard">
      <style>{`
        .stitch-dashboard {
          background: radial-gradient(circle at 50% 0%, #1e293b 0%, #0a0c10 100%);
        }
        .stitch-dashboard .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
        }
        .stitch-dashboard .glass-nav {
          background: rgba(10, 12, 16, 0.8);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        .stitch-dashboard .glow-blue {
          box-shadow: 0 0 15px rgba(0, 122, 255, 0.3);
        }
        .stitch-dashboard .glow-emerald {
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.3);
        }
      `}</style>

      <header className="sticky top-0 z-50 bg-charcoal/60 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-electric-blue to-blue-400 flex items-center justify-center text-white glow-blue">
            <span className="material-symbols-outlined font-light text-xl">account_balance_wallet</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Tarjeteando</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-accent animate-pulse" />
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-[0.2em]">Tiempo real • VE</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button type="button" className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-white/10 transition-all">
            <span className="material-symbols-outlined text-[20px] text-slate-400">search</span>
          </button>
          <div className="w-10 h-10 rounded-full border border-white/10 bg-slate-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-slate-400">person</span>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-6 space-y-8 pb-32">
        <section>
          <div className="glass-card rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-electric-blue/10 blur-[80px] rounded-full group-hover:bg-electric-blue/20 transition-all duration-700" />
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Deuda Total Pendiente</p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl font-extrabold tracking-tight">{formatUSD(totalDebtUSD)}</h2>
                </div>
                <p className="text-slate-500 text-xs mt-1 font-medium tracking-tight">≈ {formatVES(totalDebtVES)} VES <span className="text-[10px] opacity-40 italic ml-1">({bcvRate > 0 ? bcvRate.toFixed(2) : "—"} BCV)</span></p>
                <p className="text-emerald-accent/90 text-xs mt-2 font-semibold">USD netos recibidos (post-fees): {formatUSD(totalNetUsdReceived)}</p>
              </div>
              {bcvRate > 0 && (
                <div className="bg-white/5 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-white/10">
                  <span className="material-symbols-outlined text-xs">currency_exchange</span> {bcvRate.toFixed(2)} VES
                </div>
              )}
            </div>
            <div className="h-16 w-full opacity-60">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 300 60">
                <path d="M0,45 C20,40 40,55 60,45 C80,35 100,50 120,40 C140,30 160,50 180,35 C200,20 220,40 240,25 C260,10 280,30 300,15" fill="none" stroke="#007AFF" strokeLinecap="round" strokeWidth={2} />
              </svg>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4">
          <div className="glass-card rounded-2xl p-4 relative overflow-hidden">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">Ganancia Realizada</p>
            <h3 className={`text-xl font-bold ${realizedProfitUSD >= 0 ? "text-emerald-accent" : "text-red-400"}`}>
              {realizedProfitUSD >= 0 ? "+" : ""}{formatUSD(realizedProfitUSD)}
            </h3>
            <div className="mt-4 h-8">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 30">
                <path d="M0,25 Q25,5 50,20 T100,10" fill="none" stroke="#10b981" strokeLinecap="round" strokeWidth={2} />
              </svg>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-4 relative overflow-hidden">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">Deuda OPEN (USD)</p>
            <h3 className="text-xl font-bold text-white">{formatUSD(pendingDebtUSD)}</h3>
            <div className="mt-4 h-8 opacity-40">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 30">
                <path d="M0,15 Q25,25 50,15 T100,20" fill="none" stroke="#94a3b8" strokeLinecap="round" strokeWidth={2} />
              </svg>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Inteligencia de Mercado</h2>
            <div className="flex gap-2">
              <span className="w-2 h-2 rounded-full bg-electric-blue" />
              <span className="w-2 h-2 rounded-full bg-white/10" />
            </div>
          </div>
          <div className="glass-card rounded-3xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm font-semibold">Tendencia BCV</h3>
                <p className="text-[10px] text-slate-500">Fluctuación cambiaria 30 días</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-electric-blue">{bcvRate > 0 ? `${bcvRate.toFixed(2)} VES` : "—"}</p>
                <p className="text-[9px] text-slate-500 uppercase tracking-tighter">Tasa Actual</p>
              </div>
            </div>
            <div className="h-40 w-full">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 120">
                <defs>
                  <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#007AFF" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <path d="M0,100 C50,90 80,110 120,80 C160,50 200,70 240,40 C280,10 350,30 400,20 L400,120 L0,120 Z" fill="url(#areaGrad)" />
                <path d="M0,100 C50,90 80,110 120,80 C160,50 200,70 240,40 C280,10 350,30 400,20" fill="none" stroke="#007AFF" strokeLinecap="round" strokeWidth={3} />
                <circle cx={120} cy={80} fill="#007AFF" r={3} stroke="white" strokeWidth={1} />
                <circle cx={240} cy={40} fill="#007AFF" r={3} stroke="white" strokeWidth={1} />
                <circle cx={400} cy={20} fill="#007AFF" r={3} stroke="white" strokeWidth={1} />
              </svg>
            </div>
            {bcvChartData.length > 0 && (
              <div className="flex justify-between mt-4 text-[9px] font-bold text-slate-600 uppercase">
                <span>{new Date(bcvChartData[0]?.date).toLocaleDateString("es-VE", { day: "2-digit", month: "short" })}</span>
                {bcvChartData.length > 1 && <span>{new Date(bcvChartData[Math.floor(bcvChartData.length / 2)]?.date).toLocaleDateString("es-VE", { day: "2-digit", month: "short" })}</span>}
                <span>{new Date(bcvChartData[bcvChartData.length - 1]?.date).toLocaleDateString("es-VE", { day: "2-digit", month: "short" })}</span>
              </div>
            )}
          </div>
          <div className="glass-card rounded-3xl p-6 flex items-center justify-between gap-8">
            <div className="relative w-32 h-32 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx={18} cy={18} fill="none" r={16} stroke="rgba(255,255,255,0.05)" strokeWidth={2.5} />
                <circle className="drop-shadow-[0_0_8px_rgba(0,122,255,0.4)]" cx={18} cy={18} fill="none" r={16} stroke="#007AFF" strokeDasharray={`${openDash}, 100`} strokeLinecap="round" strokeWidth={3} />
                <circle className="drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" cx={18} cy={18} fill="none" r={16} stroke="#10b981" strokeDasharray={`${settledDash}, 100`} strokeDashoffset={-openDash} strokeLinecap="round" strokeWidth={3} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-white">{opsCount}</span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Ops</span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Distribución de Estatus</h3>
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-electric-blue glow-blue" />
                  <span className="text-[11px] font-medium text-slate-300">Deuda Abierta</span>
                </div>
                <span className="text-xs font-bold text-white">{pctOpen}%</span>
              </div>
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-accent glow-emerald" />
                  <span className="text-[11px] font-medium text-slate-300">Conciliado</span>
                </div>
                <span className="text-xs font-bold text-white">{pctSettled}%</span>
              </div>
              <div className="flex items-center justify-between group opacity-40">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  <span className="text-[11px] font-medium text-slate-300">Cancelado</span>
                </div>
                <span className="text-xs font-bold text-white">{pctCancelled}%</span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Registro de Actividad</h2>
            <Link href="/dashboard/operations" className="text-electric-blue text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 hover:opacity-80 transition-all">
              Ver Todo <span className="material-symbols-outlined text-sm">arrow_forward_ios</span>
            </Link>
          </div>
          <div className="space-y-3">
            {activityItems.length === 0 ? (
              <div className="glass-card rounded-2xl p-6 text-center text-slate-500 text-sm">
                No hay operaciones recientes
              </div>
            ) : (
              activityItems.map((item) => (
                <div
                  key={item.id}
                  className={`glass-card rounded-2xl p-4 flex items-center justify-between border-l-4 ${
                    item.status === "SETTLED" ? "border-l-emerald-accent/50" : "border-l-electric-blue/50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400">
                      <span className="material-symbols-outlined font-light">{item.status === "SETTLED" ? "person" : "business"}</span>
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-white">{item.name}</h4>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {new Date(item.date).toLocaleDateString("es-VE", { day: "numeric", month: "short" })} • {new Date(item.date).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-black text-white">{formatUSD(item.amount)}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-tighter ${item.status === "SETTLED" ? "text-emerald-accent" : "text-electric-blue"}`}>
                      {item.status === "SETTLED" ? "Liquidado" : "Activa"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-[100] glass-nav px-8 pt-4 pb-8">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <Link href="/stitch" className="flex flex-col items-center gap-1.5 text-electric-blue">
            <div className="relative">
              <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: '"FILL" 1' }}>grid_view</span>
              <div className="absolute -inset-2 bg-electric-blue/20 blur-md rounded-full -z-10" />
            </div>
            <span className="text-[9px] font-extrabold uppercase tracking-widest">Inicio</span>
          </Link>
          <Link href="/dashboard/operations" className="flex flex-col items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors">
            <span className="material-symbols-outlined text-[26px]">swap_horiz</span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest">Ops</span>
          </Link>
          <div className="relative -mt-12">
            <Link href="/dashboard/operations" className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-electric-blue to-blue-400 shadow-[0_8px_20px_rgba(0,122,255,0.4)] flex items-center justify-center text-white border-4 border-charcoal">
              <span className="material-symbols-outlined text-3xl font-light">add</span>
            </Link>
          </div>
          <Link href="/dashboard/reports" className="flex flex-col items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors">
            <span className="material-symbols-outlined text-[26px]">insights</span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest">Reportes</span>
          </Link>
          <Link href="/dashboard" className="flex flex-col items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors" title="Panel clásico (bancos, tarjetas, etc.)">
            <span className="material-symbols-outlined text-[26px]">tune</span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest">Panel</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
