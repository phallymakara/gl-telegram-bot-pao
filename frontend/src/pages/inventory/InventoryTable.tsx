/**
 * @file InventoryTable.tsx
 * @description Sub-component rendering the stock ledger table with date range filters, search, and action items.
 */

import { useState, useRef, useEffect } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronDown, Download, FileSpreadsheet, FileText, Search, Trash2, X } from "lucide-react";
import Card from "../../components/Card";
import IconBtn from "../../components/IconBtn";
import StatusBadge from "../../components/StatusBadge";
import { InventoryData, toNumber } from "../../api";

interface InventoryTableProps {
  rows: InventoryData[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filterType: "all" | "inflow" | "outflow";
  setFilterType: (val: "all" | "inflow" | "outflow") => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  clearDateFilter: () => void;
  openAdjustmentModal: () => void;
  deleteRow: (id: number) => void;
  notify?: (msg: string) => void;
}

function ExportInventoryDropdown({
  rows,
  notify,
}: {
  rows: InventoryData[];
  notify?: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleExportExcel() {
    setOpen(false);
    const headers = ["Date", "Reference", "Party / Description", "Type", "Weight (KG)"];
    const exportRows = rows.map((r) => [
      `"${(r.inventory_date || r.created_at || "").replace(/"/g, '""')}"`,
      `"${(r.reference || "").replace(/"/g, '""')}"`,
      `"${(r.party || r.name || "").replace(/"/g, '""')}"`,
      `"${toNumber(r.stock_kg) >= 0 ? "INFLOW" : "OUTFLOW"}"`,
      `"${toNumber(r.stock_kg).toFixed(3)}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...exportRows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `Inventory_Movement_Ledger_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (notify) notify("Exported inventory ledger to Excel (.csv)");
  }

  function handleExportPdf() {
    setOpen(false);
    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const tableRowsHtml = rows
      .map((r) => {
        const kg = toNumber(r.stock_kg);
        const isPositive = kg >= 0;
        return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 12px; color: #475569;">${r.inventory_date || r.created_at || "—"}</td>
          <td style="padding: 8px 12px; font-family: monospace; font-weight: bold; color: #1e293b;">${r.reference || "—"}</td>
          <td style="padding: 8px 12px; font-weight: 600; color: #0f172a;">${r.party || r.name || "—"}</td>
          <td style="padding: 8px 12px;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; ${
              isPositive
                ? "background: #dcfce7; color: #15803d;"
                : "background: #fee2e2; color: #b91c1c;"
            }">${isPositive ? "INFLOW" : "OUTFLOW"}</span>
          </td>
          <td style="padding: 8px 12px; font-family: monospace; font-weight: 600; text-align: right; color: ${
            isPositive ? "#15803d" : "#b91c1c"
          };">${isPositive ? "+" : ""}${kg.toFixed(3)} KG</td>
        </tr>
      `;
      })
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inventory Movement Ledger Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; color: #1e1b4b; }
          .meta { font-size: 12px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #f8fafc; text-align: left; padding: 10px 12px; font-weight: 600; color: #64748b; border-bottom: 1px solid #cbd5e1; text-transform: uppercase; font-size: 11px; }
          .footer { margin-top: 24px; font-size: 11px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">Inventory Movement Ledger Report</div>
            <div class="meta">Exported on ${dateStr} | Total Movement Entries: ${rows.length}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Reference</th>
              <th>Party / Description</th>
              <th>Type</th>
              <th style="text-align: right;">Weight (KG)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
        <div class="footer">Confidential — Vault Inventory Movement Audit Log</div>
      </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 300);

    if (notify) notify("Prepared PDF export for print/download");
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 transition-colors shadow-xs cursor-pointer"
      >
        <Download size={14} className="text-slate-500" />
        <span>Export</span>
        <ChevronDown size={13} className="text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-40 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
          <button
            type="button"
            onClick={handleExportExcel}
            className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-emerald-50/70 hover:text-emerald-700 flex items-center gap-2 transition-colors cursor-pointer font-medium"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Export as Excel</span>
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-rose-50/70 hover:text-rose-700 flex items-center gap-2 transition-colors cursor-pointer font-medium"
          >
            <FileText size={14} className="text-rose-600" />
            <span>Export as PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Inventory stock ledger table view component.
 */
export default function InventoryTable({
  rows,
  loading,
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  clearDateFilter,
  openAdjustmentModal,
  deleteRow,
  notify,
}: InventoryTableProps) {
  return (
    <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h3 className="font-semibold text-slate-800">Inventory Movement Ledger</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit history of physical gold stock movements in and out of the vault.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ExportInventoryDropdown rows={rows} notify={notify} />
          <button
            onClick={openAdjustmentModal}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium shrink-0 shadow-xs cursor-pointer"
          >
            + Record Stock Adjustment
          </button>
        </div>
      </div>

      <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search reference, party..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent focus:outline-none text-xs text-slate-700 cursor-pointer"
            />
            <span className="text-slate-300">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent focus:outline-none text-xs text-slate-700 cursor-pointer"
            />
            {(startDate || endDate) && (
              <button
                onClick={clearDateFilter}
                className="text-slate-400 hover:text-slate-600 ml-1 p-0.5 rounded hover:bg-slate-100"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-lg">
          {(["all", "inflow", "outflow"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                filterType === t
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading inventory ledger...</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No inventory records found.</div>
        ) : (
          <table className="w-full text-sm min-w-[900px]">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                {["Date", "Reference", "Party / Description", "Type", "Weight (KG)", "Actions"].map(
                  (h) => (
                    <th key={h} className="px-5 py-3 font-medium whitespace-nowrap bg-slate-50">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isPositive = toNumber(row.stock_kg) >= 0;
                return (
                  <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                      {row.inventory_date}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-700">
                      {row.reference || `REF-${row.id}`}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium">
                      {row.party || row.name || "Vault Stock Adjustment"}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={isPositive ? "Received" : "Returned"} />
                    </td>
                    <td
                      className={`px-5 py-3.5 font-bold whitespace-nowrap ${
                        isPositive ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {isPositive ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                        {isPositive ? "+" : ""}
                        {toNumber(row.stock_kg).toFixed(2)} KG
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <IconBtn title="Delete Record" tone="danger" onClick={() => deleteRow(row.id)}>
                        <Trash2 size={15} />
                      </IconBtn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
