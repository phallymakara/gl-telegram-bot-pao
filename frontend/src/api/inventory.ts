/**
 * @file inventory.ts
 * @description Inventory domain module defining interface definitions and API endpoint operations for gold stock inventory records.
 */

import { api } from "./client";

/**
 * Interface representing inventory ledger stock entries.
 */
export interface InventoryData {
  id: number;
  reference?: string;
  inventory_date: string;
  party?: string;
  name?: string;
  stock_kg: number;
  total_amount?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Inventory API service handling stock ledger entries.
 */
export const inventoryApi = {
  /**
   * Fetches all inventory records.
   * @returns Promise resolving to an array of InventoryData entries.
   */
  getInventory: () => api.get<InventoryData[]>("/api/inventory/"),

  /**
   * Creates a new inventory stock adjustment or ledger record.
   * @param data Inventory record payload.
   */
  createInventory: (data: Partial<InventoryData>) =>
    api.post<InventoryData>("/api/inventory/", data),

  /**
   * Updates an existing inventory record.
   * @param id Target inventory entry ID.
   * @param data Updated inventory fields.
   */
  updateInventory: (id: number, data: Partial<InventoryData>) =>
    api.put<InventoryData>(`/api/inventory/${id}`, data),

  /**
   * Deletes an inventory entry by ID.
   * @param id Target inventory entry ID.
   */
  deleteInventory: (id: number) => api.delete<void>(`/api/inventory/${id}`),
};
