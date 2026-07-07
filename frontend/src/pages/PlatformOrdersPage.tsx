import { Eye, Pencil, ShoppingCart, TrendingUp, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import IconBtn from "../components/IconBtn";
import SearchInput from "../components/SearchInput";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import { api, OrderData, toNumber } from "../data/api";

interface PlatformOrdersPageProps {
  notify: (msg: string) => void;
}

export default function PlatformOrdersPage({
  notify,
}: PlatformOrdersPageProps) {
  const [rows, setRows] = useState<OrderData[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("Order status");

  useEffect(() => {
    api
      .get<OrderData[]>("/api/orders/?order_type=BUY")
      .then(setRows)
      .catch(() => notify("Failed to load orders"));
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const mq =
        !q ||
        r.customer_name?.toLowerCase().includes(q.toLowerCase()) ||
        r.order_no.toLowerCase().includes(q.toLowerCase());
      const ms = status === "Order status" || r.status === status;
      return mq && ms;
    });
  }, [rows, q, status]);

  const numericRows = rows.map((r) => ({
    ...r,
    quantity: toNumber(r.quantity),
    premium: toNumber(r.premium),
    premium_amount: toNumber(r.premium_amount),
  }));
  const totalBuy = numericRows
    .filter((r) => r.transaction_type === "BUY")
    .reduce((s, r) => s + r.quantity, 0);
  const totalSell = numericRows
    .filter((r) => r.transaction_type === "SELL")
    .reduce((s, r) => s + r.quantity, 0);

  return (
    <div className="flex-1 pt-4 px-4 pb-2 sm:pt-4 sm:px-8 sm:pb-2 min-w-0 overflow-hidden w-full flex flex-col space-y-3 min-h-0">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-shrink-0">
        <StatCard
          icon={ShoppingCart}
          label="Total Orders"
          value={rows.length}
          sub="All time"
          tint="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Buy"
          value={
            <>
              {totalBuy.toFixed(2)}{" "}
              <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          sub="All time"
          tint="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Sell"
          value={
            <>
              {totalSell.toFixed(2)}{" "}
              <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          sub="All time"
          tint="bg-rose-50 text-rose-600"
        />
      </div>
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row gap-3 border-b border-slate-100 flex-shrink-0">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Search by invoice or customer name…"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white text-slate-600 focus:outline-none"
          >
            {[
              "Order status",
              "COMPLETED",
              "PENDING",
              "CONFIRMED",
              "CANCELLED",
            ].map((s) => (
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
                {[
                  "Order No",
                  "Customer",
                  "Date",
                  "Type",
                  "Quantity",
                  "Premium",
                  "Total",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 font-medium whitespace-nowrap bg-slate-50"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const quantity = toNumber(r.quantity);
                const premium = toNumber(r.premium);
                const premiumAmount = toNumber(r.premium_amount);
                return (
                  <tr
                    key={r.id}
                    className="border-b border-slate-50 hover:bg-slate-50/60"
                  >
                    <td className="px-5 py-3.5 font-medium text-slate-700 whitespace-nowrap">
                      {r.order_no}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 whitespace-nowrap">
                      {r.customer_name || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${r.transaction_type === "BUY" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
                      >
                        {r.transaction_type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 whitespace-nowrap">
                      {quantity.toFixed(3)} KG
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                      ${premium.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-800 whitespace-nowrap">
                      ${premiumAmount.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge
                        status={
                          r.status.charAt(0) + r.status.slice(1).toLowerCase()
                        }
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <IconBtn
                          title="View"
                          onClick={() => notify(`Viewing ${r.order_no}`)}
                        >
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
