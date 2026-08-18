/**
 * @file CustomerTable.tsx
 * @description Sub-component rendering the scrollable customer master data table listing with sticky header and 3-dot action dropdown.
 * Columns: Customer Code | Customer Name | Contact | Sex | DOB | Nation | Address | Status | Action
 */

import { useState, useRef, useEffect } from "react";
import { Globe, MapPin, MoreVertical, Pencil, Plus, RefreshCw, Search, Trash2, Users } from "lucide-react";
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
        <button
          onClick={openCreateModal}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3.5 py-2 rounded-lg transition-colors shadow-xs cursor-pointer"
        >
          <Plus size={15} /> New Customer
        </button>
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
                  <td className="py-2 px-3 whitespace-nowrap">
                    {c.nation ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        <Globe size={12} className="text-slate-400 shrink-0" />
                        {c.nation}
                      </span>
                    ) : (
                      "—"
                    )}
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
