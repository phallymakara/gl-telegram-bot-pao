import React, { useState } from "react";
import { Package, Tag, Plus, Pencil, Trash2, Info, AlertCircle, PauseCircle, Calendar } from "lucide-react";
import Card from "../components/Card";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import IconBtn from "../components/IconBtn";
import { lowStockSeed, promoSeed, LowStockAlert, Promotion } from "../data/mockData";

interface AlertsPageProps {
  notify: (msg: string) => void;
  mode: "stock" | "promo";
}

export default function AlertsPage({ notify, mode }: AlertsPageProps) {
  const [alerts, setAlerts] = useState<LowStockAlert[]>(lowStockSeed);
  const [promos, setPromos] = useState<Promotion[]>(promoSeed);

  return (
    <div className="flex-1 pt-4 px-4 pb-2 sm:pt-4 sm:px-8 sm:pb-2 min-w-0 overflow-hidden w-full flex flex-col space-y-3 min-h-0">
      {mode === "stock" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
            <StatCard
              icon={Package}
              label="Total Alerts"
              value={alerts.length}
              sub="Configured stock rules"
              tint="bg-indigo-50 text-indigo-600"
            />
            <StatCard
              icon={AlertCircle}
              label="Active Alerts"
              value={alerts.filter((a) => a.status === "Active").length}
              sub="Monitoring live stock levels"
              tint="bg-amber-50 text-amber-600"
            />
            <StatCard
              icon={PauseCircle}
              label="Paused Alerts"
              value={alerts.filter((a) => a.status === "Paused").length}
              sub="Monitoring temporarily disabled"
              tint="bg-slate-50 text-slate-500"
            />
          </div>

          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-semibold text-slate-800">Low Stock Alerts List</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Get notified when gold items fall below the specified stock level.
                </p>
              </div>
              <button
                onClick={() => notify("Low stock alert created")}
                className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium shrink-0"
              >
                <Plus size={15} /> Add Low Stock
              </button>
            </div>
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
              <table className="w-full text-sm min-w-[1000px]">
                <thead className="sticky top-0 z-10">
                  <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                    {[
                      "#",
                      "Threshold",
                      "Message to User",
                      "Premium (USD)",
                      "Date & Time",
                      "Status",
                      "Actions"
                    ].map((h) => (
                      <th key={h} className="px-5 py-3 font-medium whitespace-nowrap bg-slate-50">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a, i) => (
                    <tr key={a.id} className="border-b border-slate-50 align-top hover:bg-slate-50/60">
                      <td className="px-5 py-3.5 text-slate-400">{i + 1}</td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{a.threshold}</td>
                      <td className="px-5 py-3.5 text-slate-500 max-w-xs">{a.message}</td>
                      <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">${a.premium.toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                        <div className="font-medium">{a.date}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{a.time}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <IconBtn title="Edit">
                            <Pencil size={15} />
                          </IconBtn>
                          <IconBtn
                            title="Delete"
                            tone="danger"
                            onClick={() => {
                              setAlerts((al) => al.filter((x) => x.id !== a.id));
                              notify("Alert deleted");
                            }}
                          >
                            <Trash2 size={15} />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
            <StatCard
              icon={Tag}
              label="Total Promotions"
              value={promos.length}
              sub="Configured discount campaigns"
              tint="bg-indigo-50 text-indigo-600"
            />
            <StatCard
              icon={AlertCircle}
              label="Active Promos"
              value={promos.filter((p) => p.status === "Active").length}
              sub="Currently running discounts"
              tint="bg-emerald-50 text-emerald-600"
            />
            <StatCard
              icon={Calendar}
              label="Scheduled Promos"
              value={promos.filter((p) => p.status === "Scheduled").length}
              sub="Upcoming campaigns queue"
              tint="bg-blue-50 text-blue-600"
            />
          </div>

          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-semibold text-slate-800">Discount Promotions List</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Create and schedule discounts to boost sales.
                </p>
              </div>
              <button
                onClick={() => notify("Promotion created")}
                className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium shrink-0"
              >
                <Plus size={15} /> Add Promotion
              </button>
            </div>
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
              <table className="w-full text-sm min-w-[1000px]">
                <thead className="sticky top-0 z-10">
                  <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                    {[
                      "#",
                      "Promotion Name",
                      "Discount",
                      "Message to User",
                      "Premium",
                      "Start",
                      "End",
                      "Status",
                      "Actions"
                    ].map((h) => (
                      <th key={h} className="px-5 py-3 font-medium whitespace-nowrap bg-slate-50">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {promos.map((p, i) => (
                    <tr key={p.id} className="border-b border-slate-50 align-top hover:bg-slate-50/60">
                      <td className="px-5 py-3.5 text-slate-400">{i + 1}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-medium text-slate-700">{p.name}</div>
                        <div className="text-xs text-slate-400">{p.desc}</div>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-700 whitespace-nowrap">{p.value}</td>
                      <td className="px-5 py-3.5 text-slate-500 max-w-[220px]">{p.message}</td>
                      <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">${p.premium.toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                        {p.start}
                        <br />
                        <span className="text-xs text-slate-400">{p.startTime}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                        {p.end}
                        <br />
                        <span className="text-xs text-slate-400">{p.endTime}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <IconBtn title="Edit">
                            <Pencil size={15} />
                          </IconBtn>
                          <IconBtn
                            title="Delete"
                            tone="danger"
                            onClick={() => {
                              setPromos((pr) => pr.filter((x) => x.id !== p.id));
                              notify("Promotion deleted");
                            }}
                          >
                            <Trash2 size={15} />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
