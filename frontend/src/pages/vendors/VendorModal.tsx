/**
 * @file VendorModal.tsx
 * @description Modal form component for creating and editing vendor / supplier master data records.
 */

import { X } from "lucide-react";
import { VendorData } from "../../api";

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: {
    vendor_code: string;
    name: string;
    supplier_type: string;
    contact_person: string;
    phone: string;
    email: string;
    address: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      vendor_code: string;
      name: string;
      supplier_type: string;
      contact_person: string;
      phone: string;
      email: string;
      address: string;
    }>
  >;
  editingVendor: VendorData | null;
  onSave: () => void;
}

/**
 * Vendor creation and editing form modal component.
 */
export default function VendorModal({
  isOpen,
  onClose,
  form,
  setForm,
  editingVendor,
  onSave,
}: VendorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-semibold text-slate-800 text-base">
            {editingVendor ? "Edit Vendor Master Data" : "New Vendor Master Data"}
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
              <label className="text-xs font-semibold text-slate-600">Vendor Code *</label>
              <input
                type="text"
                placeholder="e.g. VEND-001"
                value={form.vendor_code}
                onChange={(e) => setForm((f) => ({ ...f, vendor_code: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Vendor / Supplier Name *</label>
              <input
                type="text"
                placeholder="e.g. Singapore Bullion Vault"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Supplier Category</label>
              <select
                value={form.supplier_type}
                onChange={(e) => setForm((f) => ({ ...f, supplier_type: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="Oversea Refiner">Oversea Refiner (Swiss/Global)</option>
                <option value="Local Bullion Dealer">Local Bullion Dealer</option>
                <option value="Vault Custodian">Vault Custodian</option>
                <option value="Mint Supplier">Mint Supplier</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Contact Person</label>
              <input
                type="text"
                placeholder="Key Account Manager"
                value={form.contact_person}
                onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Phone Number</label>
              <input
                type="text"
                placeholder="+855 23 123 456"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Email Address</label>
              <input
                type="email"
                placeholder="supplier@refinery.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Office / Refinery Address</label>
            <textarea
              rows={2}
              placeholder="Full address details..."
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
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
            {editingVendor ? "Update Vendor" : "Save Vendor"}
          </button>
        </div>
      </div>
    </div>
  );
}
