/**
 * @file PoFormModal.tsx
 * @description Modal form component for creating and editing Local & Oversea Purchase Orders.
 */

import { X } from "lucide-react";
import { SupplierData } from "../../api";

interface PoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: {
    purchase_source: "OVERSEA" | "LOCAL" | "BUYBACK";
    vendor_type: "Swiss" | "DB" | "SV";
    vendor_name: string;
    customer_name: string;
    trade_date: string;
    expected_delivery: string;
    trade_type: "BUY" | "SELL";
    qty_kg: string;
    spot_price: string;
    premium: string;
    currency: "USD" | "KHR";
    note: string;
    shipping_method?: string;
    tracking_no?: string;
    customs_fee?: string;
    port_of_origin?: string;
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  suppliers: SupplierData[];
  onSave: () => void;
}

/**
 * Purchase order creation and update form modal.
 */
export default function PoFormModal({
  isOpen,
  onClose,
  form,
  setForm,
  suppliers,
  onSave,
}: PoFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-100 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-semibold text-slate-800 text-base">
            Create Purchase Order ({form.purchase_source})
          </h3>
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
              <label className="text-xs font-semibold text-slate-600">PO Category</label>
              <select
                value={form.purchase_source}
                onChange={(e) => setForm((f: any) => ({ ...f, purchase_source: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="OVERSEA">Oversea Purchase Order</option>
                <option value="LOCAL">Local Purchase Order</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Supplier</label>
              <select
                value={form.vendor_name}
                onChange={(e) => setForm((f: any) => ({ ...f, vendor_name: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.supplier_type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Quantity (KG)</label>
              <input
                type="number"
                step="0.01"
                placeholder="10.00"
                value={form.qty_kg}
                onChange={(e) => setForm((f: any) => ({ ...f, qty_kg: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Spot Price ($/oz)</label>
              <input
                type="number"
                step="0.01"
                placeholder="2750.00"
                value={form.spot_price}
                onChange={(e) => setForm((f: any) => ({ ...f, spot_price: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Premium ($/KG)</label>
              <input
                type="number"
                step="0.01"
                placeholder="300.00"
                value={form.premium}
                onChange={(e) => setForm((f: any) => ({ ...f, premium: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Order Date</label>
              <input
                type="date"
                value={form.trade_date}
                onChange={(e) => setForm((f: any) => ({ ...f, trade_date: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Expected Delivery</label>
              <input
                type="date"
                value={form.expected_delivery}
                onChange={(e) => setForm((f: any) => ({ ...f, expected_delivery: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Notes & Special Instructions</label>
            <textarea
              rows={2}
              placeholder="Add shipping or assay notes..."
              value={form.note}
              onChange={(e) => setForm((f: any) => ({ ...f, note: e.target.value }))}
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
            Create Purchase Order
          </button>
        </div>
      </div>
    </div>
  );
}
