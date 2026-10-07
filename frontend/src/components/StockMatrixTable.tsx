import { useEffect, useState, useCallback, useRef } from "react";
import {
  Package,
  Truck,
  Repeat,
  Monitor,
  Laptop,
  TrendingUp,
  PieChart,
  FileText,
  ChevronDown,
  ArrowUp,
  RefreshCw,
} from "lucide-react";
import {
  dashboardApi,
  StockMatrixResponseData,
  StockMatrixColumnData,
  SoldTrendResponseData,
} from "../api/dashboard";

/**
 * Clean brand display name helper.
 */
function cleanBrand(brand: string): string {
  const cleaned = (brand || "").replace(/^[^a-zA-Z0-9]+/, "").trim();
  if (!cleaned) return brand;
  const lower = cleaned.toLowerCase();
  if (lower === "swiss") return "Swiss";
  if (lower === "db") return "DB";
  if (lower === "sv") return "SV";
  return cleaned;
}

/**
 * Main Inventory Dashboard:
 * - Realtime database data fetching (polled every 2s + window focus)
 * - Read-only display cells (no clicking, selection outline, or editing)
 * - 7 Columns (Swiss 6-Oct, 7-Oct, 8-Oct | DB 6-Oct, 7-Oct, 8-Oct | SV 6-Oct)
 * - 5 Rows (Available Stock, Import Stock, Trade In, Physical Sale, Bot Sale)
 * - 3 Dynamic Bottom Cards:
 *    1) Total Sold Trend (with working range selector & date range picker)
 *    2) Stock Distribution
 *    3) Quick Summary
 */
