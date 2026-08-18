/**
 * @file DeliveryModal.tsx
 * @description Modal form component for creating dispatch delivery notes.
 */

import { X } from "lucide-react";

interface DeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: {
    order_no: string;
    recipient_name: string;
    address: string;
    gold_qty_kg: string;
    driver_contact: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      order_no: string;
      recipient_name: string;
      address: string;
      gold_qty_kg: string;
      driver_contact: string;
    }>
  >;
  onSave: () => void;
}

/**
 * Delivery note creation form modal component.
 */
export default function DeliveryModal({
  isOpen,
  onClose,
  form,
  setForm,
  onSave,
}: DeliveryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-semibold text-slate-800 text-base">New Delivery Note</h3>
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
              <label className="text-xs font-semibold text-slate-600">Order Ref No.</label>
              <input
                type="text"
                placeholder="e.g. ORD-9901"
                value={form.order_no}
                onChange={(e) => setForm((f) => ({ ...f, order_no: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Gold Quantity (KG)</label>
              <input
                type="number"
                step="0.1"
                placeholder="1.0"
                value={form.gold_qty_kg}
                onChange={(e) => setForm((f) => ({ ...f, gold_qty_kg: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Recipient Name / Company</label>
            <input
              type="text"
              placeholder="e.g. Golden Lion Exchange"
              value={form.recipient_name}
              onChange={(e) => setForm((f) => ({ ...f, recipient_name: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Delivery Address</label>
            <textarea
              rows={2}
              placeholder="Full destination address..."
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Courier / Driver Phone</label>
            <input
              type="text"
              placeholder="+855 12 345 678"
              value={form.driver_contact}
              onChange={(e) => setForm((f) => ({ ...f, driver_contact: e.target.value }))}
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
            Dispatch Delivery
          </button>
        </div>
      </div>
    </div>
  );
}
