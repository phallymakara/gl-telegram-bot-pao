/**
 * @file purchaseOrders.ts
 * @description Purchase Orders domain module defining interfaces and API service endpoints for managing local/oversea purchase orders, suppliers, and stock returns.
 */

import { api } from "./client";

/**
 * Interface representing supplier details.
 */
export interface SupplierData {
  id: number;
  name: string;
  supplier_type: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

/**
 * Interface representing purchase order details (LOCAL or OVERSEA).
 */
export interface PurchaseOrderData {
  id: number;
  po_no: string;
  po_type: string;
  supplier_id?: number | null;
  supplier_name: string | null;
  slot_table_id?: number;
  slot_table_name?: string | null;
  quantity: number;
  unit_type?: string | null;
  unit_cost: number;
  total_cost: number;
  currency: string;
  status: string;
  order_date: string | null;
  expected_date: string | null;
  received_date: string | null;
  notes: string | null;
  shipping_method?: string | null;
  tracking_no?: string | null;
  customs_fee?: number | null;
  port_of_origin?: string | null;
  spot_price?: number;
  premium?: number;
  created_at?: string;
}

/**
 * Interface representing stock return transaction entries.
 */
export interface StockReturnData {
  id: number;
  return_no: string;
  return_type: string;
  purchase_order_id: number | null;
  order_id: number | null;
  slot_table_id: number;
  quantity: number;
  reason: string | null;
  created_at: string;
}

export interface CalculatePricingPayload {
  product_type?: string | null;
  unit_type?: string | null;
  spot_price?: number | string | null;
  premium?: number | string | null;
  quantity?: number | string | null;
  total_cost?: number | string | null;
  last_edited_field?: string | null;
}

export interface CalculatePricingResult {
  conversion_factor: number;
  unit_cost: number;
  spot_price?: number | null;
  premium?: number | null;
  quantity?: number | null;
  total_cost?: number | null;
  solved_field?: string | null;
}

/**
 * Purchase Orders API service handling operations for purchase orders, suppliers, and stock returns.
 */
export const purchaseOrdersApi = {
  /**
   * Fetches list of purchase orders, optionally filtered by PO type ("LOCAL" | "OVERSEA").
   * @param poType Optional purchase order filter type.
   */
  getPurchaseOrders: (poType?: string) =>
    api.get<PurchaseOrderData[]>(
      poType ? `/api/purchase-orders?po_type=${poType}` : "/api/purchase-orders"
    ),

  /**
   * Creates a new purchase order entry.
   * @param data Purchase order creation payload.
   */
  createPurchaseOrder: (data: Partial<PurchaseOrderData>) =>
    api.post<PurchaseOrderData>("/api/purchase-orders", data),

  /**
   * Updates an existing purchase order record.
   * @param id Target purchase order ID.
   * @param data Updated purchase order fields.
   */
  updatePurchaseOrder: (id: number, data: Partial<PurchaseOrderData>) =>
    api.put<PurchaseOrderData>(`/api/purchase-orders/${id}`, data),

  /**
   * Deletes a purchase order by ID.
   * @param id Target purchase order ID.
   */
  deletePurchaseOrder: (id: number) =>
    api.delete<void>(`/api/purchase-orders/${id}`),

  /**
   * Calculates dynamic pricing variables via backend solver.
   * @param data Pricing calculation payload.
   */
  calculatePricing: (data: CalculatePricingPayload) =>
    api.post<CalculatePricingResult>("/api/purchase-orders/calculate", data),

  /**
   * Fetches the active suppliers list.
   */
  getSuppliers: () => api.get<SupplierData[]>("/api/suppliers"),

  /**
   * Fetches stock return records.
   */
  getStockReturns: () => api.get<StockReturnData[]>("/api/stock-returns"),
};
