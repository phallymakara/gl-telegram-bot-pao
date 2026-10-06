/**
 * @file dashboard.ts
 * @description Dashboard domain module defining interfaces and API service endpoints for main KPI statistics and revenue analytics charts.
 */

import { api } from "./client";

/**
 * Interface representing system dashboard KPI summary statistics.
 */
export interface DashboardStatsData {
  total_gold: number;
  total_orders: number;
  sold_today: number;
  buy_today: number;
  total_buy_kg: number;
  total_sell_kg: number;
  physical_stock?: number;
  incoming_po?: number;
  remaining_incoming?: number;
  gold_in_overseas?: number;
  gold_in_local_platform?: number;
  gold_in_local_physical?: number;
  gold_in_local?: number;
  gold_in_total?: number;
  gold_out_overseas?: number;
  gold_out_platform?: number;
  gold_out_physical?: number;
  gold_out_total?: number;
  reserved?: number;
  reserved_stock?: number;
  reserved_incoming?: number;
  available?: number;
  open_orders?: number;
}

/**
 * Interface representing revenue chart data points.
 */
export interface RevenuePointData {
  day: string;
  buy: number;
  sell: number;
}

export interface DailyGoldFlowData {
  po_overseas: number;
  po_local: number;
  po_local_platform: number;
  po_local_physical: number;
  total: number;
}

export interface DailyGoldOutData {
  overseas: number;
  platform: number;
  physical: number;
  total: number;
}

export interface DailyOrderDetailData {
  id: number;
  order_no: string;
  transaction_type: string;
  quantity: number;
  channel: string | null;
  customer_name: string | null;
  status: string;
  slot_date_str: string | null;
  created_at: string;
  /** "ORDER" = customer BUY/SELL order; "PO" = supplier purchase order (LOCAL/OVERSEA/BUYBACK). */
  source: "ORDER" | "PO";
}

export interface DailyBreakdownRowData {
  date: string;
  gold_in: DailyGoldFlowData;
  gold_out: DailyGoldOutData;
  balance: number;
  transaction_count: number;
  orders: DailyOrderDetailData[];
}

export interface DailyBreakdownResponseData {
  year: number;
  month: number;
  days: DailyBreakdownRowData[];
}

export interface StockMatrixCellData {
  value: number | null;
  order_id: number | null;
  order_no: string | null;
}

export interface StockMatrixColumnData {
  id: string;
  brand: string;
  date_label: string;
  target_date?: string;
  header_color: string;
  text_color?: string;
  import_stock: number;
  trade_in?: number;
  physical_sale?: number;
  bot_sale?: number;
  available_stock: number;
  total_deductions: number;
  deductions: number[];
  trade_in_cell?: StockMatrixCellData | null;
  physical_sale_cell?: StockMatrixCellData | null;
  bot_sale_cell?: StockMatrixCellData | null;
}

export interface StockMatrixLeftTotalData {
  label: string;
  value: number;
  category: "cream" | "orange";
}

export interface StockMatrixResponseData {
  columns: StockMatrixColumnData[];
  deduction_rows: (number | null)[][];
  deduction_cells: StockMatrixCellData[][];
  left_totals: StockMatrixLeftTotalData[];
  summary_deductions: number[];
}

/**
 * Dashboard API service fetching dashboard summary statistics and chart metrics.
 */
export const dashboardApi = {
  /**
   * Fetches overall KPI metrics summary for dashboard widgets.
   */
  getStats: () => api.get<DashboardStatsData>("/api/dashboard/stats"),

  /**
   * Fetches revenue chart metrics data points.
   */
  getChartData: () => api.get<RevenuePointData[]>("/api/dashboard/revenue"),

  /**
   * Fetches per-day gold in/out breakdown for a 7-day window around the target date.
   */
  getDailyBreakdown: (targetDate?: string) =>
    api.get<DailyBreakdownResponseData>(
      `/api/dashboard/daily-breakdown${targetDate ? `?target_date=${targetDate}` : ""}`
    ),

  /**
   * Fetches the operational brand & date stock inventory matrix.
   */
  getStockMatrix: () => api.get<StockMatrixResponseData>("/api/dashboard/stock-matrix"),

  /**
   * Persists a new deduction SELL order or trade-in BUY order in the real database from the matrix.
   */
  createDeduction: (data: {
    brand: string;
    date: string;
    quantity: number;
    channel?: string;
    transaction_type?: string;
    customer_name?: string;
  }) =>
    api.post<{ success: boolean; order_id: number; order_no: string }>(
      "/api/dashboard/stock-matrix/deduction",
      data
    ),

  /**
   * Updates an existing deduction SELL order's quantity in the real database.
   */
  updateDeduction: (orderId: number, data: { quantity: number }) =>
    api.put<{ success: boolean; order_id: number; order_no: string }>(
      `/api/dashboard/stock-matrix/deduction/${orderId}`,
      data
    ),

  /**
   * Deletes a deduction SELL order from the real database.
   */
  deleteDeduction: (orderId: number) =>
    api.delete(`/api/dashboard/stock-matrix/deduction/${orderId}`),

  /**
   * Updates or creates a PurchaseOrder import stock for a brand & date in the real database.
   */
  updateImport: (data: { brand: string; date: string; quantity: number }) =>
    api.put<{ success: boolean; po_id: number; po_no: string }>(
      "/api/dashboard/stock-matrix/import-stock",
      data
    ),

  /**
   * Persistently adds a new column to the stock matrix in the database.
   */
  addColumn: (data: { brand: string; date: string; header_color?: string; after_id?: string }) =>
    api.post<StockMatrixResponseData>("/api/dashboard/stock-matrix/column", data),

  /**
   * Persistently deletes a column from the stock matrix in the database.
   */
  deleteColumn: (colId: string) =>
    api.delete<StockMatrixResponseData>(`/api/dashboard/stock-matrix/column/${colId}`),

  /**
   * Persistently updates brand or date for a column in the stock matrix.
   */
  updateColumn: (colId: string, data: { brand?: string; date?: string }) =>
    api.put<StockMatrixResponseData>(`/api/dashboard/stock-matrix/column/${colId}`, data),
};


