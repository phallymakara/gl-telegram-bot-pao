import React, { useState } from "react";
import { Package, Plus, Download, Eye, Pencil, ShoppingCart, TrendingUp } from "lucide-react";
import Card from "../components/Card";
import IconBtn from "../components/IconBtn";
import StatCard from "../components/StatCard";
import { physicalOrdersSeed } from "../data/mockData";

interface PhysicalOrdersPageProps {
  notify: (msg: string) => void;
}

export default function PhysicalOrdersPage({ notify }: PhysicalOrdersPageProps) {
  const [rows, setRows] = useState(physicalOrdersSeed);
  const [form, setForm] = useState({ name: "", date: "2025-05-23", type: "", qty: "", total: "" });
  const [isOpen, setIsOpen] = useState(false);

  function save() {
    if (!form.name || !form.type || !form.qty || !form.total) {
      notify("Please fill in all required fields");
      return;
    }
    setRows((r) => [
      {
        id: Date.now(),
        customer: form.name,
        date: form.date ? new Date(form.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "May 23, 2025",
        type: form.type,
        qty: +form.qty,
        total: +form.total
      },
      ...r
    ]);
    setForm({ name: "", date: "2025-05-23", type: "", qty: "", total: "" });
    setIsOpen(false);
    notify("Order saved");
  }

  return (
    <div className="flex-1 pt-4 px-4 pb-2 sm:pt-4 sm:px-8 sm:pb-2 min-w-0 overflow-hidden w-full flex flex-col space-y-3 min-h-0">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-shrink-0">
        <div className="md:col-span-2">
          <StatCard
            icon={Package}
            label="Total Stock"
            value={<>39.60 <span className="text-sm font-normal text-slate-400">KG</span></>}
            sub="Active Inventory"
            tint="bg-indigo-50 text-indigo-600"
          />
        </div>
        <div className="md:col-span-1">
          <StatCard
            icon={ShoppingCart}
            label="Total Orders"
            value={rows.length}
            sub="Today"
            tint="bg-indigo-50 text-indigo-600"
          />
        </div>
        <div className="md:col-span-1">
          <StatCard
            icon={TrendingUp}
            label="Total Buy"
            value={<>{rows.filter(r => r.type === "Buy").reduce((sum, r) => sum + r.qty, 0).toFixed(2)} <span className="text-sm font-normal text-slate-400">KG</span></>}
            sub="Today"
            tint="bg-emerald-50 text-emerald-600"
          />
        </div>
        <div className="md:col-span-1">
          <StatCard
            icon={TrendingUp}
            label="Total Sell"
            value={<>{rows.filter(r => r.type === "Sell").reduce((sum, r) => sum + r.qty, 0).toFixed(2)} <span className="text-sm font-normal text-slate-400">KG</span></>}
            sub="Today"
            tint="bg-rose-50 text-rose-600"
          />
        </div>
      </div>
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h3 className="font-semibold text-slate-800">
            Physical Orders List{" "}
            <span className="ml-2 text-xs font-normal bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
              {rows.length} Orders
            </span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium shrink-0 shadow-sm transition-colors focus:outline-none"
            >
              <Plus size={15} /> New Order
            </button>
            <button
              onClick={() => notify("Orders exported")}
              className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0 transition-colors focus:outline-none"
            >
              <Download size={15} /> Export
            </button>
          </div>
        </div>
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                {["#", "Customer Name", "Date", "Type", "Qty (KG)", "Premium", "Total", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-3 font-medium whitespace-nowrap bg-slate-50">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 text-slate-400">{idx + 1}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-700 whitespace-nowrap">
                    {r.customer}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{r.date}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                        r.type === "Buy" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {r.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-700">{r.qty.toFixed(2)}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-600">${r.total.toFixed(2)}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-800">${(r.qty * r.total).toFixed(2)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <IconBtn
                        title="View"
                        onClick={() => notify(`Viewing order for ${r.customer}`)}
                      >
                        <Eye size={15} />
                      </IconBtn>
                      <IconBtn title="More">
                        <Pencil size={15} />
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-lg overflow-hidden transform scale-100 transition-transform">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-semibold text-slate-800 text-lg">Create Physical Order</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Customer Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Enter customer name"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Type *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">Select type</option>
                    <option>Buy</option>
                    <option>Sell</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Quantity (KG) *</label>
                  <input
                    value={form.qty}
                    onChange={(e) => setForm({ ...form, qty: e.target.value.replace(/[^0-9.]/g, "") })}
                    placeholder="0.00"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Premium *</label>
                  <input
                    value={form.total}
                    onChange={(e) => setForm({ ...form, total: e.target.value.replace(/[^0-9.]/g, "") })}
                    placeholder="Enter premium"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5">
              <button
                onClick={() => {
                  setForm({ name: "", date: "2025-05-23", type: "", qty: "", total: "" });
                  setIsOpen(false);
                }}
                className="text-sm px-4 py-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 font-medium transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="flex items-center gap-1.5 text-sm px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-sm transition-colors focus:outline-none"
              >
                <Plus size={15} /> Save Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
