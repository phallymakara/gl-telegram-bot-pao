import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Globe,
  Package,
  RotateCcw,
  Send,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck,
} from "lucide-react";
/**
 * @file DashboardPage.tsx
 * @description System overview dashboard page rendering real-time KPI metrics, stock balances, and incoming/outgoing gold summaries.
 */

import { useEffect, useState } from "react";
import Card from "../components/Card";
import StatCard from "../components/StatCard";
import DailyBreakdownTable from "../components/DailyBreakdownTable";
import { api, DashboardStatsData, toNumber } from "../api";

/**
 * Main dashboard page component displaying system KPI statistics cards and inventory breakdown.
 */
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStatsData | null>(null);

  useEffect(() => {
    const loadStats = () => {
      api
        .get<DashboardStatsData>("/api/dashboard/stats")
        .then(setStats)
        .catch(() => {});
    };
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const physicalStock = toNumber(stats?.physical_stock ?? 0).toFixed(1);
  const incomingPo = toNumber(stats?.incoming_po ?? 0).toFixed(1);

  const goldInOverseas = toNumber(stats?.gold_in_overseas ?? 0).toFixed(1);
  const goldInLocalPlatform = toNumber(stats?.gold_in_local_platform ?? 0).toFixed(1);
  const goldInLocalPhysical = toNumber(stats?.gold_in_local_physical ?? 0).toFixed(1);
  const goldInLocal = toNumber(stats?.gold_in_local ?? 0).toFixed(1);
  const goldInTotal = toNumber(
    stats?.gold_in_total ??
    (toNumber(stats?.gold_in_overseas ?? 0) +
      toNumber(stats?.gold_in_local ?? 0))
  ).toFixed(1);

  const goldOutOverseas = toNumber(stats?.gold_out_overseas ?? 0).toFixed(1);
  const goldOutPlatform = toNumber(stats?.gold_out_platform ?? 0).toFixed(1);
  const goldOutPhysical = toNumber(stats?.gold_out_physical ?? 0).toFixed(1);
  const goldOutLocal = (parseFloat(goldOutPlatform) + parseFloat(goldOutPhysical)).toFixed(1);
  const goldOutTotal = toNumber(
    stats?.gold_out_total ??
    (toNumber(stats?.gold_out_overseas ?? 0) +
      toNumber(stats?.gold_out_platform ?? 0) +
      toNumber(stats?.gold_out_physical ?? 0))
  ).toFixed(1);

  const totalPurchase = toNumber(stats?.total_buy_kg ?? stats?.gold_in_total ?? 0).toFixed(1);
  const totalSale = toNumber(stats?.total_sell_kg ?? stats?.gold_out_total ?? 0).toFixed(1);

  return (
    <div className="space-y-4">

      {/* 1. OVERVIEW STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Physical Stock"
          value={
            <>
              {physicalStock} <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          sub="Current inventory"
          tint="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={Truck}
          label="Incoming PO"
          value={
            <>
              {incomingPo} <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          sub="Awaiting receipt"
          tint="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={ShoppingBag}
          label="Total Purchase"
          value={
            <>
              {totalPurchase} <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          sub="Vendor & Customer Buy-back"
          tint="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={ShoppingCart}
          label="Total Sale"
          value={
            <>
              {totalSale} <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          sub="Sales to Customers"
          tint="bg-indigo-50 text-indigo-600"
        />
      </div>

      {/* 2. GOLD IN & GOLD OUT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* GOLD IN */}
        <Card className="shadow-none p-5 md:p-6 border border-emerald-100 bg-gradient-to-br from-emerald-50/20 via-white to-white flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between pb-3 border-b border-emerald-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <ArrowDownLeft size={20} className="text-emerald-600" /> GOLD IN
                </h3>
                <p className="text-xs text-slate-500 font-medium">Today's / selected-period purchases</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-1">
                  <Globe size={15} className="text-blue-600 shrink-0" /> Overseas PO
                </span>
                <span className="font-bold text-sm text-slate-900">{goldInOverseas} <span className="text-xs font-medium text-slate-400">KG</span></span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
                  <Building2 size={15} className="text-indigo-600 shrink-0" /> Local
                  <span className="font-bold text-slate-900 ml-auto">{goldInLocal} <span className="text-xs font-medium text-slate-400">KG</span></span>
                </span>
                <div className="grid grid-cols-2 gap-2 ml-5">
                  <div className="flex flex-col p-2 rounded-lg bg-white border border-slate-100">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 mb-0.5">
                      <Truck size={12} className="text-sky-600 shrink-0" /> Platform
                    </span>
                    <span className="text-sm font-bold text-slate-900">{goldInLocalPlatform} <span className="text-[10px] font-medium text-slate-400">KG</span></span>
                  </div>
                  <div className="flex flex-col p-2 rounded-lg bg-white border border-slate-100">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 mb-0.5">
                      <RotateCcw size={12} className="text-emerald-600 shrink-0" /> Physical
                    </span>
                    <span className="text-sm font-bold text-slate-900">{goldInLocalPhysical} <span className="text-[10px] font-medium text-slate-400">KG</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total IN</span>
            <span className="text-base font-black text-emerald-700">{goldInTotal} KG</span>
          </div>
        </Card>

        {/* GOLD OUT */}
        <Card className="shadow-none p-5 md:p-6 border border-indigo-100 bg-gradient-to-br from-indigo-50/20 via-white to-white flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between pb-3 border-b border-indigo-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <ArrowUpRight size={20} className="text-indigo-600" /> GOLD OUT
                </h3>
                <p className="text-xs text-slate-500 font-medium">Today's / selected-period sales</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-1">
                  <Globe size={15} className="text-blue-600 shrink-0" /> Overseas
                </span>
                <span className="font-bold text-sm text-slate-900">{goldOutOverseas} <span className="text-xs font-medium text-slate-400">KG</span></span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
                  <Building2 size={15} className="text-indigo-600 shrink-0" /> Local
                  <span className="font-bold text-slate-900 ml-auto">{goldOutLocal} <span className="text-xs font-medium text-slate-400">KG</span></span>
                </span>
                <div className="grid grid-cols-2 gap-2 ml-5">
                  <div className="flex flex-col p-2 rounded-lg bg-white border border-slate-100">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 mb-0.5">
                      <Send size={12} className="text-sky-600 shrink-0" /> Platform
                    </span>
                    <span className="text-sm font-bold text-slate-900">{goldOutPlatform} <span className="text-[10px] font-medium text-slate-400">KG</span></span>
                  </div>
                  <div className="flex flex-col p-2 rounded-lg bg-white border border-slate-100">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 mb-0.5">
                      <Store size={12} className="text-amber-600 shrink-0" /> Physical
                    </span>
                    <span className="text-sm font-bold text-slate-900">{goldOutPhysical} <span className="text-[10px] font-medium text-slate-400">KG</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-indigo-100 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total OUT</span>
            <span className="text-base font-black text-indigo-700">{goldOutTotal} KG</span>
          </div>
        </Card>
      </div>

      {/* 3. DAILY BREAKDOWN TABLE */}
      <DailyBreakdownTable />

    </div>
  );
}
