import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  Building2,
  CheckCircle2,
  Clock,
  Globe,
  Lock,
  Package,
  PhoneCall,
  RotateCcw,
  Send,
  Settings as SettingsIcon,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import Card from "../components/Card";
import StatCard from "../components/StatCard";
import { api, DashboardStatsData, toNumber } from "../data/api";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStatsData | null>(null);

  useEffect(() => {
    api
      .get<DashboardStatsData>("/api/dashboard/stats")
      .then(setStats)
      .catch(() => { });
  }, []);

  const physicalStock = toNumber(stats?.physical_stock ?? 100.0).toFixed(1);
  const reservedStock = toNumber(stats?.reserved ?? 40.0).toFixed(1);
  const availableStock = toNumber(stats?.available ?? 60.0).toFixed(1);
  const openOrdersCount = stats?.open_orders ?? 12;

  return (
    <div className="space-y-4">

      {/* 1. OVERVIEW STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          icon={Package}
          label="Physical Stock"
          value={
            <>
              100.0 <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          sub="Current inventory"
          tint="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={Truck}
          label="Incoming PO"
          value="5"
          sub="Awaiting receipt"
          tint="bg-amber-50 text-amber-600"
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-1">
                  <Globe size={15} className="text-blue-600 shrink-0" /> Overseas
                </span>
                <span className="font-bold text-sm text-slate-900">25.0 <span className="text-xs font-medium text-slate-400">KG</span></span>
              </div>

              <div className="flex flex-col p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-1">
                  <Building2 size={15} className="text-indigo-600 shrink-0" /> Local
                </span>
                <span className="font-bold text-sm text-slate-900">35.0 <span className="text-xs font-medium text-slate-400">KG</span></span>
              </div>

              <div className="flex flex-col p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-1">
                  <RotateCcw size={15} className="text-emerald-600 shrink-0" /> Customer
                </span>
                <span className="font-bold text-sm text-slate-900">15.5 <span className="text-xs font-medium text-slate-400">KG</span></span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total IN</span>
            <span className="text-base font-black text-emerald-700">75.5 KG</span>
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-1">
                  <Send size={15} className="text-sky-600 shrink-0" /> Telegram
                </span>
                <span className="font-bold text-sm text-slate-900">18.2 <span className="text-xs font-medium text-slate-400">KG</span></span>
              </div>

              <div className="flex flex-col p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-1">
                  <PhoneCall size={15} className="text-purple-600 shrink-0" /> Phone
                </span>
                <span className="font-bold text-sm text-slate-900">12.0 <span className="text-xs font-medium text-slate-400">KG</span></span>
              </div>

              <div className="flex flex-col p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-1">
                  <Store size={15} className="text-amber-600 shrink-0" /> Walk-in
                </span>
                <span className="font-bold text-sm text-slate-900">8.5 <span className="text-xs font-medium text-slate-400">KG</span></span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-indigo-100 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total OUT</span>
            <span className="text-base font-black text-indigo-700">38.7 KG</span>
          </div>
        </Card>
      </div>

    </div>
  );
}
