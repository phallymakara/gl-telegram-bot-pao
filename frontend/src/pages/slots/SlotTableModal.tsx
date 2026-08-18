/**
 * @file SlotTableModal.tsx
 * @description Modal form component for creating and editing slot pricing table rows and premiums.
 */

import { X } from "lucide-react";

interface SlotTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate?: string;
  setEndDate?: (val: string) => void;
  premium: string;
  setPremium: (val: string) => void;
  qty?: string;
  setQty?: (val: string) => void;
  onSave: () => void;
  isEditMode: boolean;
}

/**
 * Modal form component for adding/editing slot pricing rows.
 */
export default function SlotTableModal({
  isOpen,
  onClose,
  title,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  premium,
  setPremium,
  qty,
  setQty,
  onSave,
  isEditMode,
}: SlotTableModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-semibold text-slate-800 text-base">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Slot Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {endDate !== undefined && setEndDate && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Premium ($/KG)</label>
            <input
              type="number"
              step="0.01"
              value={premium}
              onChange={(e) => setPremium(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {qty !== undefined && setQty && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Quantity (KG)</label>
              <input
                type="number"
                step="0.01"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          )}
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
            {isEditMode ? "Update Row" : "Add Row"}
          </button>
        </div>
      </div>
    </div>
  );
}
