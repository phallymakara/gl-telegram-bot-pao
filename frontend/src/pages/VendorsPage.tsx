/**
 * @file VendorsPage.tsx
 * @description Master Data - Vendors & Suppliers page component for managing gold refiners, local dealers, and vault custodians with status toggle.
 */

import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, Store } from "lucide-react";
import StatCard from "../components/StatCard";
import { VendorData, vendorsApi } from "../api";
import VendorTable from "./vendors/VendorTable";
import VendorModal from "./vendors/VendorModal";

interface VendorsPageProps {
  /** Toast notification trigger callback */
  notify: (msg: string) => void;
}

/**
 * Vendors Master Data management page component.
 */
export default function VendorsPage({ notify }: VendorsPageProps) {
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorData | null>(null);

  const [form, setForm] = useState({
    vendor_code: "",
    name: "",
    supplier_type: "Oversea Refiner",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
  });

  function loadVendors() {
    vendorsApi
      .getVendors()
      .then(setVendors)
      .catch(() => notify("Failed to load vendor list"));
  }

  useEffect(() => {
    loadVendors();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return vendors;
    const q = search.toLowerCase();
    return vendors.filter(
      (v) =>
        (v.vendor_code || "").toLowerCase().includes(q) ||
        v.name.toLowerCase().includes(q) ||
        (v.supplier_type || "").toLowerCase().includes(q) ||
        (v.contact_person || "").toLowerCase().includes(q) ||
        (v.phone || "").toLowerCase().includes(q) ||
        (v.email || "").toLowerCase().includes(q)
    );
  }, [vendors, search]);

  function openCreateModal() {
    setEditingVendor(null);
    setForm({
      vendor_code: `VEND-${String(vendors.length + 1).padStart(3, "0")}`,
      name: "",
      supplier_type: "Oversea Refiner",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
    });
    setIsOpen(true);
  }

  function openEditModal(v: VendorData) {
    setEditingVendor(v);
    setForm({
      vendor_code: v.vendor_code || `VEND-${v.id}`,
      name: v.name,
      supplier_type: v.supplier_type,
      contact_person: v.contact_person || "",
      phone: v.phone || "",
      email: v.email || "",
      address: v.address || "",
    });
    setIsOpen(true);
  }

  function toggleStatus(v: VendorData) {
    const newStatus = v.is_active === false ? true : false;
    vendorsApi
      .updateVendor(v.id, { is_active: newStatus })
      .then((updated) => {
        setVendors((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        notify(`Vendor status changed to ${newStatus ? "Active" : "Inactive"}`);
      })
      .catch((e: Error) => notify(e.message));
  }

  function handleSave() {
    if (!form.name.trim()) {
      notify("Please enter Vendor / Supplier Name");
      return;
    }

    if (editingVendor) {
      vendorsApi
        .updateVendor(editingVendor.id, {
          vendor_code: form.vendor_code,
          name: form.name,
          supplier_type: form.supplier_type,
          contact_person: form.contact_person || null,
          phone: form.phone || null,
          email: form.email || null,
          address: form.address || null,
        })
        .then((updated) => {
          setVendors((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
          setIsOpen(false);
          notify("Vendor updated successfully");
        })
        .catch((e: Error) => notify(e.message));
    } else {
      vendorsApi
        .createVendor({
          vendor_code: form.vendor_code,
          name: form.name,
          supplier_type: form.supplier_type,
          contact_person: form.contact_person || null,
          phone: form.phone || null,
          email: form.email || null,
          address: form.address || null,
          is_active: true,
        })
        .then((created) => {
          setVendors((prev) => [created, ...prev]);
          setIsOpen(false);
          notify("Vendor created successfully");
        })
        .catch((e: Error) => notify(e.message));
    }
  }

  function deleteVendor(id: number) {
    vendorsApi
      .deleteVendor(id)
      .then(() => {
        setVendors((prev) => prev.filter((v) => v.id !== id));
        notify("Vendor record removed");
      })
      .catch((e: Error) => notify(e.message));
  }

  return (
    <div className="flex-1 p-4 sm:p-6 min-w-0 overflow-hidden w-full flex flex-col space-y-3.5 min-h-0">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-shrink-0">
        <StatCard
          icon={Store}
          label="Total Gold Vendors"
          value={vendors.length}
          sub="Registered supplier partners"
          tint="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={Building2}
          label="Oversea Refiners"
          value={
            vendors.filter(
              (v) =>
                v.supplier_type.toLowerCase().includes("oversea") ||
                v.supplier_type.toLowerCase().includes("swiss")
            ).length
          }
          sub="Global refinery partners"
          tint="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Active Suppliers"
          value={vendors.filter((v) => v.is_active !== false).length}
          sub="Verified procurement sources"
          tint="bg-emerald-50 text-emerald-600"
        />
      </div>

      <VendorTable
        vendors={filtered}
        search={search}
        setSearch={setSearch}
        openCreateModal={openCreateModal}
        openEditModal={openEditModal}
        toggleStatus={toggleStatus}
        deleteVendor={deleteVendor}
        notify={notify}
      />

      <VendorModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        form={form}
        setForm={setForm}
        editingVendor={editingVendor}
        onSave={handleSave}
      />
    </div>
  );
}
