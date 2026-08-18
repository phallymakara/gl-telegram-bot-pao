/**
 * @file ProductModal.tsx
 * @description Modal form component for adding and editing gold product master data (Product Name, Conversion Factor, Status).
 */

import { X } from "lucide-react";
import { ProductData } from "../../api";

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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-semibold text-slate-800 text-base">
            {editingProduct ? "Edit Gold Product" : "New Gold Product Master Data"}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Product Name *</label>
            <input
              type="text"
              placeholder="Enter product name (e.g. Kilobar, Baht Gold)..."
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
              placeholder="e.g. 1.0, 0.02667, 0.0375"
              value={form.conversion_factor}
              onChange={(e) => setForm((f) => ({ ...f, conversion_factor: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
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

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
          >
            {editingProduct ? "Update Product" : "Save Product"}
          </button>
        </div>
      </div>
    </div>
  );
}
