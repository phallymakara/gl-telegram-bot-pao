/**
 * @file VendorModal.tsx
 * @description Modal form component for creating and editing vendor / supplier master data records.
 */

import { X } from "lucide-react";
import { VendorData } from "../../api";
import DraggableModalBox from "../../components/DraggableModalBox";

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
    <div
      className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <DraggableModalBox
        resetKey={editingVendor?.id ?? "new"}
        className="bg-white rounded-3xl shadow-none border border-slate-300 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <h3 className="font-semibold text-slate-800 text-base">
            {editingVendor ? "Edit Vendor Master Data" : "New Vendor Master Data"}
          </h3>
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
              <label className="text-xs font-semibold text-slate-600">Vendor Code *</label>
              <input
                type="text"
                placeholder="Vendor code"
                value={form.vendor_code}
                onChange={(e) => setForm((f) => ({ ...f, vendor_code: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Vendor / Supplier Name *</label>
              <input
                type="text"
                placeholder="Vendor or supplier name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Contact Person</label>
              <input
                type="text"
                placeholder="Contact person"
                value={form.contact_person}
                onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Phone Number</label>
              <input
                type="text"
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Email Address</label>
            <input
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
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
            {editingVendor ? "Update Vendor" : "Save Vendor"}
          </button>
        </div>
      </DraggableModalBox>
    </div>
  );
}
