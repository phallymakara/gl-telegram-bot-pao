/**
 * @file InvoiceModal.tsx
 * @description Modal form component for generating new customer invoices.
 */

import { X } from "lucide-react";
import DraggableModalBox from "../../components/DraggableModalBox";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: {
    order_no: string;
    customer: string;
    amount_usd: string;
    gold_qty_kg: string;
    due_date: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      order_no: string;
      customer: string;
      amount_usd: string;
      gold_qty_kg: string;
      due_date: string;
    }>
  >;
  onSave: () => void;
}

/**
 * Invoice creation modal component.
 */
export default function InvoiceModal({
  isOpen,
  onClose,
  form,
  setForm,
  onSave,
}: InvoiceModalProps) {
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
          <h3 className="font-semibold text-slate-800 text-base">New Invoice</h3>
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
              <label className="text-xs font-semibold text-slate-600">Order Ref No.</label>
              <input
                type="text"
                placeholder="Order reference number"
                value={form.order_no}
                onChange={(e) => setForm((f) => ({ ...f, order_no: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Customer Name</label>
              <input
                type="text"
                placeholder="Customer or Company"
                value={form.customer}
                onChange={(e) => setForm((f) => ({ ...f, customer: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Gold Weight (KG)</label>
              <input
                type="number"
                step="0.1"
                placeholder="1.0"
                value={form.gold_qty_kg}
                onChange={(e) => setForm((f) => ({ ...f, gold_qty_kg: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Total Amount ($ USD)</label>
              <input
                type="number"
                step="0.01"
                placeholder="87500.00"
                value={form.amount_usd}
                onChange={(e) => setForm((f) => ({ ...f, amount_usd: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Payment Due Date</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
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
            Generate Invoice
          </button>
        </div>
      </DraggableModalBox>
    </div>
  );
}
