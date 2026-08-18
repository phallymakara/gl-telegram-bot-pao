/**
 * @file ProductTable.tsx
 * @description Sub-component rendering the scrollable gold products master data table listing with sticky header and 3-dot action dropdown.
 * Columns: Product Name | Conversion Factor | Status | Action
 */

import { useState, useRef, useEffect } from "react";
import { MoreVertical, Package, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import Card from "../../components/Card";
import StatusBadge from "../../components/StatusBadge";
import { ProductData } from "../../api";

interface ProductTableProps {
  products: ProductData[];
  openCreateModal: () => void;
  openEditModal: (p: ProductData) => void;
  toggleStatus: (p: ProductData) => void;
  deleteProduct: (id: number) => void;
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
 * Product master data list table component with sticky header scrolling.
 */
export default function ProductTable({
  products,
  openCreateModal,
  openEditModal,
  toggleStatus,
  deleteProduct,
}: ProductTableProps) {
  return (
    <Card className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 sm:p-5">
      <div className="flex items-center justify-end gap-3 mb-3.5 flex-shrink-0">
        <button
          onClick={openCreateModal}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3.5 py-2 rounded-lg transition-colors shadow-xs cursor-pointer"
        >
          <Plus size={15} /> New Product
        </button>
      </div>

      <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
        {products.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Package size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-medium">No gold product catalog items found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Add a new product specification to build your master catalog.</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="text-left text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                <th className="py-2.5 px-3 font-semibold bg-slate-50">Product Name</th>
                <th className="py-2.5 px-3 font-semibold bg-slate-50">Conversion Factor</th>
                <th className="py-2.5 px-3 font-semibold bg-slate-50">Status</th>
                <th className="py-2.5 px-3 font-semibold text-right bg-slate-50">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">
                    {p.name}
                  </td>
                  <td className="py-2 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                    {p.conversion_factor ?? 1.0}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <StatusBadge status={p.is_active !== false ? "Active" : "Inactive"} />
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap">
                    <ActionMenu
                      isActive={p.is_active}
                      onChangeStatus={() => toggleStatus(p)}
                      onEdit={() => openEditModal(p)}
                      onDelete={() => deleteProduct(p.id)}
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
