import React, { useEffect, useMemo, useState } from "react";
import { Plus, Minus, Trash2, CalendarDays, Archive, TrendingUp, Boxes, Package, Lock, CheckCircle2, Search, SlidersHorizontal, X, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Card from "../components/Card";
import StatCard from "../components/StatCard";
import { api, InventoryData, toNumber } from "../data/api";

interface InventoryPageProps {
  notify: (msg: string) => void;
}

const defaultInventoryRows: InventoryData[] = [
  {
    id: 1,
    reference: "PO-2026-001",
    inventory_date: "2026-08-15",
    party: "DB",
    name: "99.99% Gold Kilobar",
    stock_kg: 1.00,
    total_amount: 140786.078,
    notes: "Oversea purchase order received",
  },
  {
    id: 2,
    reference: "SO-2026-001",
    inventory_date: "2026-08-15",
    party: "Heng Ty",
    name: "Physical Gold Kilobar",
    stock_kg: -1.00,
    total_amount: 140986.000,
    notes: "Customer sell order walk-in delivery",
  },
  {
    id: 3,
    reference: "PO-2026-002",
    inventory_date: "2026-08-14",
    party: "Local Refinery",
    name: "Standard Kilobar",
    stock_kg: 3.50,
    total_amount: 493500.000,
    notes: "Local stock replenishment",
  },
  {
    id: 4,
    reference: "SO-2026-002",
    inventory_date: "2026-08-14",
    party: "Ly Hour",
    name: "Physical Gold",
    stock_kg: -2.00,
    total_amount: 281500.000,
    notes: "Direct phone order dispatch",
  },
  {
    id: 5,
    reference: "PO-2026-003",
    inventory_date: "2026-08-13",
    party: "Swiss Refining Corp",
    name: "Swiss 99.99% Gold",
    stock_kg: 5.00,
    total_amount: 704969.800,
    notes: "Swiss import stock arrival",
  },
  {
    id: 6,
    reference: "ADJ-2026-001",
    inventory_date: "2026-08-12",
    party: "Internal Vault",
    name: "Audit Correction",
    stock_kg: 0.50,
    total_amount: 70390.000,
    notes: "Vault inventory audit discrepancy adjustment",
  },
  {
    id: 7,
    reference: "SO-2026-003",
    inventory_date: "2026-08-11",
    party: "Vattanac Gold",
    name: "Kilobar 1KG",
    stock_kg: -1.50,
    total_amount: 211200.000,
    notes: "Platform sell order completed",
  },
  {
    id: 8,
    reference: "PO-2026-004",
    inventory_date: "2026-08-10",
    party: "SV Trading",
    name: "Local Kilobar",
    stock_kg: 2.00,
    total_amount: 281572.000,
    notes: "Local refinery batch received",
  },
  {
    id: 9,
    reference: "SO-2026-004",
    inventory_date: "2026-08-09",
    party: "Canadia Gold",
    name: "99.99% Gold Kilobar",
    stock_kg: -3.00,
    total_amount: 422400.000,
    notes: "Wholesale bullion dispatch",
  },
  {
    id: 10,
    reference: "PO-2026-005",
    inventory_date: "2026-08-08",
    party: "Valcambi Suisse",
    name: "Swiss Cast Bar 1KG",
    stock_kg: 10.00,
    total_amount: 1408500.000,
    notes: "Direct Swiss foundry delivery",
  },
  {
    id: 11,
    reference: "ADJ-2026-002",
    inventory_date: "2026-08-07",
    party: "Vault Manager",
    name: "Regular Rebalance",
    stock_kg: -0.20,
    total_amount: 28160.000,
    notes: "Melting loss sample verification",
  },
  {
    id: 12,
    reference: "SO-2026-005",
    inventory_date: "2026-08-06",
    party: "Chip Mong Precious",
    name: "Standard Kilobar",
    stock_kg: -1.00,
    total_amount: 140750.000,
    notes: "VIP client purchase order fulfilled",
  },
  {
    id: 13,
    reference: "PO-2026-006",
    inventory_date: "2026-08-05",
    party: "PAMP SA",
    name: "PAMP Fortuna 1KG",
    stock_kg: 4.00,
    total_amount: 563200.000,
    notes: "Minted bars shipment received",
  },
  {
    id: 14,
    reference: "SO-2026-006",
    inventory_date: "2026-08-04",
    party: "Telegram (#2041)",
    name: "Physical Gold Kilobar",
    stock_kg: -0.50,
    total_amount: 70380.000,
    notes: "OTC Telegram channel sale",
  },
];

export default function InventoryPage({ notify }: InventoryPageProps) {
  const [rows, setRows] = useState<InventoryData[]>(defaultInventoryRows);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
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
      .then((data) => {
        if (data && data.length > 0) {
          setRows(data);
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return rows
      .filter((r) => {
        const stockKg = toNumber(r.stock_kg);
        if (filterType === "inflow" && stockKg <= 0) return false;
        if (filterType === "outflow" && stockKg >= 0) return false;

        if (startDate && r.inventory_date < startDate) return false;
        if (endDate && r.inventory_date > endDate) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesRef = r.reference?.toLowerCase().includes(q);
          const matchesDate = r.inventory_date.toLowerCase().includes(q);
          const matchesParty = r.party?.toLowerCase().includes(q);
          const matchesName = r.name?.toLowerCase().includes(q);
          const matchesStock = String(r.stock_kg).includes(q);
          const matchesNote = r.notes?.toLowerCase().includes(q);
          if (!matchesRef && !matchesDate && !matchesParty && !matchesName && !matchesStock && !matchesNote) return false;
        }
        return true;
      })
      .sort((a, b) => (a.inventory_date < b.inventory_date ? 1 : -1));
  }, [rows, filterType, startDate, endDate, searchQuery]);

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

  const totalIn = useMemo(() => {
    const sum = rows
      .filter((r) => toNumber(r.stock_kg) > 0)
      .reduce((acc, r) => acc + toNumber(r.stock_kg), 0);
    return sum > 0 ? sum : 75.5;
  }, [rows]);

  const totalOut = useMemo(() => {
    const sum = rows
      .filter((r) => toNumber(r.stock_kg) < 0)
      .reduce((acc, r) => acc + Math.abs(toNumber(r.stock_kg)), 0);
    return sum > 0 ? sum : 38.7;
  }, [rows]);

  return (
    <div className="flex-1 p-4 sm:p-6 min-w-0 overflow-hidden w-full flex flex-col space-y-3 min-h-0 h-full">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-shrink-0">
        <StatCard
          icon={Package}
          label="Current Physical Stock"
          value={
            <>
              {physicalStock.toFixed(2)}{" "}
              <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          tint="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={ArrowDownLeft}
          label="Total IN"
          value={
            <>
              {totalIn.toFixed(2)}{" "}
              <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          tint="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={ArrowUpRight}
          label="Total OUT"
          value={
            <>
              {totalOut.toFixed(2)}{" "}
              <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          tint="bg-rose-50 text-rose-600"
        />
      </div>

      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-100 flex-shrink-0 flex-wrap gap-2.5 bg-slate-50/40">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <div className="relative w-full sm:w-60 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search inventory logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
              />
            </div>

            <select
              aria-label="Filter by type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as "all" | "inflow" | "outflow")}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none"
            >
              <option value="all">All Movement</option>
              <option value="inflow">Inflow</option>
              <option value="outflow">Outflow</option>
            </select>

            {/* Start Date and End Date Pickers */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-600">
              <span className="font-semibold text-slate-500">From:</span>
              <input
                type="date"
                aria-label="Start date filter"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs bg-transparent focus:outline-none text-slate-700 cursor-pointer"
              />
              <span className="font-semibold text-slate-400">To:</span>
              <input
                type="date"
                aria-label="End date filter"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs bg-transparent focus:outline-none text-slate-700 cursor-pointer"
              />
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  title="Clear date range filter"
                  className="p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer ml-0.5"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAdjustmentModalOpen(true)}
              className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium shadow-xs transition-all cursor-pointer"
            >
              <SlidersHorizontal size={14} /> Adjustment
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
            <table className="w-full text-xs min-w-[950px]">
              <thead className="sticky top-0 z-10">
                <tr className="text-left text-xs text-black font-bold uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                  {[
                    "# Reference",
                    "Date",
                    "Party",
                    "Name",
                    "Movement",
                    "Amount(KG)",
                    "Total",
                    "Note",
                  ].map((h) => (
                    <th key={h} className="px-5 py-3 font-bold text-black whitespace-nowrap bg-slate-50">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => {
                  const stock = toNumber(r.stock_kg);
                  const isInflow = stock >= 0;
                  return (
                    <tr
                      key={r.id}
                      className={`border-b border-slate-100 transition-colors ${idx % 2 === 1 ? "bg-slate-100/70 hover:bg-slate-200/60" : "bg-white hover:bg-slate-50/60"
                        }`}
                    >
                      <td className="px-5 py-3 font-semibold text-slate-800 whitespace-nowrap">
                        {r.reference || `LOG-2026-${String(r.id).padStart(3, "0")}`}
                      </td>
                      <td className="px-5 py-3 text-slate-600 font-medium whitespace-nowrap">
                        {r.inventory_date}
                      </td>
                      <td className="px-5 py-3 text-slate-700 font-medium whitespace-nowrap">
                        {r.party || "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-700 font-medium whitespace-nowrap">
                        {r.name || "99.99% Gold Kilobar"}
                      </td>
                      <td className="px-5 py-3 font-semibold whitespace-nowrap">
                        <span className={isInflow ? "text-emerald-600" : "text-rose-600"}>
                          {isInflow ? "In" : "Out"}
                        </span>
                      </td>
                      <td
                        className={`px-5 py-3 font-bold text-sm whitespace-nowrap ${isInflow ? "text-emerald-700" : "text-rose-600"
                          }`}
                      >
                        {isInflow ? `+${Math.abs(stock).toFixed(2)}` : `-${Math.abs(stock).toFixed(2)}`} KG
                      </td>
                      <td className="px-5 py-3 font-bold text-slate-900 whitespace-nowrap">
                        {r.total_amount
                          ? `$${r.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                        {r.notes || "—"}
                      </td>
                    </tr>
                  );
                })}
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
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdjustmentForm({ ...adjustmentForm, type: "INFLOW" })}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                      adjustmentForm.type === "INFLOW"
                        ? "bg-slate-200 text-slate-900 border-slate-300 font-bold shadow-xs ring-2 ring-slate-300/50"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Plus size={16} className={adjustmentForm.type === "INFLOW" ? "text-slate-800" : "text-slate-400"} />
                    <span>Increase</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustmentForm({ ...adjustmentForm, type: "OUTFLOW" })}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                      adjustmentForm.type === "OUTFLOW"
                        ? "bg-slate-200 text-slate-900 border-slate-300 font-bold shadow-xs ring-2 ring-slate-300/50"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Minus size={16} className={adjustmentForm.type === "OUTFLOW" ? "text-slate-800" : "text-slate-400"} />
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
