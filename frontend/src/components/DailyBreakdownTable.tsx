import { Fragment, useEffect, useState } from "react";
import {
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  Globe,
  Building2,
  RotateCcw,
  Send,
  Store,
  Truck,
  Calendar,
  ChevronLeft,
  ChevronRightIcon,
} from "lucide-react";
import Card from "./Card";
import {
  dashboardApi,
  DailyBreakdownRowData,
  DailyOrderDetailData,
} from "../api/dashboard";
import { toNumber } from "../api/client";

function fmt(n: number) {
  return toNumber(n).toFixed(1);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ExpandedRow({ row }: { row: DailyBreakdownRowData }) {
  return (
    <tr className="bg-slate-50/80">
      <td colSpan={6} className="px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-4">
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3">
              <ArrowDownLeft size={14} /> Gold In
            </h4>
            <div className="space-y-2">
              <div className="flex flex-col p-2 rounded-lg bg-white border border-emerald-100">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 mb-0.5">
                  <Globe size={12} className="text-blue-600" /> Overseas PO
                </span>
                <span className="text-sm font-bold text-slate-900">{fmt(row.gold_in.po_overseas)} <span className="text-[10px] font-medium text-slate-400">KG</span></span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-emerald-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                    <Building2 size={12} className="text-indigo-600" /> Local
                  </span>
                  <span className="text-[11px] font-bold text-slate-700">{fmt(row.gold_in.po_local)} KG</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 ml-3">
                  <div className="flex flex-col p-1.5 rounded bg-slate-50 border border-slate-100">
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                      <Truck size={10} className="text-sky-600" /> Platform
                    </span>
                    <span className="text-xs font-bold text-slate-900">{fmt(row.gold_in.po_local_platform)} KG</span>
                  </div>
                  <div className="flex flex-col p-1.5 rounded bg-slate-50 border border-slate-100">
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                      <RotateCcw size={10} className="text-emerald-600" /> Physical
                    </span>
                    <span className="text-xs font-bold text-slate-900">{fmt(row.gold_in.po_local_physical)} KG</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-emerald-100 flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-500">Total IN</span>
              <span className="text-sm font-black text-emerald-700">{fmt(row.gold_in.total)} KG</span>
            </div>
          </div>

          <div className="rounded-lg border border-indigo-100 bg-indigo-50/30 p-4">
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700 mb-3">
              <ArrowUpRight size={14} /> Gold Out
            </h4>
            <div className="space-y-2">
              <div className="flex flex-col p-2 rounded-lg bg-white border border-indigo-100">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 mb-0.5">
                  <Globe size={12} className="text-blue-600" /> Overseas
                </span>
                <span className="text-sm font-bold text-slate-900">{fmt(row.gold_out.overseas)} <span className="text-[10px] font-medium text-slate-400">KG</span></span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-indigo-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                    <Building2 size={12} className="text-indigo-600" /> Local
                  </span>
                  <span className="text-[11px] font-bold text-slate-700">{fmt(row.gold_out.platform + row.gold_out.physical)} KG</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 ml-3">
                  <div className="flex flex-col p-1.5 rounded bg-slate-50 border border-slate-100">
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                      <Send size={10} className="text-sky-600" /> Platform
                    </span>
                    <span className="text-xs font-bold text-slate-900">{fmt(row.gold_out.platform)} KG</span>
                  </div>
                  <div className="flex flex-col p-1.5 rounded bg-slate-50 border border-slate-100">
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                      <Store size={10} className="text-amber-600" /> Physical
                    </span>
                    <span className="text-xs font-bold text-slate-900">{fmt(row.gold_out.physical)} KG</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-indigo-100 flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-500">Total OUT</span>
              <span className="text-sm font-black text-indigo-700">{fmt(row.gold_out.total)} KG</span>
            </div>
          </div>
        </div>

        {row.orders.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Orders ({row.orders.length})
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-1.5 px-2 font-semibold text-slate-500">Order #</th>
                    <th className="text-left py-1.5 px-2 font-semibold text-slate-500">Type</th>
                    <th className="text-left py-1.5 px-2 font-semibold text-slate-500">Customer</th>
                    <th className="text-left py-1.5 px-2 font-semibold text-slate-500">Channel</th>
                    <th className="text-right py-1.5 px-2 font-semibold text-slate-500">Qty (KG)</th>
                    <th className="text-left py-1.5 px-2 font-semibold text-slate-500">Status</th>
                    <th className="text-left py-1.5 px-2 font-semibold text-slate-500">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {row.orders.map((o: DailyOrderDetailData) => {
                    const rawCh = (o.channel || "").toUpperCase();
                    return (
                      <tr key={o.id} className="border-b border-slate-100 last:border-0 hover:bg-white/60">
                        <td className="py-1.5 px-2 font-medium text-slate-700">{o.order_no}</td>
                        <td className="py-1.5 px-2">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            o.transaction_type === "BUY"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-indigo-100 text-indigo-700"
                          }`}>
                            {o.transaction_type}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-slate-600">{o.customer_name || "-"}</td>
                        <td className="py-1.5 px-2">
                          {rawCh === "OVERSEA" || rawCh === "OVERSEAS" ? (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                              Oversea
                            </span>
                          ) : rawCh === "TELEGRAM" ? (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                              Local (Telegram)
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              Local (Physical)
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-right font-medium text-slate-700">{fmt(o.quantity)}</td>
                        <td className="py-1.5 px-2 text-slate-600">{o.status}</td>
                        <td className="py-1.5 px-2 text-slate-500">{formatTime(o.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function DailyBreakdownTable() {
  const today = new Date();
  const [anchorDate, setAnchorDate] = useState(toISODate(today));
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [data, setData] = useState<DailyBreakdownRowData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    dashboardApi
      .getDailyBreakdown(anchorDate)
      .then((res) => {
        setData(res.days);
        setExpandedDates(new Set());
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [anchorDate]);

  const navigateDays = (offset: number) => {
    const d = new Date(anchorDate + "T00:00:00");
    d.setDate(d.getDate() + offset);
    setAnchorDate(toISODate(d));
  };

  const goToday = () => setAnchorDate(toISODate(today));

  const isViewingToday = anchorDate === toISODate(today);

  const totalIn = data.reduce((s, d) => s + d.gold_in.total, 0);
  const totalOut = data.reduce((s, d) => s + d.gold_out.total, 0);
  const totalBalance = totalIn - totalOut;

  const windowStart = data.length > 0 ? data[0].date : "";
  const windowEnd = data.length > 0 ? data[data.length - 1].date : "";

  const toggleExpand = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  return (
    <Card className="shadow-none">
      {/* Header with navigation */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-indigo-600" />
            <h3 className="font-bold text-slate-900">Daily Breakdown</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigateDays(-7)}
              className="h-8 px-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center gap-1 text-xs font-medium"
            >
              <ChevronLeft size={14} /> -7d
            </button>
            <button
              onClick={() => navigateDays(-1)}
              className="h-8 px-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center gap-1 text-xs font-medium"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={goToday}
              disabled={isViewingToday}
              className={`h-8 px-3 rounded-lg text-xs font-bold ${
                isViewingToday
                  ? "bg-indigo-100 text-indigo-400 cursor-default"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => navigateDays(1)}
              className="h-8 px-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center gap-1 text-xs font-medium"
            >
              <ChevronRightIcon size={14} />
            </button>
            <button
              onClick={() => navigateDays(7)}
              className="h-8 px-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center gap-1 text-xs font-medium"
            >
              +7d <ChevronRightIcon size={14} />
            </button>
          </div>
        </div>

        {/* Date range + summary */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-3 text-xs">
          <span className="text-slate-400 font-medium">
            {windowStart && windowEnd ? `${formatDate(windowStart)} — ${formatDate(windowEnd)}` : ""}
          </span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="font-bold text-emerald-700">IN: {fmt(totalIn)} KG</span>
          <span className="font-bold text-indigo-700">OUT: {fmt(totalOut)} KG</span>
          <span className={`font-bold ${totalBalance >= 0 ? "text-green-700" : "text-red-600"}`}>
            Balance: {fmt(totalBalance)} KG
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <th className="w-8"></th>
              <th className="text-left py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Date</th>
              <th className="text-right py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Gold In</th>
              <th className="text-right py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Gold Out</th>
              <th className="text-right py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Balance</th>
              <th className="text-right py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Tx</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 text-sm">Loading...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 text-sm">No data for this period</td>
              </tr>
            ) : (
              data.map((row) => {
                const isExpanded = expandedDates.has(row.date);
                const d = new Date(row.date + "T00:00:00");
                const isToday =
                  d.getFullYear() === today.getFullYear() &&
                  d.getMonth() === today.getMonth() &&
                  d.getDate() === today.getDate();
                return (
                  <Fragment key={row.date}>
                    <tr
                      className={`border-b border-slate-100 cursor-pointer transition-colors hover:bg-indigo-50/40 ${
                        isToday ? "bg-indigo-50/60" : ""
                      }`}
                      onClick={() => toggleExpand(row.date)}
                    >
                      <td className="pl-3 pr-1 py-3">
                        <span className="text-slate-400 transition-transform" style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block" }}>
                          <ChevronRight size={16} />
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-2">
                          {isToday && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          )}
                          <span className={`font-medium ${isToday ? "text-indigo-700 font-bold" : "text-slate-700"}`}>
                            {formatDate(row.date)}
                          </span>
                          {isToday && (
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">TODAY</span>
                          )}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="font-semibold text-emerald-700">{fmt(row.gold_in.total)}</span>
                        <span className="text-[10px] text-slate-400 ml-1">KG</span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="font-semibold text-indigo-700">{fmt(row.gold_out.total)}</span>
                        <span className="text-[10px] text-slate-400 ml-1">KG</span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className={`font-bold ${row.balance >= 0 ? "text-green-700" : "text-red-600"}`}>
                          {fmt(row.balance)}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">KG</span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="text-slate-500 font-medium">{row.transaction_count}</span>
                      </td>
                    </tr>
                    {isExpanded && <ExpandedRow row={row} />}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
