/**
 * @file SalesPersonsPage.tsx
 * @description Master Data - Sales Persons page component managing sales representative directory, codes, names, contact info, status, and CRUD actions.
 */

import React, { useEffect, useMemo, useState } from "react";
import { UserCheck, Users, UserX } from "lucide-react";
import StatCard from "../components/StatCard";
import { SalesPersonData, salesPersonsApi } from "../api";
import SalesPersonTable from "./salesPersons/SalesPersonTable";
import SalesPersonModal from "./salesPersons/SalesPersonModal";

interface SalesPersonsPageProps {
  /** Toast notification trigger callback */
  notify: (msg: string) => void;
}

export default function SalesPersonsPage({ notify }: SalesPersonsPageProps) {
  const [salesPersons, setSalesPersons] = useState<SalesPersonData[]>([]);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingSalesPerson, setEditingSalesPerson] = useState<SalesPersonData | null>(null);

  const [form, setForm] = useState({
    code: "",
    name: "",
    phone: "",
    email: "",
    gender: "",
    address: "",
    is_active: true,
  });

  function loadSalesPersons() {
    salesPersonsApi
      .getSalesPersons()
      .then(setSalesPersons)
      .catch(() => {
        setSalesPersons([]);
      });
  }

  useEffect(() => {
    loadSalesPersons();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return salesPersons;
    const q = search.toLowerCase();
    return salesPersons.filter(
      (sp) =>
        (sp.code || "").toLowerCase().includes(q) ||
        (sp.name || "").toLowerCase().includes(q) ||
        (sp.phone || "").toLowerCase().includes(q) ||
        (sp.email || "").toLowerCase().includes(q) ||
        (sp.gender || "").toLowerCase().includes(q) ||
        (sp.address || "").toLowerCase().includes(q)
    );
  }, [salesPersons, search]);

  function openCreateModal() {
    setEditingSalesPerson(null);
    setForm({
      code: `SP-${String(salesPersons.length + 1).padStart(3, "0")}`,
      name: "",
      phone: "",
      email: "",
      gender: "",
      address: "",
      is_active: true,
    });
    setIsOpen(true);
  }

  function openEditModal(sp: SalesPersonData) {
    setEditingSalesPerson(sp);
    setForm({
      code: sp.code || `SP-${sp.id}`,
      name: sp.name || "",
      phone: sp.phone || "",
      email: sp.email || "",
      gender: sp.gender || "",
      address: sp.address || "",
      is_active: sp.is_active !== false,
    });
    setIsOpen(true);
  }

  function toggleStatus(sp: SalesPersonData) {
    const newStatus = sp.is_active === false ? true : false;
    salesPersonsApi
      .updateSalesPerson(sp.id, { is_active: newStatus })
      .then((updated) => {
        setSalesPersons((prev) => prev.map((item) => (item.id === sp.id ? updated : item)));
        notify(`Updated status for ${sp.name} to ${newStatus ? "Active" : "Inactive"}`);
      })
      .catch(() => notify("Failed to update status"));
  }

  function deleteSalesPerson(id: number) {
    if (!confirm("Are you sure you want to delete this sales person?")) return;
    salesPersonsApi
      .deleteSalesPerson(id)
      .then(() => {
        setSalesPersons((prev) => prev.filter((sp) => sp.id !== id));
        notify("Sales person deleted successfully");
      })
      .catch(() => notify("Failed to delete sales person"));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      notify("Please enter sales person name");
      return;
    }

    if (editingSalesPerson) {
      salesPersonsApi
        .updateSalesPerson(editingSalesPerson.id, form)
        .then((updated) => {
          setSalesPersons((prev) =>
            prev.map((item) => (item.id === editingSalesPerson.id ? updated : item))
          );
          notify("Sales person updated successfully");
          setIsOpen(false);
        })
        .catch(() => notify("Failed to update sales person"));
    } else {
      salesPersonsApi
        .createSalesPerson(form)
        .then((created) => {
          setSalesPersons((prev) => [created, ...prev]);
          notify("Sales person created successfully");
          setIsOpen(false);
        })
        .catch(() => notify("Failed to create sales person"));
    }
  }

  const activeCount = salesPersons.filter((sp) => sp.is_active !== false).length;
  const inactiveCount = salesPersons.length - activeCount;

  return (
    <div className="flex-1 pt-4 px-4 pb-2 sm:pt-4 sm:px-8 sm:pb-2 min-w-0 overflow-hidden w-full flex flex-col space-y-3 min-h-0">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-shrink-0">
        <StatCard
          icon={Users}
          label="Total Sales Persons"
          value={salesPersons.length}
          sub={salesPersons.length > 0 ? `${salesPersons.length} Registered` : "0 Registered"}
        />
        <StatCard
          icon={UserCheck}
          label="Active Representatives"
          value={activeCount}
          sub={salesPersons.length > 0 ? `${Math.round((activeCount / salesPersons.length) * 100)}% Active` : "0%"}
        />
        <StatCard
          icon={UserX}
          label="Inactive Sales Persons"
          value={inactiveCount}
          sub={inactiveCount > 0 ? "Requires review" : "All Active"}
        />
      </div>

      <SalesPersonTable
        salesPersons={filtered}
        search={search}
        setSearch={setSearch}
        openCreateModal={openCreateModal}
        openEditModal={openEditModal}
        toggleStatus={toggleStatus}
        deleteSalesPerson={deleteSalesPerson}
        notify={notify}
      />

      <SalesPersonModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        editingSalesPerson={editingSalesPerson}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
