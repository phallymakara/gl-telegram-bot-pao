/**
 * @file customers.ts
 * @description Customers domain module defining interfaces and API endpoints for managing Telegram bot customers.
 */

import { api } from "./client";

/**
 * Interface representing customer account profiles.
 */
export interface CustomerData {
  id: number;
  telegram_user_id: string;
  username: string | null;
  display_name: string | null;
  created_at: string;
}

/**
 * Customers API service providing retrieval methods for customer records.
 */
export const customersApi = {
  /**
   * Fetches the complete list of registered customers.
   * @returns Promise resolving to an array of CustomerData.
   */
  getCustomers: () => api.get<CustomerData[]>("/api/customers"),

  /**
   * Fetches a single customer record by ID.
   * @param id Target customer ID.
   */
  getCustomerById: (id: number) => api.get<CustomerData>(`/api/customers/${id}`),
};
