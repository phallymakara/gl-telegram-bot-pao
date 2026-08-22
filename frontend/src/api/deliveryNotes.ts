/**
 * @file deliveryNotes.ts
 * @description Delivery Notes and Payment Collections domain module providing API client operations and types.
 */

import { api } from "./client";

export interface DeliveryNoteItem {
  id: number;
  delivery_no: string;
  order_id: number;
  order_no: string;
  customer_id?: number | null;
  customer_name?: string | null;
  recipient_name: string;
  delivery_address: string;
  driver_contact?: string | null;
  goods_delivered?: string | null;
  gold_quantity: number;
  order_quantity?: number | null;
  order_total_amount?: number | null;
  amount_owed: number;
  amount_paid: number;
  outstanding_balance: number;
  payment_status: "WAITING_PAYMENT" | "PARTIALLY_PAID" | "PAID" | string;
  courier_status: "Dispatched" | "In Transit" | "Delivered" | string;
  dispatch_date?: string | null;
  notes?: string | null;
  created_at: string;
  payments_count: number;
  order_is_fully_delivered?: boolean;
  order_is_fully_paid?: boolean;
}

export interface PaymentCollectionItem {
  id: number;
  delivery_note_id: number;
  amount: number;
  payment_date: string;
  collected_by: string;
  payment_method: string;
  reference_note?: string | null;
  created_at: string;
}

export interface DeliveryNoteDetailItem extends DeliveryNoteItem {
  payments: PaymentCollectionItem[];
}

export interface EligibleOrder {
  id: number;
  order_no: string;
  customer_name?: string | null;
  quantity: number;
  dispatched_quantity?: number;
  remaining_quantity?: number;
  spot_price?: number | null;
  premium?: number | null;
  total_amount?: number | null;
  transaction_type: string;
  status: string;
  created_at: string;
  slot_date_str?: string | null;
}

export interface CreateDeliveryNotePayload {
  order_id: number;
  recipient_name: string;
  delivery_address: string;
  driver_contact?: string;
  goods_delivered?: string;
  gold_quantity?: number;
  amount_owed?: number;
  collected_amount?: number;
  dispatch_date?: string;
  courier_status?: string;
  notes?: string;
}

export interface RecordPaymentPayload {
  amount: number;
  payment_date: string;
  collected_by: string;
  payment_method: string;
  reference_note?: string;
}

export interface PartialDeliveryCalculationResponse {
  order_id: number;
  order_no: string;
  total_ordered_quantity: number;
  delivered_so_far_quantity: number;
  dispatch_quantity: number;
  remaining_quantity_after_dispatch: number;
  proportional_amount_owed: number;
  is_valid: boolean;
  message?: string | null;
}

export const deliveryNotesApi = {
  /**
   * Fetches list of delivery notes with optional search and filters.
   */
  getDeliveryNotes: (params?: { search?: string; payment_status?: string; courier_status?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.payment_status) query.append("payment_status", params.payment_status);
    if (params?.courier_status) query.append("courier_status", params.courier_status);
    const qs = query.toString();
    return api.get<DeliveryNoteItem[]>(`/api/delivery-notes${qs ? `?${qs}` : ""}`);
  },

  /**
   * Fetches completed/delivered customer sales ready for delivery note creation.
   */
  getEligibleOrders: () =>
    api.get<EligibleOrder[]>("/api/delivery-notes/eligible-orders"),

  /**
   * Requests server-side calculation for partial gold delivery formulas.
   */
  calculatePartialDelivery: (orderId: number, dispatchQuantity: number) =>
    api.post<PartialDeliveryCalculationResponse>("/api/delivery-notes/calculate-partial", {
      order_id: orderId,
      dispatch_quantity: dispatchQuantity,
    }),

  /**
   * Fetches single delivery note along with full payment collection history.
   */
  getDeliveryNote: (id: number) =>
    api.get<DeliveryNoteDetailItem>(`/api/delivery-notes/${id}`),

  /**
   * Generates a new delivery note from a completed sale.
   */
  createDeliveryNote: (data: CreateDeliveryNotePayload) =>
    api.post<DeliveryNoteItem>("/api/delivery-notes", data),

  /**
   * Updates delivery note details.
   */
  updateDeliveryNote: (id: number, data: Partial<CreateDeliveryNotePayload>) =>
    api.put<DeliveryNoteItem>(`/api/delivery-notes/${id}`, data),

  /**
   * Records a payment collection against a delivery note.
   */
  recordPayment: (deliveryNoteId: number, data: RecordPaymentPayload) =>
    api.post<PaymentCollectionItem>(`/api/delivery-notes/${deliveryNoteId}/payments`, data),

  /**
   * Deletes a delivery note.
   */
  deleteDeliveryNote: (id: number) =>
    api.delete<void>(`/api/delivery-notes/${id}`),
};
