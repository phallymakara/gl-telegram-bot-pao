import React, { useEffect, useState, useCallback } from "react";
import {
  Package,
  Truck,
  Monitor,
  Laptop,
} from "lucide-react";
import Loader from "./Loader";
import {
  dashboardApi,
  StockMatrixResponseData,
  StockMatrixColumnData,
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
 * Get background color class for each brand to maintain consistent color identity.
 * Swiss -> Yellow (#fde047)
 * DB    -> Orange/Peach (#fed7aa)
 * SV    -> Lavender/Purple (#e9d5ff)
 */
function getBrandBgClass(brand: string): string {
  const lower = (brand || "").toLowerCase();
  if (lower.includes("db")) return "bg-[#fed7aa]";
  if (lower.includes("sv")) return "bg-[#e9d5ff]";
  return "bg-[#fde047]";
}

/**
 * Main Inventory Dashboard Matrix:
 * - Realtime database data fetching (polled every 2s + window focus)
 * - Read-only display cells
 * - Brand & Settlement Date Columns
 * - Operational Data Rows (Available Stock, Import Stock, Physical Sell, Bot Sell, Physical Buy, Bot Buy)
 * - Calculated Total Row below combining two columns into one
 */
export default function StockMatrixTable() {
  const [data, setData] = useState<StockMatrixResponseData | null>(null);
  const [columns, setColumns] = useState<StockMatrixColumnData[]>([]);

  // Get local ISO date string (YYYY-MM-DD)
  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const todayStr = getTodayStr();

  // Flexible, timezone-safe date parser supporting ISO, D-MMM, DD/MM, and DD/MM/YYYY
  const parseLocalDate = (dStr: string): Date => {
    if (!dStr) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return now;
    }

    const clean = dStr.trim();

    // 1. ISO format: "2026-10-16" or "2026-10-16T..."
    const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]), 0, 0, 0, 0);
    }

    // 2. Dash format with month name: "16-Oct", "16-Oct-2026", "6-Oct"
    const dMmmMatch = clean.match(/^(\d{1,2})-([A-Za-z]{3,})(?:-(\d{2,4}))?/);
    if (dMmmMatch) {
      const day = Number(dMmmMatch[1]);
      const monthStr = dMmmMatch[2].toLowerCase();
      const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const monthIdx = months.findIndex((m) => monthStr.startsWith(m));
      const month = monthIdx >= 0 ? monthIdx : 0;
      let year = dMmmMatch[3] ? Number(dMmmMatch[3]) : new Date().getFullYear();
      if (year < 100) year += 2000;
      return new Date(year, month, day, 0, 0, 0, 0);
    }

    // 3. Slash format: "16/10" or "16/10/2026"
    const slashMatch = clean.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (slashMatch) {
      const day = Number(slashMatch[1]);
      const month = Number(slashMatch[2]) - 1;
      let year = slashMatch[3] ? Number(slashMatch[3]) : new Date().getFullYear();
      if (year < 100) year += 2000;
      return new Date(year, month, day, 0, 0, 0, 0);
    }

    // 4. Native parse fallback
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      parsed.setHours(0, 0, 0, 0);
      return parsed;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  };

  // Sort columns canonically: Swiss -> DB -> SV, validate date and exclude back dates
  const sortColumnsChronologically = useCallback(
    (cols: StockMatrixColumnData[], anchorDateStr?: string): StockMatrixColumnData[] => {
      const getBrandPriority = (brand: string) => {
        const b = (brand || "").toLowerCase();
        if (b.includes("swiss")) return 0;
        if (b.includes("db")) return 1;
        if (b.includes("sv")) return 2;
        return 99;
      };

      // Exclude back dates (dates strictly before anchor date, which defaults to today)
      const anchorDate = anchorDateStr ? parseLocalDate(anchorDateStr) : new Date();
      anchorDate.setHours(0, 0, 0, 0);

      const validCols = cols.filter((col) => {
        if (!col.target_date) return true;
        const colDate = parseLocalDate(col.target_date);
        return colDate >= anchorDate;
      });

      const sorted = [...validCols].sort((a, b) => {
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

  // Realtime matrix data fetcher checking current date and next date
  const loadData = useCallback(() => {
    dashboardApi
      .getStockMatrix(todayStr)
      .then((res) => {
        setData(res);
        setColumns(sortColumnsChronologically(res.columns, todayStr));
      })
      .catch((err) => console.error("Failed to load stock matrix", err));
  }, [sortColumnsChronologically, todayStr]);

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

  // Read cell value directly from realtime column data
  const getCellValue = (
    col: StockMatrixColumnData,
    rowKey: "available" | "import" | "physical_sell" | "bot_sell" | "physical_buy" | "bot_buy"
  ): number => {
    switch (rowKey) {
      case "available":
        return col.available_stock ?? 0;
      case "import":
        return col.import_stock ?? 0;
      case "physical_sell":
        return col.physical_sale ?? 0;
      case "bot_sell":
        return col.bot_sale ?? 0;
      case "physical_buy":
        return col.physical_buy ?? 0;
      case "bot_buy":
        return col.bot_buy ?? 0;
      default:
        return 0;
    }
  };

  // Format header date label to D-MMM flexibly
  const formatHeaderDate = (label: string, targetDate?: string) => {
    if (targetDate) {
      const d = parseLocalDate(targetDate);
      const mStr = d.toLocaleString("en-US", { month: "short" });
      return `${d.getDate()}-${mStr}`;
    }
    if (label) {
      const d = parseLocalDate(label);
      const mStr = d.toLocaleString("en-US", { month: "short" });
      return `${d.getDate()}-${mStr}`;
    }
    return label;
  };

  if (!data || columns.length === 0) {
    return (
      <div className="flex-1 w-full h-full min-h-[500px] flex items-center justify-center">
        <Loader size="md" text="Loading Dashboard..." />
      </div>
    );
  }

  // Base 6 Row configurations
  const rowsConfig: {
    key: "available" | "import" | "physical_sell" | "bot_sell" | "physical_buy" | "bot_buy";
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
      icon: <Package size={16} className="stroke-[2.2]" />,
    },
    {
      key: "import",
      title: "Import Stock",
      subtitle: "Incoming goods",
      headerBg: "bg-[#eff6ff]",
      cellBg: "bg-[#eff6ff]",
      badgeBg: "bg-[#3b82f6]",
      icon: <Truck size={16} className="stroke-[2.2]" />,
    },
    {
      key: "physical_sell",
      title: "Physical Sell",
      subtitle: "In-store sell",
      headerBg: "bg-[#f0f9ff]",
      cellBg: "bg-[#f0f9ff]",
      badgeBg: "bg-[#0284c7]",
      icon: <Monitor size={16} className="stroke-[2.2]" />,
    },
    {
      key: "bot_sell",
      title: "Bot Sell",
      subtitle: "Online / Bot sell",
      headerBg: "bg-[#f0f9ff]",
      cellBg: "bg-[#f0f9ff]",
      badgeBg: "bg-[#0284c7]",
      icon: <Laptop size={16} className="stroke-[2.2]" />,
    },
    {
      key: "physical_buy",
      title: "Physical Buy",
      subtitle: "In-store buy",
      headerBg: "bg-[#ecfeff]",
      cellBg: "bg-[#ecfeff]",
      badgeBg: "bg-[#06b6d4]",
      icon: <Monitor size={16} className="stroke-[2.2]" />,
    },
    {
      key: "bot_buy",
      title: "Bot Buy",
      subtitle: "Online / Bot buy",
      headerBg: "bg-[#ecfeff]",
      cellBg: "bg-[#ecfeff]",
      badgeBg: "bg-[#06b6d4]",
      icon: <Laptop size={16} className="stroke-[2.2]" />,
    },
  ];

  // Build 2-column paired totals dynamically using each brand's own color
  const columnPairs: {
    label: string;
    cols: StockMatrixColumnData[];
    span: number;
    headerBg: string;
    cellBg: string;
    value: number;
  }[] = [];

  for (let i = 0; i < columns.length; i += 2) {
    const colA = columns[i];
    const colB = columns[i + 1];
    const brandColor = getBrandBgClass(colA.brand);

    if (colB) {
      const dA = parseLocalDate(colA.target_date || colA.date_label);
      const dB = parseLocalDate(colB.target_date || colB.date_label);
      const dayA = String(dA.getDate()).padStart(2, "0");
      const dayB = String(dB.getDate()).padStart(2, "0");
      const monthA = String(dA.getMonth() + 1).padStart(2, "0");
      const monthB = String(dB.getMonth() + 1).padStart(2, "0");
      const yearA = dA.getFullYear();
      const yearB = dB.getFullYear();

      let rangeLabel = "";
      if (yearA !== yearB) {
        rangeLabel = `${dayA}/${monthA}/${String(yearA).slice(-2)}-${dayB}/${monthB}/${String(yearB).slice(-2)}`;
      } else if (monthA !== monthB) {
        rangeLabel = `${dayA}/${monthA}-${dayB}/${monthB}`;
      } else if (dayA !== dayB) {
        rangeLabel = `${dayA}-${dayB}/${monthA}`;
      } else {
        rangeLabel = `${dayA}/${monthA}`;
      }

      const totalVal = (colA.available_stock || 0) + (colB.available_stock || 0);

      columnPairs.push({
        label: `Total ${rangeLabel}`,
        cols: [colA, colB],
        span: 2,
        headerBg: brandColor,
        cellBg: brandColor,
        value: totalVal,
      });
    } else {
      const dA = parseLocalDate(colA.target_date || colA.date_label);
      const dayA = String(dA.getDate()).padStart(2, "0");
      const monthA = String(dA.getMonth() + 1).padStart(2, "0");

      columnPairs.push({
        label: `Total ${dayA}/${monthA}`,
        cols: [colA],
        span: 1,
        headerBg: brandColor,
        cellBg: brandColor,
        value: colA.available_stock || 0,
      });
    }
  }

  const grandTotalAllStock =
    typeof data?.total_all_stock === "number"
      ? data.total_all_stock
      : columns.reduce((acc, col) => acc + (col.available_stock || 0), 0);

  // Use backend computed pair_totals (total_both_date = first_date + second_date)
  const pairTotalsToRender =
    data?.pair_totals && data.pair_totals.length > 0
      ? data.pair_totals.map((pt) => {
          const brandColor = getBrandBgClass(pt.brand);
          return {
            label: pt.label,
            span: pt.span || 2,
            headerBg: brandColor,
            cellBg: brandColor,
            value: pt.total_both_date,
          };
        })
      : columnPairs;

  return (
    <div className="w-full flex-1 py-3 px-3.5 sm:px-5 bg-white font-sans min-w-0">
      {/* MATRIX TABLE WITH DYNAMIC RESPONSIVE FULL-WIDTH GRID */}
      <div className="w-full overflow-x-auto pb-4">
        <div
          className="w-full space-y-1.5"
          style={{ minWidth: `${Math.max(680, 160 + (columns.length || 7) * 85)}px` }}
        >
          {/* MERGED COLUMN HEADERS (BRAND + DATE MERGED VERTICALLY) */}
          <div
            className="grid gap-1.5 items-center w-full"
            style={{
              gridTemplateColumns: `minmax(140px, 180px) repeat(${Math.max(1, columns.length)}, minmax(85px, 1fr))`,
            }}
          >
            {/* Empty space above row titles matching height */}
            <div className="h-[56px]" />

            {/* Vertically merged Brand & Date header cards for each column */}
            {columns.map((col) => {
              const brandBg = `${getBrandBgClass(col.brand)} text-slate-900`;

              return (
                <div
                  key={`header_${col.id}`}
                  className="h-[56px] rounded-md overflow-hidden bg-white border border-[#e2e8f0] flex flex-col justify-between shadow-none select-none w-full min-w-0"
                >
                  {/* Top half: Brand */}
                  <div
                    className={`h-[28px] w-full flex items-center justify-center text-xs font-bold tracking-wide ${brandBg}`}
                  >
                    <span>{cleanBrand(col.brand)}</span>
                  </div>

                  {/* Bottom half: Date */}
                  <div className="h-[28px] w-full bg-white flex items-center justify-center text-xs font-semibold text-slate-700">
                    {formatHeaderDate(col.date_label, col.target_date)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 6 BASE OPERATIONAL DATA ROWS */}
          {rowsConfig.map((row) => (
            <div
              key={row.key}
              className="grid gap-1.5 items-center w-full"
              style={{
                gridTemplateColumns: `minmax(140px, 180px) repeat(${Math.max(1, columns.length)}, minmax(85px, 1fr))`,
              }}
            >
              {/* Row Title Card */}
              <div className={`h-[56px] rounded-md ${row.headerBg} px-2.5 flex items-center gap-2 select-none w-full min-w-0`}>
                <div className={`w-7 h-7 rounded-md ${row.badgeBg} text-white flex items-center justify-center shrink-0`}>
                  {row.icon}
                </div>
                <div className="min-w-0 overflow-hidden">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate">{row.title}</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">{row.subtitle}</div>
                </div>
              </div>

              {/* Read-only Value Cells */}
              {columns.map((col) => {
                const val = getCellValue(col, row.key);
                const isSell = row.key === "physical_sell" || row.key === "bot_sell";
                const isRed = isSell;

                let cellDisplay = val.toLocaleString();
                if (isSell) {
                  const absVal = Math.abs(val);
                  cellDisplay = absVal > 0 ? `-${absVal.toLocaleString()}` : "0";
                }

                return (
                  <div
                    key={`cell_${row.key}_${col.id}`}
                    className={`h-[56px] rounded-md ${row.cellBg} flex flex-col items-center justify-center select-none cursor-default w-full min-w-0`}
                  >
                    <div
                      className={`text-sm sm:text-[15px] font-semibold tracking-tight leading-none ${
                        isRed ? "text-[#ef4444]" : "text-slate-900"
                      }`}
                    >
                      {cellDisplay}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* TOTAL TWO-COLUMN SUMMARY ROW (USING CELLS MATCHING UPPER MATRIX STYLE) */}
          <div
            className="grid gap-1.5 items-center w-full pt-1"
            style={{
              gridTemplateColumns: `minmax(140px, 180px) repeat(${Math.max(1, columns.length)}, minmax(85px, 1fr))`,
            }}
          >
            {/* Total All Stock Cell */}
            <div className="h-[56px] rounded-md overflow-hidden bg-white border border-[#e2e8f0] flex flex-col justify-between shadow-none select-none w-full min-w-0">
              <div className="h-[28px] w-full flex items-center justify-center text-xs font-bold italic tracking-tight bg-[#fed7aa] text-slate-900 border-b border-slate-900/10">
                <span>Total All Stock</span>
              </div>
              <div className="h-[28px] w-full bg-[#fed7aa] flex items-center justify-center text-sm font-bold italic text-slate-900">
                <span>
                  {grandTotalAllStock < 0
                    ? `-${Math.abs(grandTotalAllStock).toLocaleString()}`
                    : grandTotalAllStock.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Paired 2-Column Total Cells (Using Each Brand's Own Color) */}
            {pairTotalsToRender.map((pair, idx) => (
              <div
                key={`pair_card_${idx}`}
                className="h-[56px] rounded-md overflow-hidden bg-white border border-[#e2e8f0] flex flex-col justify-between shadow-none select-none w-full min-w-0"
                style={{ gridColumn: `span ${pair.span}` }}
              >
                <div
                  className={`h-[28px] w-full flex items-center justify-center text-xs font-bold tracking-tight ${pair.headerBg} text-slate-900 border-b border-slate-900/10`}
                >
                  <span>{pair.label}</span>
                </div>
                <div
                  className={`h-[28px] w-full ${pair.cellBg} flex items-center justify-center text-sm font-bold text-slate-900`}
                >
                  <span>
                    {pair.value < 0
                      ? `-${Math.abs(pair.value).toLocaleString()}`
                      : pair.value.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
