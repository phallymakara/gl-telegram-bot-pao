/**
 * @file ProductModal.tsx
 * @description Modal form component for adding and editing gold product master data (Product Name, Conversion Factor, Status).
 */

import { X } from "lucide-react";
import { ProductData } from "../../api";
import DraggableModalBox from "../../components/DraggableModalBox";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: {
    name: string;
    conversion_factor: string;
    is_active: boolean;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      name: string;
      conversion_factor: string;
      is_active: boolean;
    }>
  >;
  editingProduct: ProductData | null;
  onSave: () => void;
}

/**
 * Gold Product master data modal form component.
 */
export default function ProductModal({
  isOpen,
  onClose,
  form,
  setForm,
  editingProduct,
  onSave,
}: ProductModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <DraggableModalBox
        resetKey={editingProduct?.id ?? "new"}
        className="bg-white rounded-3xl shadow-none border border-slate-300 w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <h3 className="font-semibold text-slate-800 text-base">
            {editingProduct ? "Edit Gold Product" : "New Gold Product Master Data"}
          </h3>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[70vh]">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Product Name *</label>
            <input
              type="text"
              placeholder="Enter product name..."
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Conversion Factor *</label>
            <input
              type="number"
              step="0.00001"
              placeholder="Enter conversion factor..."
              value={form.conversion_factor}
              onChange={(e) => setForm((f) => ({ ...f, conversion_factor: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Status</label>
            <select
              value={form.is_active ? "active" : "inactive"}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.value === "active" }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-3.5 py-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 font-medium transition-colors focus:outline-none cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold transition-colors focus:outline-none cursor-pointer"
          >
            {editingProduct ? "Update Product" : "Save Product"}
          </button>
        </div>
      </DraggableModalBox>
    </div>
  );
}
