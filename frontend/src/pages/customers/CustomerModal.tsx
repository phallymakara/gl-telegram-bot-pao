/**
 * @file CustomerModal.tsx
 * @description Form modal component for adding and editing customer master data (Customer Code, Name, Contact, Sex, DOB, Nation, Address, Status).
 */

import { X } from "lucide-react";
import { CustomerData } from "../../api";
import DraggableModalBox from "../../components/DraggableModalBox";
import Select from "../../components/Select";

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: {
    customer_code: string;
    customer_type: string;
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
      customer_type: string;
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
    <div
      className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <DraggableModalBox
        resetKey={editingCustomer?.id ?? "new"}
        className="bg-white rounded-3xl shadow-none border border-slate-300 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <h3 className="font-semibold text-slate-800 text-base">
            {editingCustomer ? "Edit Customer Master Data" : "New Customer Master Data"}
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
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Customer Type *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, customer_type: "Individual" }))}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-colors cursor-pointer text-center ${
                  form.customer_type !== "Enterprise"
                    ? "bg-indigo-50 border-indigo-400 text-indigo-700"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, customer_type: "Enterprise" }))}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-colors cursor-pointer text-center ${
                  form.customer_type === "Enterprise"
                    ? "bg-purple-50 border-purple-400 text-purple-700"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Enterprise
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600">Customer Code *</label>
                <span className="text-[10px] text-slate-400">Auto or type</span>
              </div>
              <input
                type="text"
                placeholder="e.g. CUST-001"
                value={form.customer_code}
                onChange={(e) => setForm((f) => ({ ...f, customer_code: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">
                {form.customer_type === "Enterprise" ? "Enterprise / Company Name *" : "Customer Name *"}
              </label>
              <input
                type="text"
                placeholder={form.customer_type === "Enterprise" ? "Enter company name" : "Enter customer name"}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">
                {form.customer_type === "Enterprise" ? "Contact Person / Phone / Email" : "Contact (Phone / Email)"}
              </label>
              <input
                type="text"
                placeholder="Phone number or email address"
                value={form.contact}
                onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">
                {form.customer_type === "Enterprise" ? "Nation / Origin" : "Sex / Gender"}
              </label>
              {form.customer_type === "Enterprise" ? (
                <input
                  type="text"
                  placeholder="Country or nation"
                  value={form.nation}
                  onChange={(e) => setForm((f) => ({ ...f, nation: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              ) : (
                <Select
                  value={form.sex}
                  onChange={(val) => setForm((f) => ({ ...f, sex: val }))}
                  fullWidth
                  size="md"
                  placeholder="Select Sex"
                  options={[
                    { value: "Male", label: "Male" },
                    { value: "Female", label: "Female" },
                    { value: "Other", label: "Other" },
                  ]}
                />
              )}
            </div>
          </div>

          {form.customer_type !== "Enterprise" && (
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
                  placeholder="Country or nationality"
                  value={form.nation}
                  onChange={(e) => setForm((f) => ({ ...f, nation: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          )}

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
            <Select
              value={form.is_active ? "active" : "inactive"}
              onChange={(val) => setForm((f) => ({ ...f, is_active: val === "active" }))}
              fullWidth
              size="md"
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
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
            {editingCustomer ? "Update Customer" : "Save Customer"}
          </button>
        </div>
      </DraggableModalBox>
    </div>
  );
}
