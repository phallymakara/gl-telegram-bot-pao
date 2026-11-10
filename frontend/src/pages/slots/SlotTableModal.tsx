/**
 * @file SlotTableModal.tsx
 * @description Modal form component for creating and editing slot pricing table rows and premiums.
 */

import { X } from "lucide-react";
import DraggableModalBox from "../../components/DraggableModalBox";

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
    <div
      className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <DraggableModalBox
        resetKey={`${title}_${isEditMode}`}
        className="bg-white rounded-3xl shadow-none border border-slate-300 w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <h3 className="font-semibold text-slate-800 text-base">{title}</h3>
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
            {isEditMode ? "Update Row" : "Add Row"}
          </button>
        </div>
      </DraggableModalBox>
    </div>
  );
}
