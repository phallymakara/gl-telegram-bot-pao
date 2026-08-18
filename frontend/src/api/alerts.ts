/**
 * @file alerts.ts
 * @description Alerts domain module defining interfaces and API service endpoints for low stock alerts and discount promotions.
 */

import { api } from "./client";

/**
 * Interface representing system alerts and promotion items.
 */
export interface AlertData {
  id: number;
  type: string;
  title: string;
  message: string;
  premium: number | null;
  discount: number | null;
  discount_type: string | null;
  trigger_stock: number | null;
  start_at: string | null;
  end_at: string | null;
  is_active: boolean;
  created_at: string;
}

/**
 * Alerts API service handling CRUD operations for system alerts and discount rules.
 */
export const alertsApi = {
  /**
   * Fetches all alert and promotion rules.
   * @returns Promise resolving to an array of AlertData objects.
   */
  getAlerts: () => api.get<AlertData[]>("/api/alerts"),

  /**
   * Creates a new alert or promotion entry.
   * @param data Alert creation payload.
   */
  createAlert: (data: Partial<AlertData>) => api.post<AlertData>("/api/alerts", data),

  /**
   * Updates an existing alert record.
   * @param id Target alert ID.
   * @param data Updated alert fields.
   */
  updateAlert: (id: number, data: Partial<AlertData>) =>
    api.put<AlertData>(`/api/alerts/${id}`, data),

  /**
   * Deletes an alert record by ID.
   * @param id Target alert ID.
   */
  deleteAlert: (id: number) => api.delete<void>(`/api/alerts/${id}`),
};
