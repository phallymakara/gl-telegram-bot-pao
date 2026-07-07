import {
  AlertCircle,
  Calendar,
  Package,
  PauseCircle,
  Pencil,
  Plus,
  Tag,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import Card from "../components/Card";
import IconBtn from "../components/IconBtn";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import { AlertData, api, toNumber } from "../data/api";

interface AlertsPageProps {
  notify: (msg: string) => void;
  mode: "stock" | "promo";
}

export default function AlertsPage({ notify, mode }: AlertsPageProps) {
  const [alerts, setAlerts] = useState<AlertData[]>([]);

  useEffect(() => {
    const type = mode === "stock" ? "LOW_STOCK" : "PROMOTION";
    api
      .get<AlertData[]>(`/api/alerts/?alert_type=${type}`)
      .then(setAlerts)
      .catch(() => notify("Failed to load alerts"));
  }, [mode]);

  function deleteAlert(id: number) {
    api
      .delete(`/api/alerts/${id}`)
      .then(() => {
        setAlerts((a) => a.filter((x) => x.id !== id));
        notify("Alert deleted");
      })
      .catch(() => notify("Failed to delete alert"));
  }

  if (mode === "stock") {
    return (
      <div className="flex-1 pt-4 px-4 pb-2 sm:pt-4 sm:px-8 sm:pb-2 min-w-0 overflow-hidden w-full flex flex-col space-y-3 min-h-0">
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
            value={alerts.filter((a) => a.is_active).length}
            sub="Monitoring live stock levels"
            tint="bg-amber-50 text-amber-600"
          />
          <StatCard
            icon={PauseCircle}
            label="Paused Alerts"
            value={alerts.filter((a) => !a.is_active).length}
            sub="Monitoring temporarily disabled"
            tint="bg-slate-50 text-slate-500"
          />
        </div>
        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <div>
              <h3 className="font-semibold text-slate-800">
                Low Stock Alerts List
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Get notified when gold items fall below the specified stock
                level.
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
                    "Title",
                    "Message",
                    "Premium",
                    "Created",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 font-medium whitespace-nowrap bg-slate-50"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alerts.map((a, i) => (
                  <tr
                    key={a.id}
                    className="border-b border-slate-50 align-top hover:bg-slate-50/60"
                  >
                    <td className="px-5 py-3.5 text-slate-400">{i + 1}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-700">
                      {a.title}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 max-w-xs">
                      {a.message}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                      ${toNumber(a.premium).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge
                        status={a.is_active ? "Active" : "Inactive"}
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <IconBtn title="Edit">
                          <Pencil size={15} />
                        </IconBtn>
                        <IconBtn
                          title="Delete"
                          tone="danger"
                          onClick={() => deleteAlert(a.id)}
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
      </div>
    );
  }

  return (
    <div className="flex-1 pt-4 px-4 pb-2 sm:pt-4 sm:px-8 sm:pb-2 min-w-0 overflow-hidden w-full flex flex-col space-y-3 min-h-0">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
        <StatCard
          icon={Tag}
          label="Total Promotions"
          value={alerts.length}
          sub="Configured discount campaigns"
          tint="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={AlertCircle}
          label="Active Promos"
          value={alerts.filter((a) => a.is_active).length}
          sub="Currently running discounts"
          tint="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={Calendar}
          label="Scheduled Promos"
          value={
            alerts.filter(
              (a) => a.start_at && new Date(a.start_at) > new Date(),
            ).length
          }
          sub="Upcoming campaigns queue"
          tint="bg-blue-50 text-blue-600"
        />
      </div>
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-semibold text-slate-800">
              Discount Promotions List
            </h3>
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
                  "Title",
                  "Discount",
                  "Message",
                  "Premium",
                  "Start",
                  "End",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 font-medium whitespace-nowrap bg-slate-50"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alerts.map((p, i) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-50 align-top hover:bg-slate-50/60"
                >
                  <td className="px-5 py-3.5 text-slate-400">{i + 1}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="font-medium text-slate-700">{p.title}</div>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-700 whitespace-nowrap">
                    {p.discount
                      ? `${p.discount}${p.discount_type === "PERCENTAGE" ? "%" : "$"}`
                      : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 max-w-[220px]">
                    {p.message}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                    ${toNumber(p.premium).toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                    {p.start_at
                      ? new Date(p.start_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                    {p.end_at ? new Date(p.end_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={p.is_active ? "Active" : "Inactive"} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <IconBtn title="Edit">
                        <Pencil size={15} />
                      </IconBtn>
                      <IconBtn
                        title="Delete"
                        tone="danger"
                        onClick={() => deleteAlert(p.id)}
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
    </div>
  );
}
