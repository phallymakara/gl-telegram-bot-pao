/**
 * @file slots.ts
 * @description Slots domain module defining interfaces and API endpoints for managing slot tables and premium price configurations.
 */

import { api } from "./client";

/**
 * Interface representing individual slot date and premium price rows within a slot table.
 */
export interface SlotRowData {
  id: number;
  slot_date: string;
  premium: number;
  qty?: number;
}

/**
 * Interface representing a slot table container holding stock and multiple slot rows.
 */
export interface SlotTableData {
  id: number;
  table_name: string;
  stock: number;
  is_active: boolean;
  display_order: number;
  rows: SlotRowData[];
}

/**
 * Slots API service handling operations for slot price tables.
 */
export const slotsApi = {
  /**
   * Fetches all active slot price tables.
   * @returns Promise resolving to an array of SlotTableData objects.
   */
  getSlotTables: () => api.get<SlotTableData[]>("/api/slots"),

  /**
   * Creates a new slot price table.
   * @param data Slot table configuration payload.
   */
  createSlotTable: (data: Partial<SlotTableData>) =>
    api.post<SlotTableData>("/api/slots", data),

  /**
   * Updates an existing slot table.
   * @param id Target slot table ID.
   * @param data Updated table properties.
   */
  updateSlotTable: (id: number, data: Partial<SlotTableData>) =>
    api.put<SlotTableData>(`/api/slots/${id}`, data),

  /**
   * Deletes a slot table by ID.
   * @param id Target slot table ID.
   */
  deleteSlotTable: (id: number) => api.delete<void>(`/api/slots/${id}`),
};
