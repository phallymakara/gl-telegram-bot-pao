/**
 * @file SalesPersonTable.tsx
 * @description Sub-component rendering the scrollable sales person master data table listing with sticky header and 3-dot action dropdown.
 * Columns: Code | Name | Contact | Email | Gender | Address | Status | Action
 */

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText, MoreVertical, Pencil, Plus, Search, Trash2, UserCheck } from "lucide-react";
import Card from "../../components/Card";
import StatusBadge from "../../components/StatusBadge";
import { SalesPersonData } from "../../api";

interface SalesPersonTableProps {
  salesPersons: SalesPersonData[];
  search: string;
  setSearch: (val: string) => void;
  openCreateModal: () => void;
  openEditModal: (sp: SalesPersonData) => void;
  toggleStatus: (sp: SalesPersonData) => void;
  deleteSalesPerson: (id: number) => void;
  notify?: (msg: string) => void;
}

function ExportDropdown({
  salesPersons,
  notify,
}: {
  salesPersons: SalesPersonData[];
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
    const headers = ["Sales Person Code", "Name", "Contact / Phone", "Email", "Gender", "Address", "Status"];
    const rows = salesPersons.map((sp, i) => [
      `"${(sp.code || `SP-${String(i + 1).padStart(3, "0")}`).replace(/"/g, '""')}"`,
      `"${(sp.name || "").replace(/"/g, '""')}"`,
      `"${(sp.phone || "").replace(/"/g, '""')}"`,
      `"${(sp.email || "").replace(/"/g, '""')}"`,
      `"${(sp.gender || "").replace(/"/g, '""')}"`,
      `"${(sp.address || "").replace(/"/g, '""')}"`,
      `"${sp.is_active !== false ? "Active" : "Inactive"}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `Sales_Persons_Master_Directory_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (notify) notify("Exported sales persons list to Excel (.csv)");
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

    const tableRowsHtml = salesPersons
      .map(
        (sp, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 12px; font-family: monospace; font-weight: bold; color: #1e293b;">${sp.code || `SP-${String(idx + 1).padStart(3, "0")}`}</td>
          <td style="padding: 8px 12px; font-weight: 600; color: #0f172a;">${sp.name || "—"}</td>
          <td style="padding: 8px 12px; color: #475569;">${sp.phone || "—"}</td>
          <td style="padding: 8px 12px; color: #475569;">${sp.email || "—"}</td>
          <td style="padding: 8px 12px; color: #475569;">${sp.gender || "—"}</td>
          <td style="padding: 8px 12px; color: #475569;">${sp.address || "—"}</td>
          <td style="padding: 8px 12px;"><span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; ${sp.is_active !== false ? "background-color: #dcfce7; color: #15803d;" : "background-color: #f1f5f9; color: #64748b;"}">${sp.is_active !== false ? "Active" : "Inactive"}</span></td>
        </tr>
      `
      )
      .join("");

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sales Person Directory - ${dateStr}</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #0f172a; margin: 0; padding: 0; }
            .header { display: flex; justify-content: space-between; align-items: center; border-b: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 16px; }
            .title { font-size: 20px; font-weight: 700; color: #1e1b4b; }
            .subtitle { font-size: 12px; color: #64748b; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; }
            th { background-color: #f8fafc; color: #475569; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; padding: 10px 12px; border-bottom: 2px solid #cbd5e1; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">Sales Persons Directory</div>
              <div class="subtitle">Master Data Report &bull; Generated: ${dateStr}</div>
            </div>
            <div style="font-size: 12px; font-weight: 600; color: #6366f1;">Total Representatives: ${salesPersons.length}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Sales Person Name</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Gender</th>
                <th>Address</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);

    if (notify) notify("Generated Sales Person directory PDF print window");
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 transition-colors shadow-2xs cursor-pointer"
      >
        <Download size={14} className="text-slate-500" />
        <span>Export</span>
        <ChevronDown size={13} className="text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
          <button
            type="button"
            onClick={handleExportExcel}
            className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-emerald-50/70 hover:text-emerald-700 flex items-center gap-2 transition-colors cursor-pointer font-medium text-left"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Export as Excel</span>
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-rose-50/70 hover:text-rose-700 flex items-center gap-2 transition-colors cursor-pointer font-medium text-left"
          >
            <FileText size={14} className="text-rose-600" />
            <span>Export as PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function SalesPersonTable({
  salesPersons,
  search,
  setSearch,
  openCreateModal,
  openEditModal,
  toggleStatus,
  deleteSalesPerson,
  notify,
}: SalesPersonTableProps) {
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  const headers = [
    "Code",
    "Sales Person Name",
    "Contact",
    "Email",
    "Gender",
    "Address",
    "Status",
    "Actions",
  ];

  return (
    <Card className="p-0 overflow-hidden flex flex-col flex-1 min-h-0 border border-slate-200/80 shadow-xs">
      <div className="p-4 border-b border-slate-200/80 bg-white flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code, name, phone, email, address..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <ExportDropdown salesPersons={salesPersons} notify={notify} />
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>Add Sales Person</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto flex-1 min-h-0">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={`px-4 py-3 whitespace-nowrap ${
                    h === "Actions" ? "text-center" : ""
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {salesPersons.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-12 text-center text-slate-400 font-medium">
                  No sales persons found. Click &quot;Add Sales Person&quot; to create one.
                </td>
              </tr>
            ) : (
              salesPersons.map((sp, idx) => {
                const isActive = sp.is_active !== false;
                const menuOpen = activeMenuId === sp.id;

                return (
                  <tr
                    key={sp.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      idx % 2 === 1 ? "bg-slate-50/40" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-indigo-600 whitespace-nowrap">
                      {sp.code || `SP-${String(sp.id).padStart(3, "0")}`}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                      {sp.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-medium">
                      {sp.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {sp.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {sp.gender || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                      {sp.address || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={isActive ? "Active" : "Inactive"} />
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={() => setActiveMenuId(menuOpen ? null : sp.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {menuOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-20"
                              onClick={() => setActiveMenuId(null)}
                            />
                            <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1.5 z-30 text-xs text-left divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                              <div className="py-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    openEditModal(sp);
                                  }}
                                  className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 hover:bg-slate-100/70 font-medium transition-colors cursor-pointer"
                                >
                                  <Pencil size={14} /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    toggleStatus(sp);
                                  }}
                                  className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 hover:bg-slate-100/70 font-medium transition-colors cursor-pointer"
                                >
                                  <UserCheck size={14} /> {isActive ? "Set Inactive" : "Set Active"}
                                </button>
                              </div>
                              <div className="pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    deleteSalesPerson(sp.id);
                                  }}
                                  className="w-full flex items-center gap-2 px-3.5 py-2 text-rose-600 hover:bg-rose-50 font-medium transition-colors cursor-pointer"
                                >
                                  <Trash2 size={14} /> Delete
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
