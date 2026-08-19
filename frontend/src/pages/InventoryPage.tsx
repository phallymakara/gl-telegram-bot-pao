/**
 * @file InventoryPage.tsx
 * @description Inventory Ledger page component for tracking gold stock weights (kg), vault balances, and inventory adjustments.
 */

import { useEffect, useMemo, useState } from "react";
import { Archive, Boxes, TrendingUp, Warehouse } from "lucide-react";
import StatCard from "../components/StatCard";
import { api, dashboardApi, DashboardStatsData, InventoryData, toNumber } from "../api";
import InventoryTable from "./inventory/InventoryTable";
import AdjustmentModal from "./inventory/AdjustmentModal";

interface InventoryPageProps {
  /** Toast notification trigger callback */
  notify: (msg: string) => void;
}

/**
 * Inventory ledger management page component.
 */
export default function InventoryPage({ notify }: InventoryPageProps) {
  const [rows, setRows] = useState<InventoryData[]>([]);
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
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

  function loadData() {
    setLoading(true);
    let url = "/api/inventory/";
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    if (params.toString()) url += `?${params.toString()}`;

    api
      .get<InventoryData[]>(url)
      .then(setRows)
      .catch(() => notify("Failed to load inventory"))
      .finally(() => setLoading(false));

    dashboardApi
      .getStats()
      .then(setStats)
      .catch(() => {});
  }

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const isPositive = toNumber(row.stock_kg) >= 0;
      if (filterType === "inflow" && !isPositive) return false;
      if (filterType === "outflow" && isPositive) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const ref = (row.reference || "").toLowerCase();
        const party = (row.party || row.name || "").toLowerCase();
        if (!ref.includes(q) && !party.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filterType, searchQuery]);

  const totalStockKg = useMemo(
    () => rows.reduce((sum, r) => sum + toNumber(r.stock_kg), 0),
    [rows]
  );
  const totalInflowKg = useMemo(
    () =>
      rows.filter((r) => toNumber(r.stock_kg) > 0).reduce((sum, r) => sum + toNumber(r.stock_kg), 0),
    [rows]
  );
  const totalOutflowKg = useMemo(
    () =>
      rows
        .filter((r) => toNumber(r.stock_kg) < 0)
        .reduce((sum, r) => sum + Math.abs(toNumber(r.stock_kg)), 0),
    [rows]
  );

  const currentStockKg = useMemo(() => {
    if (stats?.physical_stock != null) return toNumber(stats.physical_stock);
    if (stats?.available != null) return toNumber(stats.available);
    if (stats?.total_gold != null) return toNumber(stats.total_gold);
    return totalStockKg;
  }, [stats, totalStockKg]);

  function clearDateFilter() {
    setStartDate("");
    setEndDate("");
  }

  function handleSaveAdjustment() {
    if (!adjustmentForm.amount || toNumber(adjustmentForm.amount) <= 0) {
      notify("Please enter a valid stock quantity");
      return;
    }

    const rawKg = toNumber(adjustmentForm.amount);
    const finalKg = adjustmentForm.type === "OUTFLOW" ? -Math.abs(rawKg) : Math.abs(rawKg);

    const body = {
      inventory_date: adjustmentForm.date,
      stock_kg: finalKg,
      party: adjustmentForm.reason || (adjustmentForm.type === "INFLOW" ? "Stock Inflow" : "Stock Outflow"),
      reference: `ADJ-${Date.now().toString().slice(-6)}`,
    };

    api
      .post<InventoryData>("/api/inventory/", body)
      .then((newRow) => {
        setRows((prev) => [newRow, ...prev]);
        setIsAdjustmentModalOpen(false);
        setAdjustmentForm({
          date: new Date().toISOString().split("T")[0],
          type: "INFLOW",
          amount: "",
          reason: "",
        });
        notify("Stock adjustment recorded");
        loadData();
      })
      .catch((e: Error) => notify(e.message));
  }

  function deleteRow(id: number) {
    api
      .delete(`/api/inventory/${id}`)
      .then(() => {
        setRows((r) => r.filter((x) => x.id !== id));
        notify("Inventory record deleted");
        loadData();
      })
      .catch(() => notify("Failed to delete record"));
  }

  return (
    <div className="flex-1 pt-4 px-4 pb-2 sm:pt-4 sm:px-8 sm:pb-2 min-w-0 overflow-hidden w-full flex flex-col space-y-3 min-h-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 flex-shrink-0">
        <StatCard
          label="Current Stock"
          value={`${currentStockKg.toFixed(2)} KG`}
          sub="Real-time physical vault stock"
          valueClassName="text-lg font-bold text-slate-800"
        />
        <StatCard
          label="Total Net Gold Stock"
          value={`${totalStockKg.toFixed(2)} KG`}
          sub="Combined physical vault inventory"
          valueClassName="text-lg font-bold text-slate-800"
        />
        <StatCard
          label="Total Stock Inflow"
          value={`+${totalInflowKg.toFixed(2)} KG`}
          sub="Received from POs & buybacks"
          valueClassName="text-lg font-bold text-emerald-600"
        />
        <StatCard
          label="Total Stock Outflow"
          value={`-${totalOutflowKg.toFixed(2)} KG`}
          sub="Dispatched to customer sales"
          valueClassName="text-lg font-bold text-indigo-600"
        />
      </div>

      <InventoryTable
        rows={filteredRows}
        loading={loading}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterType={filterType}
        setFilterType={setFilterType}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        clearDateFilter={clearDateFilter}
        openAdjustmentModal={() => setIsAdjustmentModalOpen(true)}
        deleteRow={deleteRow}
        notify={notify}
      />

      <AdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        form={adjustmentForm}
        setForm={setAdjustmentForm}
        onSave={handleSaveAdjustment}
      />
    </div>
  );
}
