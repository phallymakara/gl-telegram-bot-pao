import React from "react";
import { Package, ShoppingCart, Store, DollarSign, BarChart3, Settings as SettingsIcon, Clock, Send, PieChart, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import Card from "../components/Card";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import { salesData, revenueData } from "../data/mockData";

export default function DashboardPage() {
  const [actionType, setActionType] = React.useState<"Buy" | "Sell">("Buy");
  const [range, setRange] = React.useState("This Week");

  const buyData = {
    platform: [12.5, 18.3, 9.8, 13.0, 20.2, 14.5, 9.0],
    physical: [8.2, 10.0, 5.2, 7.4, 10.8, 7.6, 5.5],
  };

  const sellData = {
    platform: [4.2, 8.0, 6.5, 2.1, 9.8, 7.0, 3.5],
    physical: [10.8, 14.0, 8.5, 4.4, 12.2, 8.1, 5.0],
  };

  const chartData = actionType === "Buy" ? buyData : sellData;

  const dataSets: Record<string, { day: string; buy: number; sell: number }[]> = {
    "This Week": [
      { day: "Sun", buy: 9800, sell: 4200 },
      { day: "Mon", buy: 12400, sell: 8000 },
      { day: "Tue", buy: 19300, sell: 14500 },
      { day: "Wed", buy: 10200, sell: 5500 },
      { day: "Thu", buy: 13900, sell: 9200 },
      { day: "Fri", buy: 21200, sell: 16800 },
      { day: "Sat", buy: 15100, sell: 11000 },
    ],
    "Last Week": [
      { day: "Sun", buy: 8900, sell: 3900 },
      { day: "Mon", buy: 11200, sell: 7200 },
      { day: "Tue", buy: 17500, sell: 12100 },
      { day: "Wed", buy: 9800, sell: 5100 },
      { day: "Thu", buy: 12400, sell: 8600 },
      { day: "Fri", buy: 19800, sell: 15200 },
      { day: "Sat", buy: 14200, sell: 10500 },
    ],
    "This Month": [
      { day: "Week 1", buy: 54000, sell: 32000 },
      { day: "Week 2", buy: 62000, sell: 41000 },
      { day: "Week 3", buy: 59000, sell: 37000 },
      { day: "Week 4", buy: 68000, sell: 45000 },
    ],
    "Last Month": [
      { day: "Week 1", buy: 49000, sell: 28000 },
      { day: "Week 2", buy: 55000, sell: 36000 },
      { day: "Week 3", buy: 51000, sell: 33000 },
      { day: "Week 4", buy: 62000, sell: 39000 },
    ],
  };

  const activeData = dataSets[range] || dataSets["This Week"];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Package}
          label="Total Gold"
          value={<>39.60 <span className="text-sm font-normal text-slate-400">KG</span></>}
          sub="Available: 28.50 KG"
          tint="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={ArrowUpRight}
          label="Sold Today"
          value="20"
          sub="Today"
          tint="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={ArrowDownLeft}
          label="Buy Today"
          value="12"
          sub="Today"
          tint="bg-emerald-50 text-emerald-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <BarChart3 size={16} className="text-indigo-500" /> Revenue Overview ({range})
            </h3>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option>This Week</option>
              <option>Last Week</option>
              <option>This Month</option>
              <option>Last Month</option>
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
              <line key={i} x1="0" x2="700" y1={20 + i * 45} y2={20 + i * 45} stroke="#eef0f4" />
            ))}
            {(() => {
              const maxVal = Math.max(...activeData.map((d) => Math.max(d.buy, d.sell)), 1);
              const stepX = 700 / (activeData.length - 1);
              const ptsBuy = activeData.map((d, i) => [i * stepX, 200 - (d.buy / maxVal) * 180]);
              const ptsSell = activeData.map((d, i) => [i * stepX, 200 - (d.sell / maxVal) * 180]);

              const lineBuy = ptsBuy.map((p) => p.join(",")).join(" ");
              const lineSell = ptsSell.map((p) => p.join(",")).join(" ");

              const areaBuy = `0,200 ${lineBuy} 700,200`;
              const areaSell = `0,200 ${lineSell} 700,200`;
              return (
                <>
                  <polygon points={areaBuy} fill="url(#areaBuy)" />
                  <polygon points={areaSell} fill="url(#areaSell)" />
                  <polyline points={lineBuy} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points={lineSell} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {ptsBuy.map((p, i) => (
                    <circle key={`b-${i}`} cx={p[0]} cy={p[1]} r="4" fill="#4f46e5" stroke="#ffffff" strokeWidth="1" />
                  ))}
                  {ptsSell.map((p, i) => (
                    <circle key={`s-${i}`} cx={p[0]} cy={p[1]} r="4" fill="#f43f5e" stroke="#ffffff" strokeWidth="1" />
                  ))}
                </>
              );
            })()}
          </svg>
          <div className="flex justify-between text-xs text-slate-400 px-1 -mt-2">
            {activeData.map((d) => (
              <span key={d.day}>{d.day}</span>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-6 rounded bg-indigo-600 inline-block" /> Buy Revenue (USD)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-6 rounded bg-rose-500 inline-block" /> Sell Revenue (USD)
            </span>
          </div>
        </Card>

        <Card className="p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <PieChart size={16} className="text-indigo-500" /> Orders by Source
            </h3>
            <div className="relative flex items-center justify-center h-40">
              <svg width="130" height="130" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="45" fill="transparent" stroke="#f1f5f9" strokeWidth="10" />
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
                <text x="60" y="55" textAnchor="middle" dominantBaseline="middle" className="text-xl font-bold fill-slate-800">
                  32
                </text>
                <text x="60" y="72" textAnchor="middle" dominantBaseline="middle" className="text-[9px] fill-slate-400 font-semibold uppercase tracking-wider">
                  Total Today
                </text>
              </svg>
            </div>
          </div>
          <div className="space-y-2 mt-2">
            <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="h-2.5 w-2.5 rounded bg-indigo-600 inline-block" /> Platform
              </span>
              <span className="font-semibold text-slate-700">20 <span className="font-normal text-slate-400">(62.5%)</span></span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="h-2.5 w-2.5 rounded bg-emerald-500 inline-block" /> Physical
              </span>
              <span className="font-semibold text-slate-700">12 <span className="font-normal text-slate-400">(37.5%)</span></span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <BarChart3 size={16} className="text-indigo-500" /> Histogram Buy or Sell
            </h3>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value as "Buy" | "Sell")}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 bg-white focus:outline-none"
            >
              <option value="Buy">Buy Orders</option>
              <option value="Sell">Sell Orders</option>
            </select>
          </div>
          <svg viewBox="0 0 700 200" className="w-full h-52">
            {[0, 1, 2, 3, 4].map((i) => (
              <line key={i} x1="0" x2="700" y1={20 + i * 35} y2={20 + i * 35} stroke="#eef0f4" />
            ))}
            {(() => {
              const maxVal = Math.max(...chartData.platform, ...chartData.physical, 1);
              const scale = 140 / maxVal;
              return [0, 1, 2, 3, 4, 5, 6].map((i) => {
                const platformH = chartData.platform[i] * scale;
                const physicalH = chartData.physical[i] * scale;
                return (
                  <g key={i}>
                    {/* Platform bar */}
                    <rect
                      x={i * 100 + 32}
                      y={160 - platformH}
                      width="14"
                      height={platformH}
                      rx="3"
                      fill="#4f46e5"
                      className="transition-all duration-500 ease-out"
                    />
                    {/* Physical bar */}
                    <rect
                      x={i * 100 + 50}
                      y={160 - physicalH}
                      width="14"
                      height={physicalH}
                      rx="3"
                      fill="#10b981"
                      className="transition-all duration-500 ease-out"
                    />
                  </g>
                );
              });
            })()}
            <line x1="0" x2="700" y1="160" y2="160" stroke="#cbd5e1" strokeWidth="1" />
          </svg>
          <div className="grid grid-cols-7 text-center text-[11px] text-slate-400 font-semibold mt-2">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-slate-500 pl-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-5 rounded bg-indigo-600 inline-block" /> Platform {actionType} (KG)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-5 rounded bg-emerald-500 inline-block" /> Physical {actionType} (KG)
            </span>
          </div>
        </Card>

        <Card className="p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <SettingsIcon size={16} className="text-indigo-500" /> System Information
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
                <span className="font-semibold text-slate-700">09:30:45 AM</span>
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
