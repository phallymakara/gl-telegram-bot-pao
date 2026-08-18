/**
 * @file CustomerModal.tsx
 * @description Form modal component for adding and editing customer master data (Customer Code, Name, Contact, Sex, DOB, Nation, Address, Status).
 */

import { X } from "lucide-react";
import { CustomerData } from "../../api";

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: {
    customer_code: string;
    name: string;
    contact: string;
    sex: string;
    dob: string;
    nation: string;
    address: string;
    is_active: boolean;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      customer_code: string;
      name: string;
      contact: string;
      sex: string;
      dob: string;
      nation: string;
      address: string;
      is_active: boolean;
    }>
  >;
  editingCustomer: CustomerData | null;
  onSave: () => void;
}

/**
 * Customer master data modal form component.
 */
export default function CustomerModal({
  isOpen,
  onClose,
  form,
  setForm,
  editingCustomer,
  onSave,
}: CustomerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-semibold text-slate-800 text-base">
            {editingCustomer ? "Edit Customer Master Data" : "New Customer Master Data"}
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
              <label className="text-xs font-semibold text-slate-600">Customer Code *</label>
              <input
                type="text"
                placeholder="e.g. CUST-001"
                value={form.customer_code}
                onChange={(e) => setForm((f) => ({ ...f, customer_code: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Customer Name *</label>
              <input
                type="text"
                placeholder="Enter customer name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Contact (Phone / Email)</label>
              <input
                type="text"
                placeholder="e.g. +855 12 345 678 / client@mail.com"
                value={form.contact}
                onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Sex / Gender</label>
              <select
                value={form.sex}
                onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">Select Sex</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Date of Birth (DOB)</label>
              <input
                type="date"
                value={form.dob}
                onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Nation / Nationality</label>
              <input
                type="text"
                placeholder="e.g. Cambodia, China, Singapore"
                value={form.nation}
                onChange={(e) => setForm((f) => ({ ...f, nation: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Address / Location</label>
            <textarea
              rows={2}
              placeholder="Enter customer address..."
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
            {editingCustomer ? "Update Customer" : "Save Customer"}
          </button>
        </div>
      </div>
    </div>
  );
}
