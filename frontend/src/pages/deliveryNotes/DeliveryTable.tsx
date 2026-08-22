/**
 * @file DeliveryTable.tsx
 * @description Full-height responsive data table component for Delivery Notes with custom columns:
 * Delivery No. | Order No. | Customer | Ordered Qty | Delivered Qty | Remaining Qty | Total Amount | Collected Amount | Remaining Amount | Status | Last Activity | Actions
 */

import { useState, useRef, useEffect } from "react";
import {
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  Eye,
  Trash2,
  DollarSign,
  FileCheck,
  MoreHorizontal,
  Printer,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { DeliveryNoteItem } from "../../api";
import Card from "../../components/Card";
import { openDeliveryInvoiceInNewTab, printDeliveryInvoiceDirectly } from "../../utils/deliveryInvoice";

interface DeliveryTableProps {
  deliveries: DeliveryNoteItem[];
  search: string;
  setSearch: (val: string) => void;
  paymentFilter: string;
  setPaymentFilter: (val: string) => void;
  openCreateModal: () => void;
  openDetailModal: (id: number) => void;
  openPaymentModal: (delivery: DeliveryNoteItem) => void;
  deleteDelivery: (id: number) => void;
  notify: (msg: string) => void;
}

function renderStatusPill(status: string) {
  switch (status) {
    case "PAID":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={12} /> Paid
        </span>
      );
    case "PARTIALLY_PAID":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Clock size={12} /> Partial
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock size={12} /> Pending
        </span>
      );
  }
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
    const headers = [
      "Delivery No.",
      "Order No.",
      "Customer",
      "Ordered Qty (KG)",
      "Delivered Qty (KG)",
      "Remaining Qty (KG)",
      "Total Amount ($)",
      "Collected Amount ($)",
      "Remaining Amount ($)",
      "Status",
      "Last Activity",
    ];
    const exportRows = deliveries.map((d) => {
      const deliveredQty = Number(d.gold_quantity) || 0;
      const orderQty = Number(d.order_quantity) || deliveredQty;
      const remainQty = Math.max(0, orderQty - deliveredQty);
      const totalAmount = Number(d.order_total_amount) || Number(d.amount_owed) || 0;
      const collectedAmount = Number(d.amount_paid) || 0;
      const remainingAmount = Number(d.outstanding_balance) || 0;
      const dateTimeStr = d.dispatch_date || (d.created_at ? new Date(d.created_at).toLocaleString() : "");

      return [
        `"${(d.delivery_no || "").replace(/"/g, '""')}"`,
        `"${(d.order_no || "").replace(/"/g, '""')}"`,
        `"${(d.customer_name || d.recipient_name || "").replace(/"/g, '""')}"`,
        `"${orderQty.toFixed(3)}"`,
        `"${deliveredQty.toFixed(3)}"`,
        `"${remainQty.toFixed(3)}"`,
        `"${totalAmount.toFixed(2)}"`,
        `"${collectedAmount.toFixed(2)}"`,
        `"${remainingAmount.toFixed(2)}"`,
        `"${d.payment_status}"`,
        `"${dateTimeStr.replace(/"/g, '""')}"`,
      ];
    });

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
    if (notify) notify("Exported Delivery Notes report to Excel (.csv)");
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
      .map((d) => {
        const deliveredQty = Number(d.gold_quantity) || 0;
        const orderQty = Number(d.order_quantity) || deliveredQty;
        const remainQty = Math.max(0, orderQty - deliveredQty);
        const totalAmount = Number(d.order_total_amount) || Number(d.amount_owed) || 0;
        const collectedAmount = Number(d.amount_paid) || 0;
        const remainingAmount = Number(d.outstanding_balance) || 0;
        const dateDisplay = d.dispatch_date || (d.created_at ? d.created_at.split("T")[0] : "—");

        return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 10px; font-family: monospace; font-weight: bold; color: #1e293b;">${d.delivery_no || "—"}</td>
          <td style="padding: 8px 10px; font-family: monospace; color: #475569;">${d.order_no || "—"}</td>
          <td style="padding: 8px 10px; font-weight: 600; color: #0f172a;">${d.customer_name || d.recipient_name || "—"}</td>
          <td style="padding: 8px 10px; font-family: monospace; text-align: right; color: #0f172a;">${orderQty.toFixed(3)} KG</td>
          <td style="padding: 8px 10px; font-family: monospace; text-align: right; font-weight: bold; color: #0f172a;">${deliveredQty.toFixed(3)} KG</td>
          <td style="padding: 8px 10px; font-family: monospace; text-align: right; color: #475569;">${remainQty.toFixed(3)} KG</td>
          <td style="padding: 8px 10px; font-family: monospace; text-align: right; color: #0f172a;">$${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          <td style="padding: 8px 10px; font-family: monospace; text-align: right; font-weight: 600; color: #059669;">$${collectedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          <td style="padding: 8px 10px; font-family: monospace; text-align: right; font-weight: bold; color: #b45309;">$${remainingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          <td style="padding: 8px 10px; font-size: 11px; font-weight: 600;">${d.payment_status}</td>
          <td style="padding: 8px 10px; font-size: 11px; color: #475569;">${dateDisplay}</td>
        </tr>
      `;
      })
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Delivery Notes Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; color: #1e1b4b; }
          .meta { font-size: 11px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #f8fafc; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #cbd5e1; }
          .right { text-align: right; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">Delivery Notes Report</div>
            <div class="meta">Exported on ${dateStr} • Total Records: ${deliveries.length}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Delivery No.</th>
              <th>Order No.</th>
              <th>Customer</th>
              <th class="right">Ordered Qty</th>
              <th class="right">Delivered Qty</th>
              <th class="right">Remaining Qty</th>
              <th class="right">Total Amount</th>
              <th class="right">Collected Amount</th>
              <th class="right">Remaining Amount</th>
              <th>Status</th>
              <th>Last Activity</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 250);

    if (notify) notify("Prepared PDF printable report");
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
      >
        <span>Export</span>
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 animate-in fade-in zoom-in-95 duration-100">
          <button
            onClick={handleExportExcel}
            className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            <span>Export to Excel</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <FileText size={15} className="text-rose-600" />
            <span>Export to PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function DeliveryTable({
  deliveries,
  search,
  setSearch,
  paymentFilter,
  setPaymentFilter,
  openCreateModal,
  openDetailModal,
  openPaymentModal,
  deleteDelivery,
  notify,
}: DeliveryTableProps) {
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  useEffect(() => {
    function handleClickOutside() {
      setActiveMenuId(null);
    }
    if (activeMenuId !== null) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [activeMenuId]);

  return (
    <Card className="p-5 flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto flex-1 max-w-2xl">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Delivery No, Order No, Customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-slate-400" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-2.5 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white text-slate-700 font-medium cursor-pointer"
            >
              <option value="">All Payment Statuses</option>
              <option value="WAITING_PAYMENT">Waiting for Payment</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Fully Paid</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <ExportDeliveryDropdown deliveries={deliveries} notify={notify} />
          <button
            onClick={openCreateModal}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={15} /> New Note
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full rounded-lg border border-slate-100">
        {deliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-slate-400 text-center py-12">
            <FileCheck size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-medium">No delivery notes found</p>
            <p className="text-xs text-slate-400 mt-1">
              Generate a delivery note from completed customer sales to begin logging payments.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[1100px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-slate-50/80 border-b border-slate-200/80 shadow-xs">
              <tr className="text-left text-slate-500 uppercase tracking-wider text-xs font-semibold">
                <th className="py-3 px-4 font-semibold whitespace-nowrap">Delivery No.</th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">Order No.</th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">Customer</th>
                <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">Ordered Qty</th>
                <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">Delivered Qty</th>
                <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">Remaining Qty</th>
                <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">Total Amount</th>
                <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">Collected Amount</th>
                <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">Remaining Amount</th>
                <th className="py-3 px-4 font-semibold text-center whitespace-nowrap">Status</th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">Last Activity</th>
                <th className="py-3 px-4 font-semibold text-center w-16 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deliveries.map((item) => {
                const deliveredQty = Number(item.gold_quantity) || 0;
                const orderQty = Number(item.order_quantity) || deliveredQty;
                const remainQty = Math.max(0, orderQty - deliveredQty);
                const totalAmount = Number(item.order_total_amount) || Number(item.amount_owed) || 0;
                const collectedAmount = Number(item.amount_paid) || 0;
                const remainingAmount = Number(item.outstanding_balance) || 0;
                const dateDisplay = item.dispatch_date || (item.created_at ? item.created_at.split("T")[0] : "—");

                return (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    {/* 1. Delivery No. */}
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {item.delivery_no}
                    </td>

                    {/* 2. Order No. */}
                    <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                      {item.order_no}
                    </td>

                    {/* 3. Customer */}
                    <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">
                      <div>{item.customer_name || item.recipient_name}</div>
                      {item.recipient_name && item.customer_name && item.recipient_name !== item.customer_name && (
                        <span className="text-[11px] text-slate-400 block font-normal">
                          Recipient: {item.recipient_name}
                        </span>
                      )}
                    </td>

                    {/* 4. Ordered Qty */}
                    <td className="px-4 py-3 text-right font-medium text-slate-700 whitespace-nowrap">
                      {orderQty.toFixed(3)} KG
                    </td>

                    {/* 5. Delivered Qty */}
                    <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap">
                      {deliveredQty.toFixed(3)} KG
                    </td>

                    {/* 6. Remaining Qty */}
                    <td className="px-4 py-3 text-right font-medium text-slate-600 whitespace-nowrap">
                      {remainQty.toFixed(3)} KG
                    </td>

                    {/* 7. Total Amount */}
                    <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap">
                      ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* 8. Collected Amount */}
                    <td className="px-4 py-3 text-right font-medium text-emerald-700 whitespace-nowrap">
                      ${collectedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* 9. Remaining Amount */}
                    <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap">
                      ${remainingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* 10. Status */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {renderStatusPill(item.payment_status)}
                    </td>

                    {/* 11. Last Activity */}
                    <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap text-xs">
                      <div>{dateDisplay}</div>
                      {item.created_at && (
                        <span className="text-[11px] text-slate-400 block font-normal">
                          {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </td>

                    {/* 12. Actions */}
                    <td className="px-4 py-3 text-center whitespace-nowrap relative">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === item.id ? null : item.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
                          title="Actions"
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        {activeMenuId === item.id && (
                          <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1.5 z-30 text-xs text-left divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                            <div className="py-0.5 space-y-0.5">
                              {/* 1. View Invoice */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  openDeliveryInvoiceInNewTab(item);
                                }}
                                className="w-full flex items-center gap-2 px-3.5 py-2 text-indigo-600 hover:bg-indigo-50 font-semibold transition-colors cursor-pointer"
                              >
                                <FileText size={14} /> View Invoice
                              </button>

                              {/* 2. Print / Export A5 PDF */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  printDeliveryInvoiceDirectly(item);
                                }}
                                className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 hover:bg-slate-100/70 font-medium transition-colors cursor-pointer"
                              >
                                <Printer size={14} /> Print / Export A5 PDF
                              </button>

                              {/* 3. Collect Payment (if unpaid) */}
                              {remainingAmount > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    openPaymentModal(item);
                                  }}
                                  className="w-full flex items-center gap-2 px-3.5 py-2 text-emerald-700 hover:bg-emerald-50 font-semibold transition-colors cursor-pointer"
                                >
                                  <DollarSign size={14} className="text-emerald-600" /> Collect Payment
                                </button>
                              )}

                              {/* 4. View Details & History */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  openDetailModal(item.id);
                                }}
                                className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 hover:bg-slate-100/70 font-medium transition-colors cursor-pointer"
                              >
                                <Eye size={14} /> View Details & History
                              </button>
                            </div>
                            <div className="py-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  deleteDelivery(item.id);
                                }}
                                className="w-full flex items-center gap-2 px-3.5 py-2 text-rose-600 hover:bg-rose-50 font-medium transition-colors cursor-pointer"
                              >
                                <Trash2 size={14} /> Delete Note
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
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
