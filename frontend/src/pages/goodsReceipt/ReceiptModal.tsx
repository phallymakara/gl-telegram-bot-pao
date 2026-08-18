/**
 * @file ReceiptModal.tsx
 * @description Modal form component for creating goods receipt vouchers upon supplier delivery.
 */

import { X } from "lucide-react";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: {
    po_no: string;
    supplier: string;
    quantity_kg: string;
    received_date: string;
    notes: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      po_no: string;
      supplier: string;
      quantity_kg: string;
      received_date: string;
      notes: string;
    }>
  >;
  onSave: () => void;
}

/**
 * Goods receipt creation modal component.
 */
export default function ReceiptModal({
  isOpen,
  onClose,
  form,
  setForm,
  onSave,
}: ReceiptModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-semibold text-slate-800 text-base">New Goods Receipt</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">PO Ref No.</label>
              <input
                type="text"
                placeholder="e.g. PO-LOCAL-101"
                value={form.po_no}
                onChange={(e) => setForm((f) => ({ ...f, po_no: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Quantity (KG)</label>
              <input
                type="number"
                step="0.1"
                placeholder="25.0"
                value={form.quantity_kg}
                onChange={(e) => setForm((f) => ({ ...f, quantity_kg: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Supplier Name</label>
            <input
              type="text"
              placeholder="e.g. Phnom Penh Precious Metals"
              value={form.supplier}
              onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Received Date</label>
            <input
              type="date"
              value={form.received_date}
              onChange={(e) => setForm((f) => ({ ...f, received_date: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Assay Verification Notes</label>
            <textarea
              rows={2}
              placeholder="Vault delivery verification details..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
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
            Save Goods Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
