/**
 * @file AdjustmentModal.tsx
 * @description Modal form component for recording stock inventory adjustments (Inflow / Outflow).
 */

import { X } from "lucide-react";
import DraggableModalBox from "../../components/DraggableModalBox";

interface AdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: {
    date: string;
    type: string;
    amount: string;
    reason: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      date: string;
      type: string;
      amount: string;
      reason: string;
    }>
  >;
  onSave: () => void;
}

/**
 * Modal form component for recording inventory stock adjustments.
 */
export default function AdjustmentModal({
  isOpen,
  onClose,
  form,
  setForm,
  onSave,
}: AdjustmentModalProps) {
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
        className="bg-white rounded-3xl shadow-none border border-slate-300 w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <h3 className="font-semibold text-slate-800 text-base">Record Stock Adjustment</h3>
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
            <label className="text-xs font-semibold text-slate-600">Adjustment Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="INFLOW">INFLOW (Stock Received / Added)</option>
              <option value="OUTFLOW">OUTFLOW (Stock Delivered / Removed)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Quantity (KG)</label>
            <input
              type="number"
              step="0.01"
              placeholder="Quantity in kg"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Reason / Notes</label>
            <textarea
              rows={3}
              placeholder="Enter reason for stock adjustment..."
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
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
            Save Adjustment
          </button>
        </div>
      </DraggableModalBox>
    </div>
  );
}
