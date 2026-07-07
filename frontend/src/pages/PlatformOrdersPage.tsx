import React, { useState, useMemo } from "react";
import { Download, X, Eye, Pencil, ShoppingCart, TrendingUp } from "lucide-react";
import Card from "../components/Card";
import SearchInput from "../components/SearchInput";
import StatusBadge from "../components/StatusBadge";
import IconBtn from "../components/IconBtn";
import StatCard from "../components/StatCard";
import { platformOrdersSeed } from "../data/mockData";

interface PlatformOrdersPageProps {
  notify: (msg: string) => void;
}

export default function PlatformOrdersPage({ notify }: PlatformOrdersPageProps) {
  const [rows] = useState(platformOrdersSeed);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("Order status");
  const groupNames = ["Gold Traders Group A", "VIP Gold Members", "Cambodia Gold Exchange", "Gold Channel VIP", "Phnom Penh Traders"];

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const groupName = groupNames[r.id % groupNames.length];
      const username = `@${r.customer.toLowerCase().replace(" ", "_")}`;
      const mq =
        !q ||
        r.customer.toLowerCase().includes(q.toLowerCase()) ||
        username.toLowerCase().includes(q.toLowerCase()) ||
        r.invoice.toLowerCase().includes(q.toLowerCase()) ||
        groupName.toLowerCase().includes(q.toLowerCase());
      const ms = status === "Order status" || r.status === status;
      return mq && ms;
    });
  }, [rows, q, status]);

  return (
    <div className="flex-1 pt-4 px-4 pb-2 sm:pt-4 sm:px-8 sm:pb-2 min-w-0 overflow-hidden w-full flex flex-col space-y-3 min-h-0">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-shrink-0">
        <StatCard
          icon={ShoppingCart}
          label="Total Orders"
          value={rows.length}
          sub="Today"
          tint="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Buy"
          value={<>{rows.filter(r => r.type === "Buy").reduce((sum, r) => sum + r.qty, 0).toFixed(2)} <span className="text-sm font-normal text-slate-400">KG</span></>}
          sub="Today"
          tint="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Sell"
          value={<>{rows.filter(r => r.type === "Sell").reduce((sum, r) => sum + r.qty, 0).toFixed(2)} <span className="text-sm font-normal text-slate-400">KG</span></>}
          sub="Today"
          tint="bg-rose-50 text-rose-600"
        />
      </div>
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row gap-3 border-b border-slate-100 flex-shrink-0">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Search by invoice, customer, name or group…"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white text-slate-600 focus:outline-none"
          >
            {["Order status", "Completed", "Pending", "Confirmed", "Cancelled"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setQ("");
              setStatus("Order status");
            }}
            className="text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <X size={14} /> Clear Filters
          </button>
        </div>
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
          <table className="w-full text-sm min-w-[1000px]">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                {["Invoice No", "Group Name", "Name", "Date", "Type", "Quantity", "Premium", "Total", "Actions"].map(
                  (h) => (
                    <th key={h} className="px-5 py-3 font-medium whitespace-nowrap bg-slate-50">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const groupName = groupNames[r.id % groupNames.length];
                return (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 font-medium text-slate-700 whitespace-nowrap">
                      {r.invoice}
                    </td>
                    <td className="px-5 py-3.5 text-indigo-600 font-medium whitespace-nowrap">{groupName}</td>
                    <td className="px-5 py-3.5 text-slate-700 whitespace-nowrap">{r.customer}</td>
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
                    <td className="px-5 py-3.5 text-slate-700 whitespace-nowrap">
                      {r.qty.toFixed(2)} KG
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                      ${r.unit.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-800 whitespace-nowrap">
                      ${r.total.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <IconBtn title="View" onClick={() => notify(`Viewing ${r.invoice}`)}>
                          <Eye size={15} />
                        </IconBtn>
                        <IconBtn title="More">
                          <Pencil size={15} />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </Card>
    </div>
  );
}
