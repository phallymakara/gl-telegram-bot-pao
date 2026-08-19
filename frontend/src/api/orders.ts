/**
 * @file orders.ts
 * @description Orders domain module providing interface definitions and API endpoint operations for managing customer platform and physical orders.
 */

import { api } from "./client";

/**
 * Interface representing customer order details returned from backend endpoints.
 */
export interface OrderData {
  id: number;
  order_no: string;
  customer_name: string | null;
  sales_person?: string | null;
  group_name: string | null;
  slot_date: string | null;
  slot_date_str?: string | null;
  quantity: number;
  premium: number;
  premium_amount: number;
  transaction_type: string;
  status: string;
  created_at: string;
  channel?: string;
  region?: string | null;
  telegram_user_id?: string | null;
  username?: string | null;
  order_source?: string;
  order_date?: string;
  spot_price?: number;
  total_amount?: number;
}

/**
 * Orders API service handling CRUD operations for gold orders.
 */
export const ordersApi = {
  /**
   * Fetches the complete list of customer orders.
   * @returns Promise resolving to an array of OrderData objects.
   */
  getOrders: () => api.get<OrderData[]>("/api/orders"),

  /**
   * Creates a new customer gold order.
   * @param data Order details payload.
   */
  createOrder: (data: Partial<OrderData>) => api.post<OrderData>("/api/orders", data),

  /**
   * Updates an existing order record.
   * @param id Target order ID.
   * @param data Updated order fields.
   */
  updateOrder: (id: number, data: Partial<OrderData>) =>
    api.put<OrderData>(`/api/orders/${id}`, data),

  /**
   * Deletes an order record by ID.
   * @param id Target order ID.
   */
  deleteOrder: (id: number) => api.delete<void>(`/api/orders/${id}`),
};
