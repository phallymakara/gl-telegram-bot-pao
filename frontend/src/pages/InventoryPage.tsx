import React, { useEffect, useMemo, useState } from "react";
import { Plus, Minus, Trash2, CalendarDays, Archive, TrendingUp, Boxes, Package, Lock, CheckCircle2, Search, SlidersHorizontal, X } from "lucide-react";
import Card from "../components/Card";
import StatCard from "../components/StatCard";
import { api, InventoryData, toNumber } from "../data/api";

const MAX_ROWS = 30;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface InventoryPageProps {
  notify: (msg: string) => void;
}

export default function InventoryPage({ notify }: InventoryPageProps) {
  const [rows, setRows] = useState<InventoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState<number | "all">("all");
  const [filterYear, setFilterYear] = useState<number | "all">("all");
  const [filterType, setFilterType] = useState<"all" | "inflow" | "outflow">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "INFLOW",
    amount: "",
    reason: "",
  });

  useEffect(() => {
    api
      .get<InventoryData[]>("/api/inventory/")
      .then(setRows)
      .catch(() => notify("Failed to load inventory"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return rows
      .filter((r) => {
        const stockKg = toNumber(r.stock_kg);
        if (filterType === "inflow" && stockKg <= 0) return false;
        if (filterType === "outflow" && stockKg >= 0) return false;

        const d = new Date(r.inventory_date + "T00:00:00");
        if (filterMonth !== "all" && d.getMonth() + 1 !== filterMonth) return false;
        if (filterYear !== "all" && d.getFullYear() !== filterYear) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesDate = r.inventory_date.toLowerCase().includes(q);
          const matchesStock = String(r.stock_kg).includes(q);
          if (!matchesDate && !matchesStock) return false;
        }
        return true;
      })
      .sort((a, b) => (a.inventory_date < b.inventory_date ? 1 : -1));
  }, [rows, filterType, filterMonth, filterYear, searchQuery]);

  const years = useMemo(() => {
    const set = new Set<number>();
    rows.forEach((r) => set.add(new Date(r.inventory_date + "T00:00:00").getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [rows]);

  const totalStock = rows.reduce((s, r) => s + toNumber(r.stock_kg), 0);

  function updateRow(row: InventoryData, patch: Partial<InventoryData>) {
    api
      .put<InventoryData>(`/api/inventory/${row.id}`, {
        inventory_date: patch.inventory_date ?? row.inventory_date,
        stock_kg: patch.stock_kg ?? row.stock_kg,
      })
      .then((updated) => {
        setRows((rs) => rs.map((r) => (r.id === row.id ? updated : r)));
      })
      .catch((e: Error) => notify(e.message));
  }

  function deleteRow(rowId: number) {
    setRows((rs) => rs.filter((r) => r.id !== rowId));
    notify("Row deleted");
    api.delete(`/api/inventory/${rowId}`).catch(() => { });
  }

  function submitAdjustment() {
    if (!adjustmentForm.amount || toNumber(adjustmentForm.amount) <= 0) {
      notify("Please enter a valid stock quantity");
      return;
    }
    const val = toNumber(adjustmentForm.amount);
    const finalStock = adjustmentForm.type === "OUTFLOW" ? -val : val;

    api
      .post<InventoryData>("/api/inventory/", {
        inventory_date: adjustmentForm.date,
        stock_kg: finalStock,
      })
      .then((row) => {
        setRows((rs) => [...rs, row]);
        setIsAdjustmentModalOpen(false);
        setAdjustmentForm({
          date: new Date().toISOString().split("T")[0],
          type: "INFLOW",
          amount: "",
          reason: "",
        });
        notify(`Stock adjustment of ${val} KG recorded successfully`);
      })
      .catch((e: Error) => notify(e.message));
  }

  const physicalStock = totalStock > 0 ? totalStock : 100.0;
  const reservedStock = 40.0;
  const availableStock = Math.max(0, physicalStock - reservedStock);

  return (
    <div className="flex-1 p-4 sm:p-6 min-w-0 overflow-hidden w-full flex flex-col space-y-3 min-h-0 h-full">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-shrink-0">
        <StatCard
          icon={Package}
          label="Physical Stock"
          value={
            <>
              {physicalStock.toFixed(2)}{" "}
              <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          tint="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={Lock}
          label="Reserved"
          value={
            <>
              {reservedStock.toFixed(2)}{" "}
              <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          tint="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Available"
          value={
            <>
              {availableStock.toFixed(2)}{" "}
              <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          tint="bg-emerald-50 text-emerald-600"
        />
      </div>

      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/40">
          <div>
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Archive size={18} className="text-indigo-600" /> Inventory Ledger
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              This table is to record the logs of the inventory.
            </p>
          </div>
        </div>

        <div className="p-5 flex items-center justify-between border-b border-slate-100 flex-shrink-0 flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <div className="relative w-full sm:w-64 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search inventory logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
              />
            </div>

            <select
              aria-label="Filter by type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as "all" | "inflow" | "outflow")}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 focus:outline-none"
            >
              <option value="all">All Movement</option>
              <option value="inflow">Inflow</option>
              <option value="outflow">Outflow</option>
            </select>

            <select
              aria-label="Filter by month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value === "all" ? "all" : +e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 focus:outline-none"
            >
              <option value="all">All Months</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              aria-label="Filter by year"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value === "all" ? "all" : +e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 focus:outline-none"
            >
              <option value="all">All Years</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAdjustmentModalOpen(true)}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium shadow-sm transition-all cursor-pointer"
            >
              <SlidersHorizontal size={15} /> Adjustment
            </button>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400">Loading inventory…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              {rows.length === 0 ? "No inventory log entries found." : "No rows match the selected filter."}
            </div>
          ) : (
            <table className="w-full text-sm min-w-[600px]">
              <thead className="sticky top-0 z-10">
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                  {["#", "Date", "Stock (KG)", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-3 font-medium whitespace-nowrap bg-slate-50">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-5 py-3 text-slate-400">{idx + 1}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={13} className="text-slate-300" />
                        <input
                          type="date"
                          value={r.inventory_date}
                          onChange={(e) => updateRow(r, { inventory_date: e.target.value })}
                          className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-slate-50/30"
                        />
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={r.stock_kg}
                        onChange={(e) => updateRow(r, { stock_kg: toNumber(e.target.value) })}
                        className="w-28 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => deleteRow(r.id)}
                        title="Delete row"
                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Stock Adjustment Popup Modal */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Stock Adjustment</h3>
                <p className="text-xs text-slate-500 font-medium">Record inventory inflow, outflow, or audit correction</p>
              </div>
              <button
                onClick={() => setIsAdjustmentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Adjustment Date *</label>
                <input
                  type="date"
                  value={adjustmentForm.date}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, date: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Adjustment Type *</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAdjustmentForm({ ...adjustmentForm, type: "INFLOW" })}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${adjustmentForm.type === "INFLOW"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-600/20 shadow-xs"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    <Plus size={16} className={adjustmentForm.type === "INFLOW" ? "text-emerald-600" : "text-slate-400"} />
                    <span>Increase</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustmentForm({ ...adjustmentForm, type: "OUTFLOW" })}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${adjustmentForm.type === "OUTFLOW"
                      ? "border-rose-600 bg-rose-50 text-rose-700 ring-2 ring-rose-600/20 shadow-xs"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    <Minus size={16} className={adjustmentForm.type === "OUTFLOW" ? "text-rose-600" : "text-slate-400"} />
                    <span>Decrease</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Quantity (KG) *</label>
                <input
                  type="text"
                  value={adjustmentForm.amount}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: e.target.value.replace(/[^0-9.]/g, "") })}
                  placeholder="0.00"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Reason / Note</label>
                <textarea
                  value={adjustmentForm.reason}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                  rows={2}
                  placeholder="Reason for adjustment..."
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsAdjustmentModalOpen(false)}
                className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitAdjustment}
                className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium transition-colors shadow-sm cursor-pointer"
              >
                Save Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
