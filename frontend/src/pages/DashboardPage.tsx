import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Clock,
  Package,
  PieChart,
  Plus,
  Send,
  Settings as SettingsIcon,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import Card from "../components/Card";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import {
  api,
  CustomerData,
  DashboardStatsData,
  RevenuePointData,
  toNumber,
} from "../data/api";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [revenue, setRevenue] = useState<RevenuePointData[]>([]);
  const [range, setRange] = useState("week");
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [newUserId, setNewUserId] = useState("");
  const [newUsername, setNewUsername] = useState("");

  useEffect(() => {
    api
      .get<DashboardStatsData>("/api/dashboard/stats")
      .then(setStats)
      .catch(() => {});
  }, []);

  useEffect(() => {
    api
      .get<CustomerData[]>("/api/customers/")
      .then(setCustomers)
      .catch(() => {});
  }, []);

  useEffect(() => {
    api
      .get<RevenuePointData[]>(`/api/dashboard/revenue?range=${range}`)
      .then(setRevenue)
      .catch(() => {});
  }, [range]);

  const chartData =
    revenue.length > 0
      ? revenue
      : [
          { day: "Sun", buy: 0, sell: 0 },
          { day: "Mon", buy: 0, sell: 0 },
          { day: "Tue", buy: 0, sell: 0 },
          { day: "Wed", buy: 0, sell: 0 },
          { day: "Thu", buy: 0, sell: 0 },
          { day: "Fri", buy: 0, sell: 0 },
          { day: "Sat", buy: 0, sell: 0 },
        ];

  const platformTotal = stats ? stats.total_orders : 0;
  const totalKg = toNumber(stats?.total_gold);
  const totalBuyKg = toNumber(stats?.total_buy_kg);
  const totalSellKg = toNumber(stats?.total_sell_kg);

  function addCustomer() {
    if (!newUsername.trim() && !newUserId.trim()) return;
    api
      .post<CustomerData>("/api/customers/", {
        username: newUsername.trim() || null,
        telegram_user_id: newUserId.trim() || null,
      })
      .then((c) => {
        setCustomers((prev) => [c, ...prev]);
        setNewUserId("");
        setNewUsername("");
      })
      .catch(() => {});
  }

  function removeCustomer(id: number) {
    api
      .delete(`/api/customers/${id}`)
      .then(() => setCustomers((prev) => prev.filter((c) => c.id !== id)))
      .catch(() => {});
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Package}
          label="Total Gold"
          value={
            <>
              {totalKg.toFixed(2)}{" "}
              <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          sub="Total inventory"
          tint="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={ArrowUpRight}
          label="Sold Today"
          value={stats?.sold_today ?? 0}
          sub="Today"
          tint="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={ArrowDownLeft}
          label="Buy Today"
          value={stats?.buy_today ?? 0}
          sub="Today"
          tint="bg-emerald-50 text-emerald-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <BarChart3 size={16} className="text-indigo-500" /> Revenue
              Overview
            </h3>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
          <svg viewBox="0 0 700 220" className="w-full h-56">
            <defs>
              <linearGradient id="areaBuy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="areaSell" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={i}
                x1="0"
                x2="700"
                y1={20 + i * 45}
                y2={20 + i * 45}
                stroke="#eef0f4"
              />
            ))}
            {(() => {
              const maxVal = Math.max(
                ...chartData.map((d) => Math.max(d.buy, d.sell)),
                1,
              );
              const stepX = 700 / (chartData.length - 1 || 1);
              const ptsBuy = chartData.map((d, i) => [
                i * stepX,
                200 - (d.buy / maxVal) * 180,
              ]);
              const ptsSell = chartData.map((d, i) => [
                i * stepX,
                200 - (d.sell / maxVal) * 180,
              ]);
              const lineBuy = ptsBuy.map((p) => p.join(",")).join(" ");
              const lineSell = ptsSell.map((p) => p.join(",")).join(" ");
              return (
                <>
                  <polygon
                    points={`0,200 ${lineBuy} 700,200`}
                    fill="url(#areaBuy)"
                  />
                  <polygon
                    points={`0,200 ${lineSell} 700,200`}
                    fill="url(#areaSell)"
                  />
                  <polyline
                    points={lineBuy}
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points={lineSell}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {ptsBuy.map((p, i) => (
                    <circle
                      key={`b-${i}`}
                      cx={p[0]}
                      cy={p[1]}
                      r="4"
                      fill="#4f46e5"
                      stroke="#ffffff"
                      strokeWidth="1"
                    />
                  ))}
                  {ptsSell.map((p, i) => (
                    <circle
                      key={`s-${i}`}
                      cx={p[0]}
                      cy={p[1]}
                      r="4"
                      fill="#f43f5e"
                      stroke="#ffffff"
                      strokeWidth="1"
                    />
                  ))}
                </>
              );
            })()}
          </svg>
          <div className="flex justify-between text-xs text-slate-400 px-1 -mt-2">
            {chartData.map((d) => (
              <span key={d.day}>{d.day}</span>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-6 rounded bg-indigo-600 inline-block" />{" "}
              Buy Revenue (USD)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-6 rounded bg-rose-500 inline-block" /> Sell
              Revenue (USD)
            </span>
          </div>
        </Card>

        <Card className="p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <PieChart size={16} className="text-indigo-500" /> Orders Overview
            </h3>
            <div className="relative flex items-center justify-center h-40">
              <svg width="130" height="130" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="45"
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="10"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="45"
                  fill="transparent"
                  stroke="#4f46e5"
                  strokeWidth="10"
                  strokeDasharray="282.74"
                  strokeDashoffset="106.03"
                  transform="rotate(-90 60 60)"
                  strokeLinecap="round"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="45"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="10"
                  strokeDasharray="282.74"
                  strokeDashoffset="176.71"
                  transform="rotate(135 60 60)"
                  strokeLinecap="round"
                />
                <text
                  x="60"
                  y="55"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xl font-bold fill-slate-800"
                >
                  {platformTotal}
                </text>
                <text
                  x="60"
                  y="72"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[9px] fill-slate-400 font-semibold uppercase tracking-wider"
                >
                  Total Orders
                </text>
              </svg>
            </div>
          </div>
          <div className="space-y-2 mt-2">
            <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="h-2.5 w-2.5 rounded bg-indigo-600 inline-block" />{" "}
                Buy
              </span>
              <span className="font-semibold text-slate-700">
                {totalBuyKg.toFixed(1)} KG
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="h-2.5 w-2.5 rounded bg-emerald-500 inline-block" />{" "}
                Sell
              </span>
              <span className="font-semibold text-slate-700">
                {totalSellKg.toFixed(1)} KG
              </span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <UserCheck size={16} className="text-indigo-500" /> Whitelist —
              Allowed Telegram Users
            </h3>
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-medium">
              {customers.length} users
            </span>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Username (required, without @)"
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <input
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              placeholder="Telegram ID (optional)"
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              onClick={addCustomer}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium whitespace-nowrap"
            >
              <Plus size={15} /> Add
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {customers.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                No whitelisted users yet. Add a Telegram ID above.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200">
                    <th className="pb-2 font-medium">Username</th>
                    <th className="pb-2 font-medium">Telegram ID</th>
                    <th className="pb-2 font-medium">Added</th>
                    <th className="pb-2 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-slate-50 hover:bg-slate-50/60"
                    >
                      <td className="py-2 text-slate-700 font-medium">
                        {c.username || "—"}
                      </td>
                      <td className="py-2 text-slate-400 font-mono text-xs">
                        {c.telegram_user_id || "—"}
                      </td>
                      <td className="py-2 text-slate-400 text-xs">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => removeCustomer(c.id)}
                          className="text-rose-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 size={13} />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <BarChart3 size={16} className="text-indigo-500" /> Transaction
              Volume
            </h3>
          </div>
          <svg viewBox="0 0 700 200" className="w-full h-52">
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={i}
                x1="0"
                x2="700"
                y1={20 + i * 35}
                y2={20 + i * 35}
                stroke="#eef0f4"
              />
            ))}
            {(() => {
              const maxVal = Math.max(
                ...chartData.map((d) => Math.max(d.buy, d.sell)),
                1,
              );
              const scale = 140 / maxVal;
              return chartData.map((d, i) => {
                const stepX = 700 / chartData.length;
                const buyH = d.buy * scale;
                const sellH = d.sell * scale;
                return (
                  <g key={i}>
                    <rect
                      x={i * stepX + stepX * 0.25}
                      y={160 - buyH}
                      width={stepX * 0.2}
                      height={buyH}
                      rx="3"
                      fill="#4f46e5"
                    />
                    <rect
                      x={i * stepX + stepX * 0.55}
                      y={160 - sellH}
                      width={stepX * 0.2}
                      height={sellH}
                      rx="3"
                      fill="#10b981"
                    />
                  </g>
                );
              });
            })()}
            <line
              x1="0"
              x2="700"
              y1="160"
              y2="160"
              stroke="#cbd5e1"
              strokeWidth="1"
            />
          </svg>
          <div className="flex items-center gap-4 mt-4 text-xs text-slate-500 pl-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-5 rounded bg-indigo-600 inline-block" />{" "}
              Buy (USD)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-5 rounded bg-emerald-500 inline-block" />{" "}
              Sell (USD)
            </span>
          </div>
        </Card>

        <Card className="p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <SettingsIcon size={16} className="text-indigo-500" /> System
              Information
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm border-b border-slate-100 pb-3.5">
                <span className="flex items-center gap-2 text-slate-500">
                  <Clock size={15} /> System Close Time
                </span>
                <span className="font-semibold text-slate-700">11:00 PM</span>
              </div>
              <div className="flex items-center justify-between text-sm border-b border-slate-100 pb-3.5">
                <span className="flex items-center gap-2 text-slate-500">
                  <Clock size={15} /> Current Server Time
                </span>
                <span className="font-semibold text-slate-700">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-500">
                  <Send size={15} /> Bot Status
                </span>
                <StatusBadge status="Active" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
