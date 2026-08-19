/**
 * @file CustomerTable.tsx
 * @description Sub-component rendering the scrollable customer master data table listing with sticky header and 3-dot action dropdown.
 * Columns: Customer Code | Customer Name | Contact | Sex | DOB | Nation | Address | Status | Action
 */

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText, Globe, MapPin, MoreVertical, Pencil, Plus, RefreshCw, Search, Trash2, Users } from "lucide-react";
import Card from "../../components/Card";
import StatusBadge from "../../components/StatusBadge";
import { CustomerData } from "../../api";

interface CustomerTableProps {
  customers: CustomerData[];
  search: string;
  setSearch: (val: string) => void;
  openCreateModal: () => void;
  openEditModal: (c: CustomerData) => void;
  toggleStatus: (c: CustomerData) => void;
  deleteCustomer: (id: number) => void;
  notify?: (msg: string) => void;
}

function ExportDropdown({
  customers,
  notify,
}: {
  customers: CustomerData[];
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
    const headers = ["Customer Code", "Customer Name", "Contact", "Sex", "DOB", "Nation", "Address", "Status"];
    const rows = customers.map((c, i) => [
      `"${(c.customer_code || `CUST-${String(i + 1).padStart(3, "0")}`).replace(/"/g, '""')}"`,
      `"${(c.name || "").replace(/"/g, '""')}"`,
      `"${(c.contact || "").replace(/"/g, '""')}"`,
      `"${(c.sex || "").replace(/"/g, '""')}"`,
      `"${(c.dob || "").replace(/"/g, '""')}"`,
      `"${(c.nation || "").replace(/"/g, '""')}"`,
      `"${(c.address || "").replace(/"/g, '""')}"`,
      `"${c.is_active !== false ? "Active" : "Inactive"}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `Customers_Master_Directory_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (notify) notify("Exported customers list to Excel (.csv)");
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

    const tableRowsHtml = customers
      .map(
        (c, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 12px; font-family: monospace; font-weight: bold; color: #1e293b;">${c.customer_code || `CUST-${String(idx + 1).padStart(3, "0")}`}</td>
          <td style="padding: 8px 12px; font-weight: 600; color: #0f172a;">${c.name || "—"}</td>
          <td style="padding: 8px 12px; color: #475569;">${c.contact || "—"}</td>
          <td style="padding: 8px 12px; color: #475569;">${c.sex || "—"}</td>
          <td style="padding: 8px 12px; color: #475569;">${c.dob || "—"}</td>
          <td style="padding: 8px 12px; color: #475569;">${c.nation || "—"}</td>
          <td style="padding: 8px 12px; color: #475569;">${c.address || "—"}</td>
          <td style="padding: 8px 12px;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; ${
              c.is_active !== false
                ? "background: #dcfce7; color: #15803d;"
                : "background: #fef3c7; color: #b45309;"
            }">${c.is_active !== false ? "Active" : "Inactive"}</span>
          </td>
        </tr>
      `
      )
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Customers Directory Report</title>
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
            <div class="title">Customers Directory Report</div>
            <div class="meta">Exported on ${dateStr} | Total Records: ${customers.length}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Customer Code</th>
              <th>Customer Name</th>
              <th>Contact</th>
              <th>Sex</th>
              <th>DOB</th>
              <th>Nation</th>
              <th>Address</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
        <div class="footer">Confidential — Master Customer Directory</div>
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
 * 3-dot dropdown menu component for editing, changing status, and deleting table rows.
 */
function ActionMenu({
  isActive,
  onChangeStatus,
  onEdit,
  onDelete,
}: {
  isActive?: boolean;
  onChangeStatus: () => void;
  onEdit: () => void;
  onDelete: () => void;
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

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        title="More Actions"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
          <button
            onClick={() => {
              setOpen(false);
              onChangeStatus();
            }}
            className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer font-medium"
          >
            <RefreshCw size={13} className="text-slate-400" />
            <span>{isActive !== false ? "Set Inactive" : "Set Active"}</span>
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer font-medium"
          >
            <Pencil size={13} className="text-slate-400" />
            <span>Edit</span>
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer font-medium"
          >
            <Trash2 size={13} className="text-rose-500" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Customer master data list table component with scrollable table container and 3-dot action dropdown.
 */
export default function CustomerTable({
  customers,
  search,
  setSearch,
  openCreateModal,
  openEditModal,
  toggleStatus,
  deleteCustomer,
  notify,
}: CustomerTableProps) {
  return (
    <Card className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3.5 flex-shrink-0">
        <div className="relative flex-1 w-full sm:w-auto max-w-lg">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer code, name, contact, sex, DOB, nation, or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <ExportDropdown customers={customers} notify={notify} />
          <button
            onClick={openCreateModal}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3.5 py-2 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Plus size={15} /> New Customer
          </button>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
        {customers.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Users size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-medium">No customer master records found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Add a new trade customer to build your master client list.</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="text-left text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                <th className="py-2.5 px-3 font-semibold bg-slate-50">Customer Code</th>
                <th className="py-2.5 px-3 font-semibold bg-slate-50">Customer Name</th>
                <th className="py-2.5 px-3 font-semibold bg-slate-50">Contact</th>
                <th className="py-2.5 px-3 font-semibold bg-slate-50">Sex</th>
                <th className="py-2.5 px-3 font-semibold bg-slate-50">DOB</th>
                <th className="py-2.5 px-3 font-semibold bg-slate-50">Nation</th>
                <th className="py-2.5 px-3 font-semibold bg-slate-50">Address</th>
                <th className="py-2.5 px-3 font-semibold bg-slate-50">Status</th>
                <th className="py-2.5 px-3 font-semibold text-right bg-slate-50">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c, i) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2 px-3 font-mono text-xs font-bold text-slate-800 whitespace-nowrap">
                    {c.customer_code || `CUST-${String(i + 1).padStart(3, "0")}`}
                  </td>
                  <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">
                    {c.name}
                  </td>
                  <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                    {c.contact || "—"}
                  </td>
                  <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                    {c.sex || "—"}
                  </td>
                  <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                    {c.dob || "—"}
                  </td>
                  <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                    {c.nation || "—"}
                  </td>
                  <td className="py-2 px-3 text-slate-500 max-w-xs truncate">
                    {c.address ? (
                      <div className="flex items-center gap-1">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{c.address}</span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <StatusBadge status={c.is_active !== false ? "Active" : "Inactive"} />
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap">
                    <ActionMenu
                      isActive={c.is_active}
                      onChangeStatus={() => toggleStatus(c)}
                      onEdit={() => openEditModal(c)}
                      onDelete={() => deleteCustomer(c.id)}
                    />
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
