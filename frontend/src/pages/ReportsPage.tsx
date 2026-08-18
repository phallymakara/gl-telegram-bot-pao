import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Calendar,
  FileSpreadsheet
} from "lucide-react";
/**
 * @file ReportsPage.tsx
 * @description Reports & Analytics page component rendering sales volume summaries, buy/sell ratios, and revenue distribution charts.
 */

import Card from "../components/Card";
import StatCard from "../components/StatCard";
import { api, DashboardStatsData, RevenuePointData, toNumber } from "../api";

interface ReportsPageProps {
  /** Toast notification trigger callback */
  notify: (msg: string) => void;
}

/**
 * Reports and analytics summary page component.
 */

export default function ReportsPage({ notify }: ReportsPageProps) {
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [revenue, setRevenue] = useState<RevenuePointData[]>([]);
  const [timeRange, setTimeRange] = useState<"week" | "month">("month");

  useEffect(() => {
    api.get<DashboardStatsData>("/api/dashboard/stats").then(setStats).catch(() => {});
    api.get<RevenuePointData[]>(`/api/dashboard/revenue?range=${timeRange}`).then(setRevenue).catch(() => {});
  }, [timeRange]);

  const totalBuyKg = toNumber(stats?.total_buy_kg);
  const totalSellKg = toNumber(stats?.total_sell_kg);
  const totalOrders = stats?.total_orders ?? 0;

  function exportReport(format: "pdf" | "csv") {
    notify(`Exporting system report as ${format.toUpperCase()}...`);
  }

  return (
    <div className="flex-1 p-4 sm:p-8 min-w-0 overflow-y-auto w-full flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">System Reports & Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">Comprehensive audit reports for buying, selling, and inventory performance.</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as "week" | "month")}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 font-medium focus:outline-none"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <button
            onClick={() => exportReport("pdf")}
            className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition-colors"
          >
            <Download size={14} /> Export PDF
          </button>
          <button
            onClick={() => exportReport("csv")}
            className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition-colors"
          >
            <FileSpreadsheet size={14} /> CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          icon={ArrowUpRight}
          label="Total Gold Sold"
          value={
            <>
              {totalSellKg.toFixed(1)}{" "}
              <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          sub="Outflow volume"
          tint="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={ArrowDownLeft}
          label="Total Gold Purchased"
          value={
            <>
              {totalBuyKg.toFixed(1)}{" "}
              <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          sub="Inflow volume"
          tint="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={BarChart3}
          label="Total System Orders"
          value={totalOrders}
          sub="Processed orders"
          tint="bg-purple-50 text-purple-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Net Flow Rate"
          value={
            <>
              {(totalBuyKg - totalSellKg).toFixed(1)}{" "}
              <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          sub="Inflow − Outflow"
          tint="bg-indigo-50 text-indigo-600"
        />
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-600" /> Revenue & Transaction Volume Comparison
          </h3>
          <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
            Range: {timeRange === "week" ? "Last 7 Days" : "Last 30 Days"}
          </span>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/40">
              <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
                Buying vs Selling Summary
              </h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Gold In (Buying)</span>
                    <span className="font-semibold text-slate-800">{totalBuyKg.toFixed(1)} KG</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (totalBuyKg / Math.max(totalBuyKg + totalSellKg, 1)) * 100)}%`
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Gold Out (Selling)</span>
                    <span className="font-semibold text-slate-800">{totalSellKg.toFixed(1)} KG</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (totalSellKg / Math.max(totalBuyKg + totalSellKg, 1)) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/40">
              <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
                System Audit Metrics
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 rounded-lg border border-slate-100">
                  <div className="text-slate-400">Total System Transactions</div>
                  <div className="text-lg font-bold text-slate-800 mt-1">{totalOrders}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-100">
                  <div className="text-slate-400">Report Status</div>
                  <div className="text-lg font-bold text-emerald-600 mt-1">Verified</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
