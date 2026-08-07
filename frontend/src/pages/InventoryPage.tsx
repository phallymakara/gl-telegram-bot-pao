import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, CalendarDays, Archive, TrendingUp, Boxes } from "lucide-react";
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
  const [newDate, setNewDate] = useState("");
  const [newStock, setNewStock] = useState("");

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
        const d = new Date(r.inventory_date + "T00:00:00");
        if (filterMonth !== "all" && d.getMonth() + 1 !== filterMonth) return false;
        if (filterYear !== "all" && d.getFullYear() !== filterYear) return false;
        return true;
      })
      .sort((a, b) => (a.inventory_date < b.inventory_date ? 1 : -1));
  }, [rows, filterMonth, filterYear]);

  const years = useMemo(() => {
    const set = new Set<number>();
    rows.forEach((r) => set.add(new Date(r.inventory_date + "T00:00:00").getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [rows]);

  const totalStock = rows.reduce((s, r) => s + toNumber(r.stock_kg), 0);
  const filteredStock = filtered.reduce((s, r) => s + toNumber(r.stock_kg), 0);
  const atLimit = rows.length >= MAX_ROWS;

  function addRow() {
    if (!newDate) {
      notify("Please pick a date");
      return;
    }
    if (newStock === "" || toNumber(newStock) <= 0) {
      notify("Please enter stock amount");
      return;
    }
    api
      .post<InventoryData>("/api/inventory/", { inventory_date: newDate, stock_kg: toNumber(newStock) })
      .then((row) => {
        setRows((rs) => [...rs, row]);
        setNewDate("");
        setNewStock("");
        notify("Inventory added");
      })
      .catch((e: Error) => notify(e.message));
  }

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
    api
      .delete(`/api/inventory/${rowId}`)
      .then(() => {
        setRows((rs) => rs.filter((r) => r.id !== rowId));
        notify("Row deleted");
      })
      .catch((e: Error) => notify(e.message));
  }

  return (
    <div className="flex-1 pt-4 px-4 pb-2 sm:pt-4 sm:px-8 sm:pb-2 min-w-0 overflow-hidden w-full flex flex-col space-y-3 min-h-0">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-shrink-0">
        <StatCard
          icon={Archive}
          label="Days Tracked"
          value={rows.length}
          sub={`Max ${MAX_ROWS} rows`}
          tint="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Stock"
          value={
            <>
              {totalStock.toFixed(2)}{" "}
              <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          sub="All time"
          tint="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={Boxes}
          label="Filtered Stock"
          value={
            <>
              {filteredStock.toFixed(2)}{" "}
              <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          sub="Current filter"
          tint="bg-amber-50 text-amber-600"
        />
      </div>

      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row gap-3 border-b border-slate-100 flex-shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-slate-400" />
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-slate-50/30"
            />
            <input
              type="number"
              min="0"
              step="0.001"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              placeholder="Stock (KG)"
              className="w-32 text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            <button
              onClick={addRow}
              disabled={atLimit}
              className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={15} /> Add
            </button>
            <span className={`text-xs font-medium ${atLimit ? "text-rose-600" : "text-slate-400"}`}>
              {rows.length} / {MAX_ROWS} rows
            </span>
          </div>

          <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
            <select
              aria-label="Filter by month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value === "all" ? "all" : +e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white text-slate-600 focus:outline-none"
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
              className="text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white text-slate-600 focus:outline-none"
            >
              <option value="all">All Years</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={() => {
                const now = new Date();
                setFilterMonth(now.getMonth() + 1);
                setFilterYear(now.getFullYear());
              }}
              className={`text-sm px-3.5 py-2.5 rounded-lg border font-medium transition-colors ${
                filterMonth === new Date().getMonth() + 1 && filterYear === new Date().getFullYear()
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => {
                setFilterMonth("all");
                setFilterYear("all");
              }}
              className="text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400">Loading inventory…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              {rows.length === 0 ? "No inventory yet. Add your first day above." : "No rows match the selected filter."}
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
    </div>
  );
}
