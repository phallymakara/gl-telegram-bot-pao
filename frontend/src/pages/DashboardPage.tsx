import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  Globe,
  Lock,
  Package,
  PhoneCall,
  PieChart,
  Plus,
  RotateCcw,
  Send,
  Settings as SettingsIcon,
  ShoppingBag,
  Store,
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

  useEffect(() => {
    api
      .get<DashboardStatsData>("/api/dashboard/stats")
      .then(setStats)
      .catch(() => { });
  }, []);

  useEffect(() => {
    api
      .get<RevenuePointData[]>(`/api/dashboard/revenue?range=${range}`)
      .then(setRevenue)
      .catch(() => { });
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

  return (

    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Package}
          label="Physical Stock"
          value={
            <>
              {toNumber(stats?.physical_stock ?? 100.0).toFixed(1)}{" "}
              <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          sub="Only changes on receipt / delivery"
          tint="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={Lock}
          label="Reserved"
          value={
            <>
              {toNumber(stats?.reserved ?? 40.0).toFixed(1)}{" "}
              <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          sub="Confirmed orders, not delivered"
          tint="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Available"
          value={
            <>
              {toNumber(stats?.available ?? 60.0).toFixed(1)}{" "}
              <span className="text-sm font-normal text-slate-400">KG</span>
            </>
          }
          sub="Physical − Reserved"
          tint="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={ShoppingBag}
          label="Open Orders"
          value={stats?.open_orders ?? 12}
          sub="Active orders"
          tint="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Main Containers: 2 Columns Layout for Gold IN and Gold OUT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Column 1: Gold IN — Buying */}
        <Card className="shadow-none p-6 border border-emerald-100 bg-gradient-to-br from-emerald-50/20 via-white to-white flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-emerald-100/60 mb-5 gap-2">
              <div className="flex items-center gap-3">
                <ArrowDownLeft size={22} className="text-emerald-600 shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Gold IN — Buying</h3>
                  <p className="text-xs text-slate-500 font-medium">One module for all buying</p>
                </div>
              </div>
              <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-3 py-1 rounded-full self-start sm:self-auto">
                Total Inflow: {totalBuyKg.toFixed(1)} KG
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 hover:border-emerald-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="mb-2">
                    <Globe size={18} className="text-blue-600 shrink-0" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs mb-1">Oversea Vendor</h4>
                  <p className="text-[11px] text-slate-400 mb-3 leading-tight">Import shipments & foreign suppliers</p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Volume</span>
                  <span className="font-bold text-slate-800">25.0 KG</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 hover:border-emerald-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="mb-2">
                    <Building2 size={18} className="text-indigo-600 shrink-0" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs mb-1">Local Vendor</h4>
                  <p className="text-[11px] text-slate-400 mb-3 leading-tight">Domestic refinery & wholesale</p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Volume</span>
                  <span className="font-bold text-slate-800">35.0 KG</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 hover:border-emerald-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="mb-2">
                    <RotateCcw size={18} className="text-emerald-600 shrink-0" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs mb-1">Customer Buy-Back</h4>
                  <p className="text-[11px] text-slate-400 mb-3 leading-tight">Retail sell-back slots & bot orders</p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Volume</span>
                  <span className="font-bold text-slate-800">15.5 KG</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Column 2: Gold OUT — Selling */}
        <Card className="shadow-none p-6 border border-indigo-100 bg-gradient-to-br from-indigo-50/20 via-white to-white flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-indigo-100/60 mb-5 gap-2">
              <div className="flex items-center gap-3">
                <ArrowUpRight size={22} className="text-indigo-600 shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Gold OUT — Selling</h3>
                  <p className="text-xs text-slate-500 font-medium">One module, three channels</p>
                </div>
              </div>
              <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-3 py-1 rounded-full self-start sm:self-auto">
                Total Outflow: {totalSellKg.toFixed(1)} KG
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 hover:border-indigo-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="mb-2">
                    <Send size={18} className="text-sky-600 shrink-0" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs mb-1">Telegram BUY</h4>
                  <p className="text-[11px] text-slate-400 mb-3 leading-tight">Direct order placements via Bot</p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Volume</span>
                  <span className="font-bold text-slate-800">18.2 KG</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 hover:border-indigo-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="mb-2">
                    <PhoneCall size={18} className="text-purple-600 shrink-0" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs mb-1">Phone</h4>
                  <p className="text-[11px] text-slate-400 mb-3 leading-tight">Institutional & phone desk trading</p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Volume</span>
                  <span className="font-bold text-slate-800">12.0 KG</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 hover:border-indigo-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="mb-2">
                    <Store size={18} className="text-amber-600 shrink-0" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs mb-1">Walk-in</h4>
                  <p className="text-[11px] text-slate-400 mb-3 leading-tight">Counter physical retail sales</p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Volume</span>
                  <span className="font-bold text-slate-800">8.5 KG</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="shadow-none lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <BarChart3 size={16} className="text-indigo-500" /> Revenue
              Overview
            </h3>
            <select
              aria-label="Revenue range"
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
