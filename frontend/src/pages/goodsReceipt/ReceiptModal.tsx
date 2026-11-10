/**
 * @file ReceiptModal.tsx
 * @description Modal form component for creating goods receipt vouchers upon supplier delivery.
 */

import { X } from "lucide-react";
import DraggableModalBox from "../../components/DraggableModalBox";

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
    <div
      className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <DraggableModalBox
        resetKey={isOpen}
        className="bg-white rounded-3xl shadow-none border border-slate-300 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <h3 className="font-semibold text-slate-800 text-base">New Goods Receipt</h3>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">PO Ref No.</label>
              <input
                type="text"
                placeholder="Purchase order reference number"
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
                placeholder="Quantity in kg"
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
              placeholder="Supplier name"
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
            Save Goods Receipt
          </button>
        </div>
      </DraggableModalBox>
    </div>
  );
}
