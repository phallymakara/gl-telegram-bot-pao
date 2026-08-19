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
};
