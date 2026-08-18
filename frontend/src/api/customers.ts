/**
 * @file customers.ts
 * @description Master Data - Customers domain module defining interfaces and API service endpoints.
 */

import { api } from "./client";

/**
 * Interface representing customer master data records and optional Telegram bot account profiles.
 */
export interface CustomerData {
  id: number;
  customer_code?: string;
  name?: string;
  contact?: string;
  sex?: string | null;
  dob?: string | null;
  nation?: string | null;
  address?: string | null;
  is_active?: boolean;
  telegram_user_id?: string;
  username?: string | null;
  display_name?: string | null;
  created_at?: string;
}

/**
 * Customers API service handling CRUD operations for master data trade clients and Telegram users.
 */
export const customersApi = {
  /**
   * Fetches the complete list of master data customers.
   * @returns Promise resolving to an array of CustomerData.
   */
  getCustomers: () => api.get<CustomerData[]>("/api/customers/"),

  /**
   * Fetches a single customer record by ID.
   * @param id Target customer ID.
   */
  getCustomerById: (id: number) => api.get<CustomerData>(`/api/customers/${id}`),

  /**
   * Creates a new customer master data record.
   * @param data Customer payload.
   */
  createCustomer: (data: Partial<CustomerData>) =>
    api.post<CustomerData>("/api/customers/", data),

  /**
   * Updates an existing customer master record.
   * @param id Target customer ID.
   * @param data Updated customer payload.
   */
  updateCustomer: (id: number, data: Partial<CustomerData>) =>
    api.put<CustomerData>(`/api/customers/${id}`, data),

  /**
   * Deletes a customer record by ID.
   * @param id Target customer ID.
   */
  deleteCustomer: (id: number) => api.delete<void>(`/api/customers/${id}`),
};
