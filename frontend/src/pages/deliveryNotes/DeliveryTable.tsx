/**
 * @file DeliveryTable.tsx
 * @description Sub-component rendering the delivery notes table view.
 */

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Download, FileCheck, FileSpreadsheet, FileText, MapPin, Package, Plus, Search, Trash2 } from "lucide-react";
import Card from "../../components/Card";
import IconBtn from "../../components/IconBtn";
import StatusBadge from "../../components/StatusBadge";

export interface DeliveryNoteItem {
  id: number;
  delivery_no: string;
  order_no: string;
  recipient_name: string;
  address: string;
  gold_qty_kg: number;
  dispatch_date: string;
  courier_status: "Delivered" | "In Transit" | "Dispatched";
  driver_contact?: string;
}

interface DeliveryTableProps {
  deliveries: DeliveryNoteItem[];
  search: string;
  setSearch: (val: string) => void;
  openModal: () => void;
  deleteDelivery: (id: number) => void;
  notify?: (msg: string) => void;
}

function ExportDeliveryDropdown({
  deliveries,
  notify,
}: {
  deliveries: DeliveryNoteItem[];
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
    const headers = ["Delivery No", "Order Ref", "Recipient Name", "Address", "Weight (KG)", "Dispatch Date", "Driver Contact", "Status"];
    const exportRows = deliveries.map((d) => [
      `"${(d.delivery_no || "").replace(/"/g, '""')}"`,
      `"${(d.order_no || "").replace(/"/g, '""')}"`,
      `"${(d.recipient_name || "").replace(/"/g, '""')}"`,
      `"${(d.address || "").replace(/"/g, '""')}"`,
      `"${(d.gold_qty_kg || 0).toFixed(3)}"`,
      `"${(d.dispatch_date || "").replace(/"/g, '""')}"`,
      `"${(d.driver_contact || "").replace(/"/g, '""')}"`,
      `"${(d.courier_status || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...exportRows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `Delivery_Notes_Report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (notify) notify("Exported Delivery Notes list to Excel (.csv)");
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

    const tableRowsHtml = deliveries
      .map(
        (d) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 10px; font-family: monospace; font-weight: bold; color: #1e293b;">${d.delivery_no || "—"}</td>
          <td style="padding: 8px 10px; font-family: monospace; color: #475569;">${d.order_no || "—"}</td>
          <td style="padding: 8px 10px; font-weight: 600; color: #0f172a;">${d.recipient_name || "—"}</td>
          <td style="padding: 8px 10px; color: #475569;">${d.address || "—"}</td>
          <td style="padding: 8px 10px; font-family: monospace; font-weight: 600; text-align: right; color: #0f172a;">${(d.gold_qty_kg || 0).toFixed(3)} KG</td>
          <td style="padding: 8px 10px; color: #64748b;">${d.dispatch_date || "—"}</td>
          <td style="padding: 8px 10px;">
            <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; background: #e0e7ff; color: #3730a3;">${d.courier_status || "—"}</span>
          </td>
        </tr>
      `
      )
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Delivery Notes Dispatch Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; color: #1e1b4b; }
          .meta { font-size: 12px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #f8fafc; text-align: left; padding: 10px 10px; font-weight: 600; color: #64748b; border-bottom: 1px solid #cbd5e1; text-transform: uppercase; font-size: 11px; }
          .footer { margin-top: 24px; font-size: 11px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">Delivery Notes Dispatch Report</div>
            <div class="meta">Exported on ${dateStr} | Total Dispatch Records: ${deliveries.length}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Delivery No</th>
              <th>Order Ref</th>
              <th>Recipient Name</th>
              <th>Address</th>
              <th style="text-align: right;">Weight</th>
              <th>Dispatch Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
        <div class="footer">Confidential — Vault Gold Delivery Log</div>
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
        className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs px-3.5 py-2 rounded-lg border border-slate-200 transition-colors shadow-xs cursor-pointer"
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
 * Delivery notes listing table component.
 */
export default function DeliveryTable({
  deliveries,
  search,
  setSearch,
  openModal,
  deleteDelivery,
  notify,
}: DeliveryTableProps) {
  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 w-full sm:w-auto max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Delivery No, Order No, Recipient or Address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <ExportDeliveryDropdown deliveries={deliveries} notify={notify} />
          <button
            onClick={openModal}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={16} /> New Delivery Note
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {deliveries.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <FileCheck size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-medium">No delivery notes recorded yet</p>
            <p className="text-xs text-slate-400 mt-1">Create a new delivery note to track dispatched gold orders.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50/50">
                <th className="pb-3 pt-2 px-3 font-medium">Delivery Note</th>
                <th className="pb-3 pt-2 px-3 font-medium">Order Ref</th>
                <th className="pb-3 pt-2 px-3 font-medium">Recipient</th>
                <th className="pb-3 pt-2 px-3 font-medium">Address</th>
                <th className="pb-3 pt-2 px-3 font-medium text-right">Quantity</th>
                <th className="pb-3 pt-2 px-3 font-medium">Dispatch Date</th>
                <th className="pb-3 pt-2 px-3 font-medium">Status</th>
                <th className="pb-3 pt-2 px-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deliveries.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-800">{item.delivery_no}</td>
                  <td className="py-3 px-3 text-slate-500 font-mono text-xs">{item.order_no}</td>
                  <td className="py-3 px-3 font-medium text-slate-700">{item.recipient_name}</td>
                  <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                    <div className="flex items-center gap-1">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{item.address}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-800">
                    {item.gold_qty_kg.toFixed(1)} KG
                  </td>
                  <td className="py-3 px-3 text-slate-500 text-xs">{item.dispatch_date}</td>
                  <td className="py-3 px-3">
                    <StatusBadge status={item.courier_status} />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <IconBtn title="Delete" tone="danger" onClick={() => deleteDelivery(item.id)}>
                      <Trash2 size={15} />
                    </IconBtn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
