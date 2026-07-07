import React, { useState, useEffect } from "react";
import { Package, Plus, Download, Eye, Pencil, ShoppingCart, TrendingUp } from "lucide-react";
import Card from "../components/Card";
import IconBtn from "../components/IconBtn";
import StatCard from "../components/StatCard";
import { api, OrderData } from "../data/api";

interface PhysicalOrdersPageProps {
  notify: (msg: string) => void;
}

export default function PhysicalOrdersPage({ notify }: PhysicalOrdersPageProps) {
  const [rows, setRows] = useState<OrderData[]>([]);
  const [form, setForm] = useState({ customer_name: "", date: "", type: "", qty: "", premium: "" });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    api.get<OrderData[]>("/api/orders/?order_type=SELL").then(setRows).catch(() => notify("Failed to load orders"));
  }, []);

  function save() {
    if (!form.customer_name || !form.type || !form.qty || !form.premium) {
      notify("Please fill in all required fields");
      return;
    }
    const body = {
      transaction_type: form.type.toUpperCase(),
      quantity: form.qty,
      premium: form.premium,
      order_no: `PHY-${Date.now()}`,
      customer_name: form.customer_name,
    };
    api.post<OrderData>("/api/orders/", body)
      .then((order) => {
        setRows((r) => [order, ...r]);
        setForm({ customer_name: "", date: "", type: "", qty: "", premium: "" });
        setIsOpen(false);
        notify("Order saved");
      })
      .catch(() => notify("Failed to create order"));
  }

  const totalBuy = rows.filter((r) => r.transaction_type === "BUY").reduce((s, r) => s + r.quantity, 0);
  const totalSell = rows.filter((r) => r.transaction_type === "SELL").reduce((s, r) => s + r.quantity, 0);

  return (
    <div className="flex-1 pt-4 px-4 pb-2 sm:pt-4 sm:px-8 sm:pb-2 min-w-0 overflow-hidden w-full flex flex-col space-y-3 min-h-0">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-shrink-0">
        <div className="md:col-span-2">
          <StatCard icon={Package} label="Total Stock" value={<>— <span className="text-sm font-normal text-slate-400">KG</span></>} sub="Active Inventory" tint="bg-indigo-50 text-indigo-600" />
        </div>
        <div className="md:col-span-1">
          <StatCard icon={ShoppingCart} label="Total Orders" value={rows.length} sub="All time" tint="bg-indigo-50 text-indigo-600" />
        </div>
        <div className="md:col-span-1">
          <StatCard icon={TrendingUp} label="Total Buy" value={<>{totalBuy.toFixed(2)} <span className="text-sm font-normal text-slate-400">KG</span></>} sub="All time" tint="bg-emerald-50 text-emerald-600" />
        </div>
        <div className="md:col-span-1">
          <StatCard icon={TrendingUp} label="Total Sell" value={<>{totalSell.toFixed(2)} <span className="text-sm font-normal text-slate-400">KG</span></>} sub="All time" tint="bg-rose-50 text-rose-600" />
        </div>
      </div>
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h3 className="font-semibold text-slate-800">Physical Orders List{" "}
            <span className="ml-2 text-xs font-normal bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{rows.length} Orders</span>
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsOpen(true)} className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium shrink-0 shadow-sm transition-colors focus:outline-none"><Plus size={15} /> New Order</button>
            <button onClick={() => notify("Orders exported")} className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0 transition-colors focus:outline-none"><Download size={15} /> Export</button>
          </div>
        </div>
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                {["#", "Customer", "Date", "Type", "Qty (KG)", "Premium", "Total", "Actions"].map((h) => (<th key={h} className="px-5 py-3 font-medium whitespace-nowrap bg-slate-50">{h}</th>))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 text-slate-400">{idx + 1}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-700 whitespace-nowrap">{r.customer_name || "—"}</td>
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${r.transaction_type === "BUY" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{r.transaction_type}</span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-700">{r.quantity.toFixed(3)}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-600">${r.premium.toFixed(2)}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-800">${(r.quantity * r.premium).toFixed(2)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <IconBtn title="View" onClick={() => notify(`Viewing order ${r.order_no}`)}><Eye size={15} /></IconBtn>
                      <IconBtn title="More"><Pencil size={15} /></IconBtn>
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
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"><Plus size={20} className="rotate-45" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Customer Name *</label>
                <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="Enter customer name" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Type *</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                    <option value="">Select type</option>
                    <option>Buy</option>
                    <option>Sell</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Quantity (KG) *</label>
                  <input value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="0.00" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Premium *</label>
                <input value={form.premium} onChange={(e) => setForm({ ...form, premium: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="Enter premium" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5">
              <button onClick={() => { setForm({ customer_name: "", date: "", type: "", qty: "", premium: "" }); setIsOpen(false); }} className="text-sm px-4 py-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 font-medium transition-colors focus:outline-none">Cancel</button>
              <button onClick={save} className="flex items-center gap-1.5 text-sm px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-sm transition-colors focus:outline-none"><Plus size={15} /> Save Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
