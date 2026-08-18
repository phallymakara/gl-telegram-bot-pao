/**
 * @file InventoryTable.tsx
 * @description Sub-component rendering the stock ledger table with date range filters, search, and action items.
 */

import { ArrowDownLeft, ArrowUpRight, Search, Trash2, X } from "lucide-react";
import Card from "../../components/Card";
import IconBtn from "../../components/IconBtn";
import StatusBadge from "../../components/StatusBadge";
import { InventoryData, toNumber } from "../../api";

interface InventoryTableProps {
  rows: InventoryData[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filterType: "all" | "inflow" | "outflow";
  setFilterType: (val: "all" | "inflow" | "outflow") => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  clearDateFilter: () => void;
  openAdjustmentModal: () => void;
  deleteRow: (id: number) => void;
}

/**
 * Inventory stock ledger table view component.
 */
export default function InventoryTable({
  rows,
  loading,
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  clearDateFilter,
  openAdjustmentModal,
  deleteRow,
}: InventoryTableProps) {
  return (
    <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h3 className="font-semibold text-slate-800">Inventory Movement Ledger</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit history of physical gold stock movements in and out of the vault.
          </p>
        </div>
        <button
          onClick={openAdjustmentModal}
          className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium shrink-0 shadow-xs"
        >
          + Record Stock Adjustment
        </button>
      </div>

      <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search reference, party..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent focus:outline-none text-xs text-slate-700 cursor-pointer"
            />
            <span className="text-slate-300">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent focus:outline-none text-xs text-slate-700 cursor-pointer"
            />
            {(startDate || endDate) && (
              <button
                onClick={clearDateFilter}
                className="text-slate-400 hover:text-slate-600 ml-1 p-0.5 rounded hover:bg-slate-100"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-lg">
          {(["all", "inflow", "outflow"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                filterType === t
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading inventory ledger...</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No inventory records found.</div>
        ) : (
          <table className="w-full text-sm min-w-[900px]">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                {["Date", "Reference", "Party / Description", "Type", "Weight (KG)", "Actions"].map(
                  (h) => (
                    <th key={h} className="px-5 py-3 font-medium whitespace-nowrap bg-slate-50">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isPositive = toNumber(row.stock_kg) >= 0;
                return (
                  <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                      {row.inventory_date}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-700">
                      {row.reference || `REF-${row.id}`}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium">
                      {row.party || row.name || "Vault Stock Adjustment"}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={isPositive ? "Received" : "Returned"} />
                    </td>
                    <td
                      className={`px-5 py-3.5 font-bold whitespace-nowrap ${
                        isPositive ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {isPositive ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                        {isPositive ? "+" : ""}
                        {toNumber(row.stock_kg).toFixed(2)} KG
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <IconBtn title="Delete Record" tone="danger" onClick={() => deleteRow(row.id)}>
                        <Trash2 size={15} />
                      </IconBtn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
