import React, { useEffect, useState, useCallback } from "react";
import {
  Package,
  Truck,
  Monitor,
  Laptop,
  Plus,
  Trash2,
  Pencil,
  Lock,
  Layers,
  X,
} from "lucide-react";
import Loader from "./Loader";
import {
  dashboardApi,
  StockMatrixResponseData,
  StockMatrixColumnData,
  StockMatrixRowData,
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
 * Default fallback matrix rows if backend rows are not loaded yet.
 */
const DEFAULT_ROWS: StockMatrixRowData[] = [
  {
    key: "available",
    title: "Available Stock",
    subtitle: "Ready to sell",
    header_bg: "bg-[#ecfdf5]",
    cell_bg: "bg-[#f0fdf4]",
    badge_bg: "bg-[#10b981]",
    is_system: true,
  },
  {
    key: "import",
    title: "Import Stock",
    subtitle: "Incoming goods",
    header_bg: "bg-[#eff6ff]",
    cell_bg: "bg-[#eff6ff]",
    badge_bg: "bg-[#3b82f6]",
    is_system: true,
  },
  {
    key: "physical_sell",
    title: "Physical Sell",
    subtitle: "In-store sell",
    header_bg: "bg-[#f0f9ff]",
    cell_bg: "bg-[#f0f9ff]",
    badge_bg: "bg-[#0284c7]",
    is_system: true,
  },
  {
    key: "bot_sell",
    title: "Bot Sell",
    subtitle: "Online / Bot sell",
    header_bg: "bg-[#f0f9ff]",
    cell_bg: "bg-[#f0f9ff]",
    badge_bg: "bg-[#0284c7]",
    is_system: true,
  },
  {
    key: "physical_buy",
    title: "Physical Buy",
    subtitle: "In-store buy",
    header_bg: "bg-[#ecfeff]",
    cell_bg: "bg-[#ecfeff]",
    badge_bg: "bg-[#06b6d4]",
    is_system: true,
  },
  {
    key: "bot_buy",
    title: "Bot Buy",
    subtitle: "Online / Bot buy",
    header_bg: "bg-[#ecfeff]",
    cell_bg: "bg-[#ecfeff]",
    badge_bg: "bg-[#06b6d4]",
    is_system: true,
  },
];

/**
 * Get icon for row based on its key.
 */
function getRowIcon(rowKey: string) {
  switch (rowKey) {
    case "available":
      return <Package size={16} className="stroke-[2.2]" />;
    case "import":
      return <Truck size={16} className="stroke-[2.2]" />;
    case "physical_sell":
      return <Monitor size={16} className="stroke-[2.2]" />;
    case "bot_sell":
      return <Laptop size={16} className="stroke-[2.2]" />;
    case "physical_buy":
      return <Monitor size={16} className="stroke-[2.2]" />;
    case "bot_buy":
      return <Laptop size={16} className="stroke-[2.2]" />;
    default:
      return <Layers size={16} className="stroke-[2.2]" />;
  }
}

/**
 * Main Inventory Dashboard Matrix:
 * - Realtime database data fetching (polled every 2s + window focus)
 * - Dynamic Column CRUD with database validation that DB brand columns must not be less than user-created slots
 * - Dynamic Row CRUD (Add row, Edit title/subtitle, Delete custom rows)
 * - Direct Cell Value Editing (Update import stock, buy/sell orders, or custom row quantities)
 * - Brand & Settlement Date Columns
 * - Calculated Total Row below combining two columns into one
 */
export default function StockMatrixTable() {
  const [data, setData] = useState<StockMatrixResponseData | null>(null);
  const [columns, setColumns] = useState<StockMatrixColumnData[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Column CRUD Modal states
  const [isAddColModalOpen, setIsAddColModalOpen] = useState(false);
  const [newColBrand, setNewColBrand] = useState("DB");
  const [newColError, setNewColError] = useState<string | null>(null);

  const [editingCol, setEditingCol] = useState<StockMatrixColumnData | null>(null);
  const [editColBrand, setEditColBrand] = useState("");
  const [editColDate, setEditColDate] = useState("");
  const [editColError, setEditColError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Local ISO date string (YYYY-MM-DD)
  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const todayStr = getTodayStr();

  // Timezone-safe date parser
  const parseLocalDate = (dStr: string): Date => {
    if (!dStr) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return now;
    }
    const clean = dStr.trim();
    const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]), 0, 0, 0, 0);
    }
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
    const slashMatch = clean.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (slashMatch) {
      const day = Number(slashMatch[1]);
      const month = Number(slashMatch[2]) - 1;
      let year = slashMatch[3] ? Number(slashMatch[3]) : new Date().getFullYear();
      if (year < 100) year += 2000;
      return new Date(year, month, day, 0, 0, 0, 0);
    }
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

  // Realtime matrix data fetcher
  const loadData = useCallback(() => {
    dashboardApi
      .getStockMatrix(todayStr)
      .then((res) => {
        setData(res);
        setColumns(sortColumnsChronologically(res.columns, todayStr));
      })
      .catch((err) => {
        console.error("Failed to load stock matrix", err);
      });
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

  // Auto-dismiss error messages after 30 seconds
  useEffect(() => {
    if (!globalError) return;
    const timer = setTimeout(() => {
      setGlobalError(null);
    }, 30000);
    return () => clearTimeout(timer);
  }, [globalError]);

  useEffect(() => {
    if (!newColError) return;
    const timer = setTimeout(() => {
      setNewColError(null);
    }, 30000);
    return () => clearTimeout(timer);
  }, [newColError]);

  useEffect(() => {
    if (!editColError) return;
    const timer = setTimeout(() => {
      setEditColError(null);
    }, 30000);
    return () => clearTimeout(timer);
  }, [editColError]);

  // Read cell value for a row and column
  const getCellValue = (col: StockMatrixColumnData, row: StockMatrixRowData): number => {
    switch (row.key) {
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
        return row.custom_values?.[col.id] ?? 0;
    }
  };

  // Format header date label to D-MMM
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

  // Active matrix rows from backend or fallback to base
  const rowsToRender: StockMatrixRowData[] =
    data?.rows && data.rows.length > 0 ? data.rows : DEFAULT_ROWS;

  // --- COLUMN ACTIONS ---

  /**
   * Calculate the next auto-extended date string (YYYY-MM-DD) for a given brand/type
   * based on the latest existing column date for that brand.
   * If columns exist for that brand, it auto-extends to (latest date + 1 day).
   * If no columns exist yet or all are in the past, it defaults to today.
   */
  const getNextExtendedDateForBrand = useCallback(
    (brandName: string): string => {
      const bLower = (brandName || "").trim().toLowerCase();
      const brandCols = columns.filter((c) => {
        const cBrand = (c.brand || "").trim().toLowerCase();
        return cBrand === bLower;
      });

      if (brandCols.length === 0) {
        return todayStr;
      }

      let maxDate = parseLocalDate(todayStr);
      let foundAny = false;

      for (const col of brandCols) {
        const dStr = col.target_date || col.date_label;
        if (dStr) {
          const parsed = parseLocalDate(dStr);
          if (!foundAny || parsed > maxDate) {
            maxDate = parsed;
            foundAny = true;
          }
        }
      }

      const todayDate = parseLocalDate(todayStr);
      const baseDate = maxDate >= todayDate ? maxDate : todayDate;

      // Extend by +1 day from the base latest date
      const nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + 1);

      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, "0");
      const d = String(nextDate.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    },
    [columns, todayStr]
  );

  const handleOpenAddColModal = (presetBrand?: string) => {
    const brand = presetBrand || "DB";
    setNewColBrand(brand);
    setNewColError(null);
    setIsAddColModalOpen(true);
  };

  const handleBrandChange = (brand: string) => {
    setNewColBrand(brand);
    setNewColError(null);
  };

  const handleExtendEditColDate = () => {
    const base = parseLocalDate(editColDate || todayStr);
    base.setDate(base.getDate() + 1);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, "0");
    const d = String(base.getDate()).padStart(2, "0");
    setEditColDate(`${y}-${m}-${d}`);
  };

  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetDate = getNextExtendedDateForBrand(newColBrand);
    if (!targetDate || !targetDate.trim()) {
      setNewColError("Unable to calculate next extended date.");
      return;
    }
    setIsSubmitting(true);
    setNewColError(null);
    try {
      const updated = await dashboardApi.addColumn({
        brand: newColBrand.trim(),
        date: targetDate.trim(),
      });
      setData(updated);
      setColumns(sortColumnsChronologically(updated.columns, todayStr));
      setIsAddColModalOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to add column";
      setNewColError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditColModal = (col: StockMatrixColumnData) => {
    setEditingCol(col);
    setEditColBrand(col.brand);
    setEditColDate(col.target_date || todayStr);
    setEditColError(null);
  };

  const handleUpdateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCol) return;
    setIsSubmitting(true);
    setEditColError(null);
    try {
      const updated = await dashboardApi.updateColumn(editingCol.id, {
        brand: editColBrand.trim(),
        date: editColDate.trim(),
      });
      setData(updated);
      setColumns(sortColumnsChronologically(updated.columns, todayStr));
      setEditingCol(null);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to update column";
      setEditColError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteColumn = async (col: StockMatrixColumnData) => {
    const confirmPrompt = `Delete ${cleanBrand(col.brand)} column for ${formatHeaderDate(col.date_label, col.target_date)}?`;

    if (!window.confirm(confirmPrompt)) return;

    try {
      const updated = await dashboardApi.deleteColumn(col.id);
      setData(updated);
      setColumns(sortColumnsChronologically(updated.columns, todayStr));
      setGlobalError(null);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to delete column";
      setGlobalError(msg);
    }
  };

  if (!data || columns.length === 0) {
    return (
      <div className="flex-1 w-full h-full min-h-[500px] flex items-center justify-center">
        <Loader size="md" text="Loading Dashboard..." />
      </div>
    );
  }

  // Group columns strictly by brand/type in the exact order they appear in the matrix grid
  // This guarantees each total card is positioned directly under its own type and NEVER crosses types
  const brandGroups: { brand: string; cols: StockMatrixColumnData[] }[] = [];
  for (const col of columns) {
    const bKey = (col.brand || "").trim().toLowerCase();
    const lastGroup = brandGroups[brandGroups.length - 1];
    if (lastGroup && (lastGroup.brand || "").trim().toLowerCase() === bKey) {
      lastGroup.cols.push(col);
    } else {
      brandGroups.push({ brand: col.brand, cols: [col] });
    }
  }

  const totalsToRender: {
    label: string;
    span: number;
    headerBg: string;
    cellBg: string;
    value: number;
  }[] = [];

  for (const group of brandGroups) {
    const brandColor = getBrandBgClass(group.brand);
    for (let i = 0; i < group.cols.length; i += 2) {
      const colA = group.cols[i];
      const colB = group.cols[i + 1];

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

        totalsToRender.push({
          label: `Total ${rangeLabel}`,
          span: 2,
          headerBg: brandColor,
          cellBg: brandColor,
          value: totalVal,
        });
      } else {
        const dA = parseLocalDate(colA.target_date || colA.date_label);
        const dayA = String(dA.getDate()).padStart(2, "0");
        const monthA = String(dA.getMonth() + 1).padStart(2, "0");

        totalsToRender.push({
          label: `Total ${dayA}/${monthA}`,
          span: 1,
          headerBg: brandColor,
          cellBg: brandColor,
          value: colA.available_stock || 0,
        });
      }
    }
  }

  const grandTotalAllStock =
    typeof data?.total_all_stock === "number"
      ? data.total_all_stock
      : columns.reduce((acc, col) => acc + (col.available_stock || 0), 0);

  return (
    <div className="w-full flex-1 py-3 px-3.5 sm:px-5 bg-white font-sans min-w-0">
      {/* ERROR MESSAGE (NO CONTAINER, NO FILLED BOX) */}
      {globalError && (
        <div className="pb-2 flex items-center justify-between text-xs text-red-600 font-medium select-none">
          <span>{globalError}</span>
          <button
            type="button"
            onClick={() => setGlobalError(null)}
            className="p-0.5 text-slate-400 hover:text-red-600 transition"
            title="Dismiss error"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* MATRIX TABLE TOOLBAR */}
      <div className="flex items-center justify-end pb-2.5">
        <button
          type="button"
          onClick={() => handleOpenAddColModal()}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 border border-slate-900 rounded-md transition select-none"
          title="Add brand and date column to the matrix"
        >
          <Plus size={13} className="stroke-[2.5]" />
          <span>Add Column</span>
        </button>
      </div>

      {/* MATRIX TABLE WITH DYNAMIC RESPONSIVE FULL-WIDTH GRID */}
      <div className="w-full overflow-x-auto pb-4">
        <div
          className="w-full space-y-1.5"
          style={{ minWidth: `${Math.max(680, 160 + (columns.length || 7) * 85)}px` }}
        >
          {/* MERGED COLUMN HEADERS (BRAND + DATE MERGED VERTICALLY WITH ACTIONS) */}
          <div
            className="grid gap-1.5 items-center w-full"
            style={{
              gridTemplateColumns: `minmax(140px, 180px) repeat(${Math.max(1, columns.length)}, minmax(85px, 1fr))`,
            }}
          >
            {/* Empty space above row titles matching height */}
            <div className="h-[56px] flex items-end pb-1 px-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Operation / Date
              </span>
            </div>

            {/* Vertically merged Brand & Date header cards for each column */}
            {columns.map((col) => {
              const brandBg = `${getBrandBgClass(col.brand)} text-slate-900`;
              const isDb = col.brand.toLowerCase() === "db";

              return (
                <div
                  key={`header_${col.id}`}
                  className="group relative h-[56px] rounded-md overflow-hidden bg-white border border-[#e2e8f0] flex flex-col justify-between shadow-none select-none w-full min-w-0"
                >
                  {/* Top half: Brand with Edit & Delete actions */}
                  <div
                    className={`h-[28px] w-full flex items-center justify-between px-1.5 text-xs font-bold tracking-wide ${brandBg}`}
                  >
                    <span className="truncate flex-1 text-center pl-3">
                      {cleanBrand(col.brand)}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditColModal(col);
                        }}
                        className="p-0.5 hover:bg-black/10 rounded text-slate-800 transition"
                        title="Edit Column"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteColumn(col);
                        }}
                        className="p-0.5 hover:bg-black/10 rounded text-slate-800 transition"
                        title="Delete Column"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Bottom half: Date */}
                  <div className="h-[28px] w-full bg-white flex items-center justify-center text-xs font-semibold text-slate-700 relative">
                    <span>{formatHeaderDate(col.date_label, col.target_date)}</span>
                    {isDb && (
                      <span
                        className="absolute right-1 text-amber-500 opacity-60 group-hover:opacity-100"
                        title="Active Trading Slot"
                      >
                        <Lock size={10} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* DYNAMIC OPERATIONAL DATA ROWS */}
          {rowsToRender.map((row) => (
            <div
              key={row.key}
              className="grid gap-1.5 items-center w-full"
              style={{
                gridTemplateColumns: `minmax(140px, 180px) repeat(${Math.max(1, columns.length)}, minmax(85px, 1fr))`,
              }}
            >
              {/* Row Title Card (Read-only) */}
              <div
                className={`h-[56px] rounded-md ${
                  row.header_bg || "bg-slate-50"
                } px-2.5 flex items-center select-none w-full min-w-0`}
              >
                <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                  <div
                    className={`w-7 h-7 rounded-md ${
                      row.badge_bg || "bg-slate-600"
                    } text-white flex items-center justify-center shrink-0`}
                  >
                    {getRowIcon(row.key)}
                  </div>
                  <div className="min-w-0 overflow-hidden">
                    <div className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate">
                      {row.title}
                    </div>
                    {row.subtitle && (
                      <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
                        {row.subtitle}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Value Cells (Read-only) */}
              {columns.map((col) => {
                const val = getCellValue(col, row);
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
                    className={`h-[56px] rounded-md ${
                      row.cell_bg || "bg-slate-50"
                    } flex flex-col items-center justify-center select-none w-full min-w-0 cursor-default`}
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

            {/* Brand/Type Summary Total Cells */}
            {totalsToRender.map((pair, idx) => (
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

      {/* --- MODAL: ADD COLUMN --- */}
      {isAddColModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white border border-slate-200 rounded-lg p-5 w-full max-w-sm shadow-none">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Add Matrix Column</h3>
              <button
                type="button"
                onClick={() => setIsAddColModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateColumn} className="pt-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Brand</label>
                <select
                  value={newColBrand}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-slate-500"
                >
                  <option value="DB">DB</option>
                  <option value="Swiss">Swiss</option>
                  <option value="SV">SV</option>
                </select>
              </div>

              {newColError && <p className="text-xs text-red-500 mt-1">{newColError}</p>}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddColModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition disabled:opacity-50"
                >
                  {isSubmitting ? "Adding..." : "Add Column"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: EDIT COLUMN --- */}
      {editingCol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white border border-slate-200 rounded-lg p-5 w-full max-w-sm shadow-none">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Edit Column</h3>
              <button
                type="button"
                onClick={() => setEditingCol(null)}
                className="text-slate-400 hover:text-slate-700 transition"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdateColumn} className="pt-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Brand</label>
                <select
                  value={editColBrand}
                  onChange={(e) => setEditColBrand(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-slate-500"
                >
                  <option value="DB">DB</option>
                  <option value="Swiss">Swiss</option>
                  <option value="SV">SV</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Target Date
                  </label>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={editColDate}
                    min={todayStr}
                    onChange={(e) => setEditColDate(e.target.value)}
                    className={`flex-1 min-w-0 px-2.5 py-1.5 text-xs border rounded-md focus:outline-none ${
                      editColError ? "border-red-500" : "border-slate-300 focus:border-slate-500"
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={handleExtendEditColDate}
                    className="shrink-0 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition select-none flex items-center gap-1"
                    title="Extend date by +1 day"
                  >
                    <Plus size={12} className="stroke-[2.5]" />
                    <span>+1 Day</span>
                  </button>
                </div>
                {editColError && <p className="text-xs text-red-500 mt-1">{editColError}</p>}
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCol(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
