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
  gold_in_local?: number;
  gold_in_customer?: number;
  gold_in_total?: number;
  gold_out_telegram?: number;
  gold_out_phone?: number;
  gold_out_walkin?: number;
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
  getChartData: () => api.get<RevenuePointData[]>("/api/dashboard/chart"),
};
