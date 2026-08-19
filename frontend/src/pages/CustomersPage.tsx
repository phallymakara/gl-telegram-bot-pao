/**
 * @file CustomersPage.tsx
 * @description Master Data - Customers page component managing client directory, codes, names, contact info, sex, DOB, nation, and status with status toggle.
 */

import { useEffect, useMemo, useState } from "react";
import { UserCheck, Users, UserX } from "lucide-react";
import StatCard from "../components/StatCard";
import { CustomerData, customersApi } from "../api";
import CustomerTable from "./customers/CustomerTable";
import CustomerModal from "./customers/CustomerModal";

interface CustomersPageProps {
  /** Toast notification trigger callback */
  notify: (msg: string) => void;
}

/**
 * Master Data Customers page component.
 */
export default function CustomersPage({ notify }: CustomersPageProps) {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerData | null>(null);

  const [form, setForm] = useState({
    customer_code: "",
    name: "",
    contact: "",
    sex: "",
    dob: "",
    nation: "",
    address: "",
    is_active: true,
  });

  function loadCustomers() {
    customersApi
      .getCustomers()
      .then(setCustomers)
      .catch(() => {
        setCustomers([]);
      });
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        (c.customer_code || "").toLowerCase().includes(q) ||
        (c.name || "").toLowerCase().includes(q) ||
        (c.contact || "").toLowerCase().includes(q) ||
        (c.sex || "").toLowerCase().includes(q) ||
        (c.dob || "").toLowerCase().includes(q) ||
        (c.nation || "").toLowerCase().includes(q) ||
        (c.address || "").toLowerCase().includes(q)
    );
  }, [customers, search]);

  function openCreateModal() {
    setEditingCustomer(null);
    setForm({
      customer_code: `CUST-${String(customers.length + 1).padStart(3, "0")}`,
      name: "",
      contact: "",
      sex: "",
      dob: "",
      nation: "",
      address: "",
      is_active: true,
    });
    setIsOpen(true);
  }

  function openEditModal(c: CustomerData) {
    setEditingCustomer(c);
    setForm({
      customer_code: c.customer_code || `CUST-${c.id}`,
      name: c.name || "",
      contact: c.contact || "",
      sex: c.sex || "",
      dob: c.dob || "",
      nation: c.nation || "",
      address: c.address || "",
      is_active: c.is_active !== false,
    });
    setIsOpen(true);
  }

  function toggleStatus(c: CustomerData) {
    const newStatus = c.is_active === false ? true : false;
    customersApi
      .updateCustomer(c.id, { is_active: newStatus })
      .then((updated) => {
        setCustomers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        notify(`Customer status changed to ${newStatus ? "Active" : "Inactive"}`);
      })
      .catch((e: Error) => notify(e.message));
  }

  function handleSave() {
    if (!form.customer_code.trim()) {
      notify("Please enter a valid Customer Code");
      return;
    }
    if (!form.name.trim()) {
      notify("Please enter Customer Name");
      return;
    }

    if (editingCustomer) {
      customersApi
        .updateCustomer(editingCustomer.id, {
          customer_code: form.customer_code,
          name: form.name,
          contact: form.contact,
          sex: form.sex,
          dob: form.dob,
          nation: form.nation,
          address: form.address,
          is_active: form.is_active,
        })
        .then((updated) => {
          setCustomers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
          setIsOpen(false);
          notify("Customer master data updated successfully");
        })
        .catch((e: Error) => notify(e.message));
    } else {
      customersApi
        .createCustomer({
          customer_code: form.customer_code,
          name: form.name,
          contact: form.contact,
          sex: form.sex,
          dob: form.dob,
          nation: form.nation,
          address: form.address,
          is_active: form.is_active,
        })
        .then((created) => {
          setCustomers((prev) => [created, ...prev]);
          setIsOpen(false);
          notify("New customer created successfully");
        })
        .catch((e: Error) => notify(e.message));
    }
  }

  function deleteCustomer(id: number) {
    customersApi
      .deleteCustomer(id)
      .then(() => {
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        notify("Customer record removed");
      })
      .catch((e: Error) => notify(e.message));
  }

  return (
    <div className="flex-1 p-4 sm:p-6 min-w-0 overflow-hidden w-full flex flex-col space-y-3.5 min-h-0">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-shrink-0">
        <StatCard
          icon={Users}
          label="Total Master Customers"
          value={customers.length}
          sub="Registered client directory"
          tint="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={UserCheck}
          label="Active Accounts"
          value={customers.filter((c) => c.is_active !== false).length}
          sub="Active trade clients"
          tint="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={UserX}
          label="Inactive Accounts"
          value={customers.filter((c) => c.is_active === false).length}
          sub="Suspended / disabled clients"
          tint="bg-amber-50 text-amber-600"
        />
      </div>

      <CustomerTable
        customers={filtered}
        search={search}
        setSearch={setSearch}
        openCreateModal={openCreateModal}
        openEditModal={openEditModal}
        toggleStatus={toggleStatus}
        deleteCustomer={deleteCustomer}
        notify={notify}
      />

      <CustomerModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        form={form}
        setForm={setForm}
        editingCustomer={editingCustomer}
        onSave={handleSave}
      />
    </div>
  );
}
