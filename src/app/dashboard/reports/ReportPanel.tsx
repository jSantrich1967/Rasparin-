"use client";

import { useRef } from "react";
import type { ReportRow, ReportSummary } from "./page";
import { formatUSD, formatVES } from "@/lib/money";

type ReportPanelProps = {
  rows: ReportRow[];
  summary: ReportSummary;
};

export function ReportPanel({ rows, summary }: ReportPanelProps) {
  const tableRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    window.print();
  }

  async function handleExportExcel() {
    try {
      const XLSX = await import("xlsx");
      const headers = [
        "Fecha",
        "Tarjeta",
        "Banco",
        "Contraparte",
        "USD Cargado",
        "Fee Banco %",
        "Fee Comercio %",
        "Fee Banco USD",
        "Fee Comercio USD",
        "Total Fees USD",
        "USD Recibido",
        "Deuda VES",
        "Tasa BCV",
        "Estado",
      ];
      const data = rows.map((r) => [
        r.date,
        r.cardAlias,
        r.bankName,
        r.counterpartyName,
        r.usdCharged,
        r.bankFeePercent,
        r.merchantFeePercent,
        r.bankFeeUSD,
        r.merchantFeeUSD,
        r.totalFeeUSD,
        r.usdCashReceived,
        r.debtVES,
        r.bcvRate,
        r.status,
      ]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Operaciones");
      XLSX.writeFile(wb, `reporte-operaciones-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch {
      const headers = ["Fecha", "Tarjeta", "Banco", "Contraparte", "USD Cargado", "Fee Banco %", "Fee Comercio %", "Fee Banco USD", "Fee Comercio USD", "Total Fees USD", "USD Recibido", "Deuda VES", "Tasa BCV", "Estado"];
      const data = rows.map((r) => [r.date, r.cardAlias, r.bankName, r.counterpartyName, r.usdCharged, r.bankFeePercent, r.merchantFeePercent, r.bankFeeUSD, r.merchantFeeUSD, r.totalFeeUSD, r.usdCashReceived, r.debtVES, r.bcvRate, r.status]);
      const csvRows = [headers.join(","), ...data.map((row) => row.map((v) => (typeof v === "string" ? `"${String(v).replace(/"/g, '""')}"` : v)).join(","))];
      const csv = "\uFEFF" + csvRows.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte-operaciones-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  async function handleExportPDF() {
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFontSize(14);
      doc.text("Reporte de Operaciones - Tarjeteando", 14, 12);
      doc.setFontSize(10);
      doc.text(`Generado: ${new Date().toLocaleString("es-VE")}`, 14, 18);

      const headers = [
        "Fecha",
        "Tarjeta",
        "Contraparte",
        "USD",
        "Fee B%",
        "Fee C%",
        "Fee B USD",
        "Fee C USD",
        "Total Fee",
        "USD Recib.",
        "Deuda VES",
        "Estado",
      ];
      const body = rows.map((r) => [
        r.date,
        r.cardAlias,
        r.counterpartyName,
        r.usdCharged.toFixed(2),
        r.bankFeePercent.toFixed(2),
        r.merchantFeePercent.toFixed(2),
        r.bankFeeUSD.toFixed(2),
        r.merchantFeeUSD.toFixed(2),
        r.totalFeeUSD.toFixed(2),
        r.usdCashReceived.toFixed(2),
        r.debtVES.toFixed(2),
        r.status,
      ]);

      autoTable(doc, {
        head: [headers],
        body,
        startY: 24,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [30, 41, 59] },
      });

      const finalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 24;
      doc.setFontSize(9);
      doc.text(`Total operaciones: ${summary.count}`, 14, finalY + 8);
      doc.text(`USD Cargado: ${summary.totalUsdCharged.toFixed(2)} | Fees: ${summary.totalFeesUSD.toFixed(2)} | USD Recibido: ${summary.totalUsdCashReceived.toFixed(2)} | Deuda VES: ${summary.totalDebtVES.toFixed(2)}`, 14, finalY + 14);

      doc.save(`reporte-operaciones-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("Error al exportar PDF:", err);
      alert("No se pudo generar el PDF. Asegúrate de tener las dependencias instaladas (npm install).");
    }
  }

  return (
    <div className="space-y-4">
      {/* Botones de acción */}
      <div className="flex flex-wrap gap-2 no-print">
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-lg stitch-glass px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir
        </button>
        <button
          type="button"
          onClick={handleExportPDF}
          className="inline-flex items-center gap-2 rounded-lg stitch-glass px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
        >
          <span className="font-bold text-red-600">PDF</span>
          Exportar PDF
        </button>
        <button
          type="button"
          onClick={handleExportExcel}
          className="inline-flex items-center gap-2 rounded-lg stitch-glass px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
        >
          <span className="font-bold text-emerald-700">Excel</span>
          Exportar Excel
        </button>
      </div>

      {/* Tabla de reporte */}
      <div ref={tableRef} className="rounded-2xl stitch-glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" id="report-table">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="text-left px-4 py-3 font-medium text-slate-400">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-slate-400">Tarjeta</th>
                <th className="text-left px-4 py-3 font-medium text-slate-400">Banco</th>
                <th className="text-left px-4 py-3 font-medium text-slate-400">Contraparte</th>
                <th className="text-right px-4 py-3 font-medium text-slate-400">USD Cargado</th>
                <th className="text-right px-4 py-3 font-medium text-slate-400">Fee Banco %</th>
                <th className="text-right px-4 py-3 font-medium text-slate-400">Fee Comercio %</th>
                <th className="text-right px-4 py-3 font-medium text-slate-400">Fee Banco USD</th>
                <th className="text-right px-4 py-3 font-medium text-slate-400">Fee Comercio USD</th>
                <th className="text-right px-4 py-3 font-medium text-slate-400">Total Fees USD</th>
                <th className="text-right px-4 py-3 font-medium text-slate-400">USD Recibido</th>
                <th className="text-right px-4 py-3 font-medium text-slate-400">Deuda VES</th>
                <th className="text-center px-4 py-3 font-medium text-slate-400">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-2.5 font-mono text-slate-500">{r.date}</td>
                  <td className="px-4 py-2.5 text-white">{r.cardAlias}</td>
                  <td className="px-4 py-2.5 text-slate-400">{r.bankName}</td>
                  <td className="px-4 py-2.5 text-slate-400">{r.counterpartyName}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-white">{formatUSD(r.usdCharged)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-500">{r.bankFeePercent.toFixed(2)}%</td>
                  <td className="px-4 py-2.5 text-right text-slate-500">{r.merchantFeePercent.toFixed(2)}%</td>
                  <td className="px-4 py-2.5 text-right text-slate-500">{formatUSD(r.bankFeeUSD)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-500">{formatUSD(r.merchantFeeUSD)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-amber-400">{formatUSD(r.totalFeeUSD)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-emerald-accent">{formatUSD(r.usdCashReceived)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-white">{formatVES(r.debtVES)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span
                      className={`font-medium ${
                        r.status === "OPEN" ? "text-amber-400" : r.status === "SETTLED" ? "text-emerald-accent" : "text-slate-500"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-white/10 font-semibold border-t-2 border-white/20">
                <td className="px-4 py-3 text-slate-300" colSpan={4}>
                  Total ({summary.count} operaciones)
                </td>
                <td className="px-4 py-3 text-right text-white">{formatUSD(summary.totalUsdCharged)}</td>
                <td className="px-4 py-3" colSpan={2} />
                <td className="px-4 py-3 text-right text-slate-400">{formatUSD(summary.totalBankFeeUSD)}</td>
                <td className="px-4 py-3 text-right text-slate-400">{formatUSD(summary.totalMerchantFeeUSD)}</td>
                <td className="px-4 py-3 text-right text-amber-400">{formatUSD(summary.totalFeesUSD)}</td>
                <td className="px-4 py-3 text-right text-emerald-accent">{formatUSD(summary.totalUsdCashReceived)}</td>
                <td className="px-4 py-3 text-right text-white">{formatVES(summary.totalDebtVES)}</td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
