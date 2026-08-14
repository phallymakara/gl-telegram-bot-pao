import React, { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Search,
  UserCheck,
  Building2,
  Phone,
  Mail,
  Trash2,
  ShieldCheck,
  UserPlus
} from "lucide-react";
import Card from "../components/Card";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import { api, CustomerData, SupplierData } from "../data/api";

interface ContactsPageProps {
  notify: (msg: string) => void;
}

export default function ContactsPage({ notify }: ContactsPageProps) {
  const [activeTab, setActiveTab] = useState<"customers" | "suppliers">("customers");
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Customer Form
  const [custForm, setCustForm] = useState({
    username: "",
    telegram_user_id: "",
    display_name: ""
  });

  // Supplier Form
  const [suppForm, setSuppForm] = useState({
    name: "",
    supplier_type: "LOCAL",
    contact_person: "",
    phone: "",
    email: "",
    address: ""
  });

  useEffect(() => {
    api
      .get<CustomerData[]>("/api/customers/")
      .then(setCustomers)
      .catch(() => notify("Failed to load customers"));

    api
      .get<SupplierData[]>("/api/suppliers/")
      .then(setSuppliers)
      .catch(() => notify("Failed to load suppliers"));
  }, []);

  function addCustomer() {
    if (!custForm.username.trim() && !custForm.telegram_user_id.trim()) {
      notify("Please provide a username or Telegram User ID");
      return;
    }
    api
      .post<CustomerData>("/api/customers/", {
        username: custForm.username.trim() || null,
        telegram_user_id: custForm.telegram_user_id.trim() || null,
        display_name: custForm.display_name.trim() || null
      })
      .then((c) => {
        setCustomers((prev) => [c, ...prev]);
        setCustForm({ username: "", telegram_user_id: "", display_name: "" });
        setIsOpen(false);
        notify("Customer contact added successfully");
      })
      .catch((e: Error) => notify(e.message));
  }

  function removeCustomer(id: number) {
    api
      .delete(`/api/customers/${id}`)
      .then(() => {
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        notify("Customer contact removed");
      })
      .catch((e: Error) => notify(e.message));
  }

  function addSupplier() {
    if (!suppForm.name.trim()) {
      notify("Please provide a supplier name");
      return;
    }
    api
      .post<SupplierData>("/api/suppliers/", suppForm)
      .then((s) => {
        setSuppliers((prev) => [s, ...prev]);
        setSuppForm({
          name: "",
          supplier_type: "LOCAL",
          contact_person: "",
          phone: "",
          email: "",
          address: ""
        });
        setIsOpen(false);
        notify("Supplier contact added successfully");
      })
      .catch((e: Error) => notify(e.message));
  }

  function removeSupplier(id: number) {
    api
      .delete(`/api/suppliers/${id}`)
      .then(() => {
        setSuppliers((prev) => prev.filter((s) => s.id !== id));
        notify("Supplier contact removed");
      })
      .catch((e: Error) => notify(e.message));
  }

  const filteredCustomers = customers.filter(
    (c) =>
      (c.username && c.username.toLowerCase().includes(search.toLowerCase())) ||
      (c.telegram_user_id && c.telegram_user_id.includes(search)) ||
      (c.display_name && c.display_name.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.contact_person && s.contact_person.toLowerCase().includes(search.toLowerCase())) ||
      (s.phone && s.phone.includes(search))
  );

  return (
    <div className="flex-1 p-4 sm:p-8 min-w-0 overflow-y-auto w-full flex flex-col space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={UserCheck}
          label="Whitelisted Customers"
          value={customers.length}
          sub="Telegram Bot allowed users"
          tint="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={Building2}
          label="Registered Suppliers"
          value={suppliers.length}
          sub="Local & Oversea partners"
          tint="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={ShieldCheck}
          label="Total Contacts"
          value={customers.length + suppliers.length}
          sub="Master directory"
          tint="bg-emerald-50 text-emerald-600"
        />
      </div>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-1 bg-slate-50">
            <button
              onClick={() => setActiveTab("customers")}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === "customers"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Telegram Customers ({customers.length})
            </button>
            <button
              onClick={() => setActiveTab("suppliers")}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === "suppliers"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Suppliers ({suppliers.length})
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder={
                  activeTab === "customers"
                    ? "Search username or ID..."
                    : "Search supplier name..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <button
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors shadow-sm whitespace-nowrap"
            >
              <Plus size={16} /> Add {activeTab === "customers" ? "Customer" : "Supplier"}
            </button>
          </div>
        </div>

        {activeTab === "customers" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50/50">
                  <th className="pb-3 pt-2 px-3 font-medium">Username</th>
                  <th className="pb-3 pt-2 px-3 font-medium">Display Name</th>
                  <th className="pb-3 pt-2 px-3 font-medium">Telegram User ID</th>
                  <th className="pb-3 pt-2 px-3 font-medium">Date Added</th>
                  <th className="pb-3 pt-2 px-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400 text-sm">
                      No customer contacts found.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-semibold text-indigo-600">
                        {c.username ? `@${c.username}` : "—"}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700">
                        {c.display_name || "—"}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-500">
                        {c.telegram_user_id || "—"}
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-xs">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => removeCustomer(c.id)}
                          className="text-rose-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50"
                          title="Remove customer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50/50">
                  <th className="pb-3 pt-2 px-3 font-medium">Supplier Name</th>
                  <th className="pb-3 pt-2 px-3 font-medium">Type</th>
                  <th className="pb-3 pt-2 px-3 font-medium">Contact Person</th>
                  <th className="pb-3 pt-2 px-3 font-medium">Phone / Email</th>
                  <th className="pb-3 pt-2 px-3 font-medium">Address</th>
                  <th className="pb-3 pt-2 px-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 text-sm">
                      No supplier contacts found.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((s) => (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-semibold text-slate-800">{s.name}</td>
                      <td className="py-3 px-3">
                        <StatusBadge status={s.supplier_type} />
                      </td>
                      <td className="py-3 px-3 text-slate-600">{s.contact_person || "—"}</td>
                      <td className="py-3 px-3 text-slate-500 text-xs">
                        {s.phone && <div>{s.phone}</div>}
                        {s.email && <div className="text-slate-400">{s.email}</div>}
                        {!s.phone && !s.email && "—"}
                      </td>
                      <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                        {s.address || "—"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => removeSupplier(s.id)}
                          className="text-rose-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50"
                          title="Remove supplier"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-slate-800 text-base flex items-center gap-2">
                <UserPlus size={18} className="text-indigo-600" /> Add New{" "}
                {activeTab === "customers" ? "Telegram Customer" : "Supplier"}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            {activeTab === "customers" ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Username (without @) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. john_gold"
                    value={custForm.username}
                    onChange={(e) => setCustForm({ ...custForm, username: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={custForm.display_name}
                    onChange={(e) => setCustForm({ ...custForm, display_name: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Telegram User ID (Numeric ID)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 123456789"
                    value={custForm.telegram_user_id}
                    onChange={(e) => setCustForm({ ...custForm, telegram_user_id: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Supplier Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Company or Refinery Name"
                    value={suppForm.name}
                    onChange={(e) => setSuppForm({ ...suppForm, name: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Supplier Type
                    </label>
                    <select
                      value={suppForm.supplier_type}
                      onChange={(e) => setSuppForm({ ...suppForm, supplier_type: e.target.value })}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="LOCAL">LOCAL</option>
                      <option value="OVERSEA">OVERSEA</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      placeholder="Name"
                      value={suppForm.contact_person}
                      onChange={(e) => setSuppForm({ ...suppForm, contact_person: e.target.value })}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                    <input
                      type="text"
                      placeholder="+855..."
                      value={suppForm.phone}
                      onChange={(e) => setSuppForm({ ...suppForm, phone: e.target.value })}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="info@..."
                      value={suppForm.email}
                      onChange={(e) => setSuppForm({ ...suppForm, email: e.target.value })}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
                  <input
                    type="text"
                    placeholder="Full address..."
                    value={suppForm.address}
                    onChange={(e) => setSuppForm({ ...suppForm, address: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={activeTab === "customers" ? addCustomer : addSupplier}
                className="text-xs px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
                Save Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