export default function StockMatrixTable() {
  const [data, setData] = useState<StockMatrixResponseData | null>(null);
  const [columns, setColumns] = useState<StockMatrixColumnData[]>([]);

  // Total Sold Trend range states
  const [trendRangeType, setTrendRangeType] = useState<"7d" | "14d" | "30d" | "month" | "custom">("7d");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [tempStartDate, setTempStartDate] = useState<string>("");
  const [tempEndDate, setTempEndDate] = useState<string>("");
  const [isTrendMenuOpen, setIsTrendMenuOpen] = useState<boolean>(false);
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState<boolean>(false);
  const [soldTrend, setSoldTrend] = useState<SoldTrendResponseData | null>(null);
  const trendMenuRef = useRef<HTMLDivElement>(null);

  // Timezone-safe date parser
  const parseLocalDate = (dStr: string): Date => {
    if (dStr && dStr.includes("-")) {
      const parts = dStr.split("-").map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
    }
    if (dStr && dStr.includes("/")) {
      const parts = dStr.split("/").map(Number);
      const day = parts[0];
      const month = parts[1] - 1;
      const year = new Date().getFullYear();
      return new Date(year, month, day, 0, 0, 0, 0);
    }
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  };

  // Sort columns canonically: Swiss -> DB -> SV, and target_date ascending
  const sortColumnsChronologically = useCallback(
    (cols: StockMatrixColumnData[]): StockMatrixColumnData[] => {
      const getBrandPriority = (brand: string) => {
        const b = (brand || "").toLowerCase();
        if (b.includes("swiss")) return 0;
        if (b.includes("db")) return 1;
        if (b.includes("sv")) return 2;
        return 99;
      };

      const sorted = [...cols].sort((a, b) => {
        const aPri = getBrandPriority(a.brand);
        const bPri = getBrandPriority(b.brand);
        if (aPri !== bPri) return aPri - bPri;
        if (a.brand.toLowerCase() !== b.brand.toLowerCase()) {
          return a.brand.localeCompare(b.brand);
        }
        return (a.target_date || "").localeCompare(b.target_date || "");
      });

      const seen = new Set<string>();
      return sorted.filter((col) => {
        const key = `${col.brand.toLowerCase()}_${col.target_date || col.date_label}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    []
  );

  // Realtime matrix data fetcher
  const loadData = useCallback(() => {
    dashboardApi
      .getStockMatrix()
      .then((res) => {
        setData(res);
        setColumns(sortColumnsChronologically(res.columns));
      })
      .catch((err) => console.error("Failed to load stock matrix", err));
  }, [sortColumnsChronologically]);

  // Realtime sold trend data fetcher
  const loadTrendData = useCallback(() => {
    dashboardApi
      .getSoldTrend({
        range_type: trendRangeType,
        start_date: trendRangeType === "custom" ? customStartDate : undefined,
        end_date: trendRangeType === "custom" ? customEndDate : undefined,
      })
      .then((res) => {
        setSoldTrend(res);
      })
      .catch((err) => console.error("Failed to load sold trend", err));
  }, [trendRangeType, customStartDate, customEndDate]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    const handleFocus = () => loadData();
    window.addEventListener("focus", handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadData]);

  useEffect(() => {
    loadTrendData();
    const interval = setInterval(loadTrendData, 2000);
    const handleFocus = () => loadTrendData();
    window.addEventListener("focus", handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadTrendData]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (trendMenuRef.current && !trendMenuRef.current.contains(event.target as Node)) {
        setIsTrendMenuOpen(false);
        setIsCustomPickerOpen(false);
      }
    }
    if (isTrendMenuOpen || isCustomPickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isTrendMenuOpen, isCustomPickerOpen]);

  // Read cell value directly from realtime column data
  const getCellValue = (
    col: StockMatrixColumnData,
    rowKey: "available" | "import" | "trade_in" | "physical" | "bot"
  ): number => {
    switch (rowKey) {
      case "available":
        return col.available_stock ?? 0;
      case "import":
        return col.import_stock ?? 0;
      case "trade_in":
        return col.trade_in ?? 0;
      case "physical":
        return col.physical_sale ?? 0;
      case "bot":
        return col.bot_sale ?? 0;
      default:
        return 0;
    }
  };

  // Format header date label to D-MMM (e.g. 6-Oct)
  const formatHeaderDate = (label: string, targetDate?: string) => {
    if (label && label.includes("-") && isNaN(Number(label.split("-")[1]))) {
      return label;
    }
    if (targetDate) {
      const d = parseLocalDate(targetDate);
      const mStr = d.toLocaleString("en-US", { month: "short" });
      return `${d.getDate()}-${mStr}`;
    }
    return label;
  };

  // Format trend chart date label to MMM D (e.g. Oct 6)
  const formatTrendDateLabel = (dateStr: string): string => {
    if (dateStr && dateStr.includes("-") && dateStr.length >= 10) {
      const d = parseLocalDate(dateStr);
      return `${d.toLocaleString("en-US", { month: "short" })} ${d.getDate()}`;
    }
    return dateStr;
  };

  const getTrendButtonLabel = () => {
    if (trendRangeType === "7d") return "Last 7 days";
    if (trendRangeType === "14d") return "Last 14 days";
    if (trendRangeType === "30d") return "Last 30 days";
    if (trendRangeType === "month") return "This Month";
    if (trendRangeType === "custom" && soldTrend) {
      const s = formatTrendDateLabel(soldTrend.start_date);
      const e = formatTrendDateLabel(soldTrend.end_date);
      return `${s} - ${e}`;
    }
    return "Last 7 days";
  };

  if (!data || columns.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 flex items-center justify-center text-slate-400">
        <RefreshCw size={22} className="animate-spin mr-2.5 text-indigo-600" />
        <span className="text-sm font-semibold text-slate-600">Loading Dashboard...</span>
      </div>
    );
  }

  // Row configurations
  const rowsConfig: {
    key: "available" | "import" | "trade_in" | "physical" | "bot";
    title: string;
    subtitle: string;
    headerBg: string;
    cellBg: string;
    badgeBg: string;
    icon: React.ReactNode;
  }[] = [
      {
        key: "available",
        title: "Available Stock",
        subtitle: "Ready to sell",
        headerBg: "bg-[#ecfdf5]",
        cellBg: "bg-[#f0fdf4]",
        badgeBg: "bg-[#10b981]",
        icon: <Package size={20} className="stroke-[2.2]" />,
      },
      {
        key: "import",
        title: "Import Stock",
        subtitle: "Incoming goods",
        headerBg: "bg-[#eff6ff]",
        cellBg: "bg-[#eff6ff]",
        badgeBg: "bg-[#3b82f6]",
        icon: <Truck size={20} className="stroke-[2.2]" />,
      },
      {
        key: "trade_in",
        title: "Trade In",
        subtitle: "Exchange value",
        headerBg: "bg-[#ecfeff]",
        cellBg: "bg-[#ecfeff]",
        badgeBg: "bg-[#06b6d4]",
        icon: <Repeat size={20} className="stroke-[2.2]" />,
      },
      {
        key: "physical",
        title: "Physical Sale",
        subtitle: "In-store sales",
        headerBg: "bg-[#f0f9ff]",
        cellBg: "bg-[#f0f9ff]",
        badgeBg: "bg-[#0284c7]",
        icon: <Monitor size={20} className="stroke-[2.2]" />,
      },
      {
        key: "bot",
        title: "Bot Sale",
        subtitle: "Online / Bot sales",
        headerBg: "bg-[#f0f9ff]",
        cellBg: "bg-[#f0f9ff]",
        badgeBg: "bg-[#0284c7]",
        icon: <Laptop size={20} className="stroke-[2.2]" />,
      },
    ];

  // --- Dynamic calculations for bottom cards ---

  // 1. Total Sold Trend calculations from live API
  const trendPoints = soldTrend?.points || [];
  const allSoldValues: number[] = [];
  trendPoints.forEach((p) => {
    allSoldValues.push(p.swiss, p.db, p.sv);
  });
  const maxSoldVal = Math.max(0, ...allSoldValues);

  let yMax = 500;
  if (maxSoldVal > 1500) yMax = Math.max(2000, Math.ceil(maxSoldVal / 500) * 500);
  else if (maxSoldVal > 1000) yMax = 1500;
  else if (maxSoldVal > 500) yMax = 1000;
  else if (maxSoldVal > 0) yMax = 500;

  const getYCoord = (val: number) => {
    return 130 - (yMax > 0 ? (val / yMax) * 110 : 0);
  };
  const getXCoord = (index: number) => {
    if (trendPoints.length <= 1) return 175;
    return 60 + (index / (trendPoints.length - 1)) * 230;
  };

  const swissTrendPoints = trendPoints.map((p, i) => ({
    x: getXCoord(i),
    y: getYCoord(p.swiss),
    val: p.swiss,
    label: p.date_label,
  }));
  const dbTrendPoints = trendPoints.map((p, i) => ({
    x: getXCoord(i),
    y: getYCoord(p.db),
    val: p.db,
    label: p.date_label,
  }));
  const svTrendPoints = trendPoints.map((p, i) => ({
    x: getXCoord(i),
    y: getYCoord(p.sv),
    val: p.sv,
    label: p.date_label,
  }));

  // Clean, non-overlapping X-axis label decimation
  const shouldShowXLabel = (index: number, total: number) => {
    if (total <= 7) return true;
    const step = Math.ceil((total - 1) / 4);
    return index % step === 0 || index === total - 1;
  };

  // 2. Stock Distribution calculations
  const swissStock = columns
    .filter((c) => c.brand.toLowerCase().includes("swiss"))
    .reduce((acc, c) => acc + (c.available_stock || 0), 0);
  const dbStock = columns
    .filter((c) => c.brand.toLowerCase().includes("db"))
    .reduce((acc, c) => acc + (c.available_stock || 0), 0);
  const svStock = columns
    .filter((c) => c.brand.toLowerCase().includes("sv"))
    .reduce((acc, c) => acc + (c.available_stock || 0), 0);
  const totalStock = swissStock + dbStock + svStock;

  const swissPct = totalStock > 0 ? Math.round((swissStock / totalStock) * 100) : 0;
  const dbPct = totalStock > 0 ? Math.round((dbStock / totalStock) * 100) : 0;
  const svPct = totalStock > 0 ? Math.max(0, 100 - swissPct - dbPct) : 0;
  const donutCircumference = 238.76;

  // 3. Quick Summary calculations
  const highestAvailCol = columns.reduce<StockMatrixColumnData | null>(
    (max, c) => (!max || (c.available_stock || 0) > (max.available_stock || 0) ? c : max),
    null
  );
  const highestPhysicalCol = columns.reduce<StockMatrixColumnData | null>(
    (max, c) =>
      !max || Math.abs(c.physical_sale || 0) > Math.abs(max.physical_sale || 0) ? c : max,
    null
  );
  const highestBotCol = columns.reduce<StockMatrixColumnData | null>(
    (max, c) =>
      !max || Math.abs(c.bot_sale || 0) > Math.abs(max.bot_sale || 0) ? c : max,
    null
  );
  const highestTradeCol = columns.reduce<StockMatrixColumnData | null>(
    (max, c) => (!max || (c.trade_in || 0) > (max.trade_in || 0) ? c : max),
    null
  );

  const formatSummaryItem = (col: StockMatrixColumnData | null, val: number) => {
    if (!col || val <= 0) return "-";
    return `${cleanBrand(col.brand)} (${Math.round(val).toLocaleString()})`;
  };

  return (
    <div className="p-4 sm:p-5 bg-white min-h-screen space-y-3 font-sans">
      {/* 1. TOP MATRIX TABLE WITH INDIVIDUAL GAPS AND READ-ONLY CELLS */}
      <div className="w-full overflow-x-auto pb-1">
        <div className="min-w-[960px] space-y-1.5">
          {/* MERGED COLUMN HEADERS (BRAND + DATE MERGED VERTICALLY) */}
          <div className="grid grid-cols-[200px_repeat(7,1fr)] gap-1.5 items-center">
            {/* Empty space above row titles matching height */}
            <div className="h-[70px]" />

            {/* Vertically merged Brand & Date header cards for each column */}
            {columns.map((col) => {
              const bLower = col.brand.toLowerCase();
              let brandBg = "bg-[#fde047] text-slate-900";

              if (bLower.includes("db")) {
                brandBg = "bg-[#fed7aa] text-slate-900";
              } else if (bLower.includes("sv")) {
                brandBg = "bg-[#e9d5ff] text-slate-900";
              }

              return (
                <div
                  key={`header_${col.id}`}
                  className="h-[70px] rounded-md overflow-hidden bg-white border border-[#e2e8f0] flex flex-col justify-between shadow-none select-none"
                >
                  {/* Top half: Brand */}
                  <div
                    className={`h-[35px] w-full flex items-center justify-center text-xs font-bold tracking-wide ${brandBg}`}
                  >
                    <span>{cleanBrand(col.brand)}</span>
                  </div>

                  {/* Bottom half: Date */}
                  <div className="h-[35px] w-full bg-white flex items-center justify-center text-xs font-semibold text-slate-700">
                    {formatHeaderDate(col.date_label, col.target_date)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 5 DATA ROWS (EACH CELL IS READ-ONLY AND NON-CLICKABLE) */}
          {rowsConfig.map((row) => (
            <div key={row.key} className="grid grid-cols-[200px_repeat(7,1fr)] gap-1.5 items-center">
              {/* Row Title Card */}
              <div className={`h-[70px] rounded-md ${row.headerBg} px-3 flex items-center gap-2.5 select-none`}>
                <div className={`w-9 h-9 rounded-md ${row.badgeBg} text-white flex items-center justify-center shrink-0`}>
                  {row.icon}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 leading-tight">{row.title}</div>
                  <div className="text-[11px] text-slate-500 font-medium">{row.subtitle}</div>
                </div>
              </div>

              {/* 7 Read-only Value Cells */}
              {columns.map((col) => {
                const val = getCellValue(col, row.key);
                const isRed = row.key === "physical" || row.key === "bot";

                return (
                  <div
                    key={`cell_${row.key}_${col.id}`}
                    className={`h-[70px] rounded-md ${row.cellBg} flex flex-col items-center justify-center select-none cursor-default`}
                  >
                    <div
                      className={`text-[15px] sm:text-base font-semibold tracking-tight leading-none ${isRed ? "text-[#ef4444]" : "text-slate-900"
                        }`}
                    >
                      {val < 0 ? `-${Math.abs(val).toLocaleString()}` : val.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 2. BOTTOM 3 KPI CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 pt-1">
        {/* CARD 1: TOTAL SOLD TREND WITH WORKING RANGE PICKER */}
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5 relative">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[#3b82f6] text-white flex items-center justify-center shrink-0">
                  <TrendingUp size={16} />
                </div>
                <h3 className="text-base font-bold text-[#0f172a]">Total Sold Trend</h3>
              </div>

              {/* Range Selector & Date Range Picker Dropdowns */}
              <div className="relative" ref={trendMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    if (isCustomPickerOpen) {
                      setIsCustomPickerOpen(false);
                      setIsTrendMenuOpen(false);
                      return;
                    }
                    if (!isTrendMenuOpen) {
                      setTempStartDate(customStartDate || soldTrend?.start_date || "");
                      setTempEndDate(customEndDate || soldTrend?.end_date || "");
                    }
                    setIsTrendMenuOpen(!isTrendMenuOpen);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition shadow-none cursor-pointer"
                >
                  <span>{getTrendButtonLabel()}</span>
                  <ChevronDown
                    size={14}
                    className={`text-slate-400 transition-transform ${isTrendMenuOpen || isCustomPickerOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* 1. Presets Dropdown Menu */}
                {isTrendMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-md py-1 w-44 shadow-none">
                    {[
                      { key: "7d", label: "Last 7 days" },
                      { key: "14d", label: "Last 14 days" },
                      { key: "30d", label: "Last 30 days" },
                      { key: "month", label: "This Month" },
                    ].map((preset) => (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => {
                          setTrendRangeType(preset.key as "7d" | "14d" | "30d" | "month");
                          setIsTrendMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs transition ${trendRangeType === preset.key
                            ? "font-bold text-indigo-600 bg-indigo-50/50"
                            : "text-slate-700 hover:bg-slate-50"
                          }`}
                      >
                        {preset.label}
                      </button>
                    ))}

                    <div className="border-t border-slate-100 my-1" />

                    {/* Custom Date button */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsTrendMenuOpen(false);
                        setIsCustomPickerOpen(true);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition ${trendRangeType === "custom"
                          ? "font-bold text-indigo-600 bg-indigo-50/50"
                          : "text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      Custom Date
                    </button>
                  </div>
                )}

                {/* 2. New Dedicated Date Range Popup (Separate popup, does not extend from the preset menu) */}
                {isCustomPickerOpen && (
                  <div className="absolute right-0 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-lg p-3 w-64 shadow-none space-y-2.5">
                    <div className="text-xs font-bold text-slate-800">Select Date Range</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={tempStartDate}
                          onChange={(e) => setTempStartDate(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">End Date</label>
                        <input
                          type="date"
                          value={tempEndDate}
                          onChange={(e) => setTempEndDate(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsCustomPickerOpen(false)}
                        className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-50 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!tempStartDate || !tempEndDate}
                        onClick={() => {
                          if (tempStartDate && tempEndDate) {
                            setCustomStartDate(tempStartDate);
                            setCustomEndDate(tempEndDate);
                            setTrendRangeType("custom");
                            setIsCustomPickerOpen(false);
                          }
                        }}
                        className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Line Chart */}
            <div className="h-44 w-full relative pt-2">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 320 140">
                {/* Horizontal grid lines */}
                <line x1="38" y1="20" x2="310" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="38" y1="50" x2="310" y2="50" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="38" y1="80" x2="310" y2="80" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="38" y1="110" x2="310" y2="110" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />

                {/* Y-axis labels */}
                <text x="5" y="24" fill="#94a3b8" fontSize="9" fontWeight="700">
                  {yMax.toLocaleString()}
                </text>
                <text x="5" y="54" fill="#94a3b8" fontSize="9" fontWeight="700">
                  {Math.round(yMax * 0.75).toLocaleString()}
                </text>
                <text x="5" y="84" fill="#94a3b8" fontSize="9" fontWeight="700">
                  {Math.round(yMax * 0.5).toLocaleString()}
                </text>
                <text x="14" y="114" fill="#94a3b8" fontSize="9" fontWeight="700">
                  {Math.round(yMax * 0.25).toLocaleString()}
                </text>
                <text x="25" y="138" fill="#94a3b8" fontSize="9" fontWeight="700">
                  0
                </text>

                {/* Trend Lines */}
                {/* 1. Swiss (Yellow) */}
                {swissTrendPoints.length > 0 && (
                  <>
                    <polyline
                      fill="none"
                      stroke="#facc15"
                      strokeWidth="2.5"
                      points={swissTrendPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                    />
                    {swissTrendPoints.map((p, idx) => (
                      <circle key={`sw_pt_${idx}`} cx={p.x} cy={p.y} r="3.5" fill="#facc15">
                        <title>{`${p.label} - Swiss: ${p.val} kg`}</title>
                      </circle>
                    ))}
                  </>
                )}

                {/* 2. DB (Orange) */}
                {dbTrendPoints.length > 0 && (
                  <>
                    <polyline
                      fill="none"
                      stroke="#fb923c"
                      strokeWidth="2.5"
                      points={dbTrendPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                    />
                    {dbTrendPoints.map((p, idx) => (
                      <circle key={`db_pt_${idx}`} cx={p.x} cy={p.y} r="3.5" fill="#fb923c">
                        <title>{`${p.label} - DB: ${p.val} kg`}</title>
                      </circle>
                    ))}
                  </>
                )}

                {/* 3. SV (Purple) */}
                {svTrendPoints.length > 0 && (
                  <>
                    <polyline
                      fill="none"
                      stroke="#c084fc"
                      strokeWidth="2.5"
                      points={svTrendPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                    />
                    {svTrendPoints.map((p, idx) => (
                      <circle key={`sv_pt_${idx}`} cx={p.x} cy={p.y} r="3.5" fill="#c084fc">
                        <title>{`${p.label} - SV: ${p.val} kg`}</title>
                      </circle>
                    ))}
                  </>
                )}

                {/* X-axis labels */}
                {trendPoints.map((d, idx) => {
                  if (!shouldShowXLabel(idx, trendPoints.length)) return null;
                  return (
                    <text
                      key={`x_lbl_${idx}`}
                      x={getXCoord(idx)}
                      y="136"
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="9"
                      fontWeight="600"
                    >
                      {d.date_label}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 pt-3 border-t border-slate-100 text-xs font-bold text-slate-700">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <span>Swiss</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
              <span>DB</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              <span>SV</span>
            </div>
          </div>
        </div>

        {/* CARD 2: STOCK DISTRIBUTION */}
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3.5">
              <div className="w-7 h-7 rounded-md bg-[#3b82f6] text-white flex items-center justify-center shrink-0">
                <PieChart size={16} />
              </div>
              <h3 className="text-base font-bold text-[#0f172a]">Stock Distribution</h3>
            </div>

            {/* Donut Chart & Legend Side-by-Side */}
            <div className="flex items-center justify-around py-2">
              {/* Donut Circle */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background track if total is 0 */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth="15"
                  />

                  {totalStock > 0 && (
                    <>
                      {/* Swiss Segment */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#facc15"
                        strokeWidth="15"
                        strokeDasharray={donutCircumference}
                        strokeDashoffset={donutCircumference * (1 - swissPct / 100)}
                      />
                      {/* DB Segment */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#fb923c"
                        strokeWidth="15"
                        strokeDasharray={donutCircumference}
                        strokeDashoffset={donutCircumference * (1 - dbPct / 100)}
                        style={{
                          transform: `rotate(${(swissPct / 100) * 360}deg)`,
                          transformOrigin: "50% 50%",
                        }}
                      />
                      {/* SV Segment */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#c084fc"
                        strokeWidth="15"
                        strokeDasharray={donutCircumference}
                        strokeDashoffset={donutCircumference * (1 - svPct / 100)}
                        style={{
                          transform: `rotate(${((swissPct + dbPct) / 100) * 360}deg)`,
                          transformOrigin: "50% 50%",
                        }}
                      />
                    </>
                  )}
                </svg>

                {/* Donut Center Totals */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Total Stock
                  </span>
                  <span className="text-lg font-semibold text-slate-700 leading-tight mt-0.5">
                    {totalStock.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-3 pl-2">
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                  <span className="w-3.5 h-3.5 rounded bg-yellow-400 shrink-0" />
                  <span className="w-12">Swiss</span>
                  <span className="text-slate-500 font-semibold">{swissPct}%</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                  <span className="w-3.5 h-3.5 rounded bg-orange-400 shrink-0" />
                  <span className="w-12">DB</span>
                  <span className="text-slate-500 font-semibold">{dbPct}%</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                  <span className="w-3.5 h-3.5 rounded bg-purple-400 shrink-0" />
                  <span className="w-12">SV</span>
                  <span className="text-slate-500 font-semibold">{svPct}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: QUICK SUMMARY */}
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-[#3b82f6] text-white flex items-center justify-center shrink-0">
                <FileText size={16} />
              </div>
              <h3 className="text-base font-bold text-[#0f172a]">Quick Summary</h3>
            </div>

            <div className="space-y-2.5">
              {/* Item 1: Highest Available Stock */}
              <div className="flex items-center justify-between p-1.5 rounded-md hover:bg-slate-50 transition">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#10b981] text-white flex items-center justify-center shrink-0">
                    <Package size={13} />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">Highest Available Stock</span>
                </div>
                <div className="flex items-center gap-1 font-bold text-xs text-slate-900">
                  <span>{formatSummaryItem(highestAvailCol, highestAvailCol?.available_stock || 0)}</span>
                  <ArrowUp size={13} className="text-emerald-500 stroke-[3]" />
                </div>
              </div>

              {/* Item 2: Highest Physical Sale */}
              <div className="flex items-center justify-between p-1.5 rounded-md hover:bg-slate-50 transition">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#0284c7] text-white flex items-center justify-center shrink-0">
                    <Monitor size={13} />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">Highest Physical Sale</span>
                </div>
                <div className="flex items-center gap-1 font-bold text-xs text-slate-900">
                  <span>
                    {formatSummaryItem(
                      highestPhysicalCol,
                      Math.abs(highestPhysicalCol?.physical_sale || 0)
                    )}
                  </span>
                  <ArrowUp size={13} className="text-emerald-500 stroke-[3]" />
                </div>
              </div>

              {/* Item 3: Highest Bot Sale */}
              <div className="flex items-center justify-between p-1.5 rounded-md hover:bg-slate-50 transition">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#0284c7] text-white flex items-center justify-center shrink-0">
                    <Laptop size={13} />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">Highest Bot Sale</span>
                </div>
                <div className="flex items-center gap-1 font-bold text-xs text-slate-900">
                  <span>
                    {formatSummaryItem(
                      highestBotCol,
                      Math.abs(highestBotCol?.bot_sale || 0)
                    )}
                  </span>
                  <ArrowUp size={13} className="text-emerald-500 stroke-[3]" />
                </div>
              </div>

              {/* Item 4: Highest Trade In */}
              <div className="flex items-center justify-between p-1.5 rounded-md hover:bg-slate-50 transition">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#06b6d4] text-white flex items-center justify-center shrink-0">
                    <Repeat size={13} />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">Highest Trade In</span>
                </div>
                <div className="flex items-center gap-1 font-bold text-xs text-slate-900">
                  <span>{formatSummaryItem(highestTradeCol, highestTradeCol?.trade_in || 0)}</span>
                  <ArrowUp size={13} className="text-emerald-500 stroke-[3]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
