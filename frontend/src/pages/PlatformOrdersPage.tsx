import { Eye, MoreHorizontal, Pencil, PhoneCall, Plus, RotateCcw, Send, ShoppingCart, Store, Trash2, X, XCircle } from "lucide-react";
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
  const [returnTarget, setReturnTarget] = useState<OrderData | null>(null);
  const [returnForm, setReturnForm] = useState({ quantity: "", reason: "" });
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderData | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [newOrderForm, setNewOrderForm] = useState({
    customer_name: "",
    channel: "Walk-in",
    quantity: "",
    premium: "350",
    notes: "",
  });

  useEffect(() => {
    api
      .get<OrderData[]>("/api/orders/?order_type=BUY")
      .then(setRows)
      .catch(() => notify("Failed to load orders"));
  }, []);

  function cancelOrder(o: OrderData) {
    api
      .post<OrderData>(`/api/orders/${o.id}/cancel`)
      .then((updated) => {
        setRows((r) => r.map((row) => (row.id === updated.id ? updated : row)));
        notify(`${o.order_no} cancelled`);
      })
      .catch((e: Error) => notify(e.message || "Failed to cancel order"));
  }

  function submitReturn() {
    if (!returnTarget || !returnForm.quantity) {
      notify("Enter a return quantity");
      return;
    }
    api
      .post(`/api/orders/${returnTarget.id}/return`, {
        quantity: returnForm.quantity,
        reason: returnForm.reason || null,
      })
      .then(() => {
        notify(`${returnTarget.order_no} returned — stock updated`);
        setReturnTarget(null);
        setReturnForm({ quantity: "", reason: "" });
      })
      .catch((e: Error) => notify(e.message || "Failed to return order"));
  }

  function deleteOrder(o: OrderData) {
    setRows((rs) => rs.filter((row) => row.id !== o.id));
    notify(`Sell Order ${o.order_no} deleted`);
  }

  function submitNewSellOrder() {
    if (!newOrderForm.customer_name || !newOrderForm.quantity || !newOrderForm.premium) {
      notify("Please fill in Customer, Quantity, and Premium");
      return;
    }

    const qty = Number(newOrderForm.quantity);
    const prem = Number(newOrderForm.premium);
    const spotPrice = 2700;
    const totalAmount = qty * (spotPrice + prem);

    if (editingOrder !== null) {
      setRows((rs) =>
        rs.map((row) =>
          row.id === editingOrder.id
            ? {
                ...row,
                customer_name: newOrderForm.customer_name,
                channel: newOrderForm.channel,
                quantity: qty,
                premium: prem,
                total_amount: totalAmount,
              }
            : row
        )
      );
      notify(`Sell Order ${editingOrder.order_no} updated successfully!`);
    } else {
      const newOrder: OrderData = {
        id: Date.now(),
        order_no: `SO-2026-${String(rows.length + 101).padStart(3, "0")}`,
        customer_name: newOrderForm.customer_name,
        channel: newOrderForm.channel,
        quantity: qty,
        premium: prem,
        total_amount: totalAmount,
        status: "CONFIRMED",
        order_date: new Date().toISOString().split("T")[0],
      };

      setRows((r) => [newOrder, ...r]);
      notify(`New Sell Order ${newOrder.order_no} created for ${newOrder.customer_name}!`);
    }

    setIsNewOrderModalOpen(false);
    setEditingOrder(null);
    setNewOrderForm({
      customer_name: "",
      channel: "Walk-in",
      quantity: "",
      premium: "350",
      notes: "",
    });
  }

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

  return (
    <div
      className="flex-1 p-4 sm:p-6 min-w-0 overflow-hidden w-full flex flex-col space-y-3 min-h-0 h-full"
      onClick={() => setActiveMenuId(null)}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
        <StatCard
          icon={ShoppingCart}
          label="Sell Orders"
          value={rows.length > 0 ? rows.length : 18}
          sub="Total sell orders"
          tint="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={Send}
          label="Telegram"
          value={
            <>
              18.2 <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          sub="Direct bot orders"
          tint="bg-sky-50 text-sky-600"
        />
        <StatCard
          icon={PhoneCall}
          label="Phone"
          value={
            <>
              12.0 <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          sub="Desk & phone sales"
          tint="bg-purple-50 text-purple-600"
        />
        <StatCard
          icon={Store}
          label="Walk-in"
          value={
            <>
              8.5 <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          sub="Counter physical sales"
          tint="bg-amber-50 text-amber-600"
        />
      </div>

      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden h-full">
        <div className="p-4 flex flex-col sm:flex-row items-center gap-3 border-b border-slate-100 flex-shrink-0">
          <div className="w-full sm:w-64 max-w-xs shrink-0">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search order no, customer..."
            />
          </div>
          <select
            aria-label="Order status filter"
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
            onClick={() => setIsNewOrderModalOpen(true)}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium shrink-0 shadow-sm transition-colors focus:outline-none sm:ml-auto cursor-pointer"
          >
            <Plus size={16} /> New Sell Orders
          </button>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
          <table className="w-full text-sm border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                {[
                  "Order No",
                  "Customer",
                  "Channel",
                  "Qty",
                  "Premium",
                  "Total",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className={`px-5 py-3 font-medium bg-slate-50 whitespace-nowrap ${
                      h === "Actions" ? "text-center" : ""
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => {
                const quantity = toNumber(r.quantity);
                const premium = toNumber(r.premium);
                const premiumAmount = toNumber(r.premium_amount);
                const channel = r.channel || (idx % 2 === 0 ? "Walk-in" : "Phone");

                return (
                  <tr
                    key={r.id}
                    className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-medium text-slate-700 whitespace-nowrap">
                      {r.order_no}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium whitespace-nowrap">
                      {r.customer_name || "—"}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {channel === "Telegram" && (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/60">
                          Telegram
                        </span>
                      )}
                      {channel === "Phone" && (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
                          Phone
                        </span>
                      )}
                      {channel === "Walk-in" && (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                          Walk-in
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium whitespace-nowrap">
                      {quantity.toFixed(2)} KG
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                      ${premium.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-800 whitespace-nowrap">
                      ${(premiumAmount || (quantity * (2700 + premium))).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge
                        status={
                          r.status.charAt(0) + r.status.slice(1).toLowerCase()
                        }
                      />
                    </td>
                    <td className="px-5 py-3.5 text-center relative">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === r.id ? null : r.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
                          title="Actions"
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        {activeMenuId === r.id && (
                          <div className="absolute right-0 mt-1 w-28 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-30 text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                setEditingOrder(r);
                                setNewOrderForm({
                                  customer_name: r.customer_name || "",
                                  channel: r.channel || "Walk-in",
                                  quantity: String(r.quantity),
                                  premium: String(r.premium),
                                  notes: "",
                                });
                                setIsNewOrderModalOpen(true);
                              }}
                              className="w-full px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Pencil size={13} className="text-slate-400" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                deleteOrder(r);
                              }}
                              className="w-full px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {returnTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-semibold text-slate-800 text-lg">Return {returnTarget.order_no}</h3>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setReturnTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                  Return Quantity (KG) * — max {toNumber(returnTarget.quantity).toFixed(3)}
                </label>
                <input
                  value={returnForm.quantity}
                  onChange={(e) => setReturnForm({ ...returnForm, quantity: e.target.value.replace(/[^0-9.]/g, "") })}
                  placeholder="0.00"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Reason</label>
                <textarea
                  value={returnForm.reason}
                  onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                  rows={2}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setReturnTarget(null)}
                className="text-sm px-4 py-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 font-medium transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={submitReturn}
                className="flex items-center gap-1.5 text-sm px-5 py-2.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 font-semibold shadow-sm transition-colors focus:outline-none"
              >
                <RotateCcw size={15} /> Confirm Return
              </button>
            </div>
          </div>
        </div>
      )}

      {isNewOrderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-md overflow-hidden transform scale-100 transition-transform">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-semibold text-slate-800 text-lg">
                {editingOrder !== null ? `Edit Order (${editingOrder.order_no})` : "Create New Sell Order"}
              </h3>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => {
                  setIsNewOrderModalOpen(false);
                  setEditingOrder(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Customer Name *</label>
                <input
                  type="text"
                  value={newOrderForm.customer_name}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, customer_name: e.target.value })}
                  placeholder="e.g. Heng Ty, Ly Hour, etc."
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Channel</label>
                  <select
                    value={newOrderForm.channel}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, channel: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Walk-in">Walk-in</option>
                    <option value="Phone">Phone</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Quantity (KG) *</label>
                  <input
                    type="text"
                    value={newOrderForm.quantity}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, quantity: e.target.value.replace(/[^0-9.]/g, "") })}
                    placeholder="0.00"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Premium (USD/KG) *</label>
                <input
                  type="text"
                  value={newOrderForm.premium}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, premium: e.target.value.replace(/[^0-9.]/g, "") })}
                  placeholder="350.00"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Order Notes</label>
                <textarea
                  rows={2}
                  value={newOrderForm.notes}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, notes: e.target.value })}
                  placeholder="Optional delivery or customer notes..."
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsNewOrderModalOpen(false)}
                className="text-sm px-4 py-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 font-medium transition-colors focus:outline-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitNewSellOrder}
                className="flex items-center gap-1.5 text-sm px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-sm transition-colors focus:outline-none cursor-pointer"
              >
                <Plus size={16} /> Create Sell Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
