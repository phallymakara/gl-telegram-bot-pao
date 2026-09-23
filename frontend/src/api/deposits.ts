/**
 * @file deposits.ts
 * @description Customer Deposits API client and type definitions.
 * Handles fetching deposits, reviewing (approve/reject) transactions, and loading aggregate statistics.
 */

import { api, toNumber } from "./client";

export interface DepositCustomer {
  id: number;
  name: string | null;
  contact: string | null;
  customer_code: string | null;
}

export interface DepositItem {
  id: number;
  deposit_no: string;
  customer_id: number | null;
  telegram_user_id: string | null;
  username: string | null;
  account_name: string;
  amount: number;
  currency: string;
  payment_method: string;
  receipt_url: string | null;
  telegram_file_id: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
  customer?: DepositCustomer | null;
}

export interface DepositStats {
  total_count: number;
  total_amount: number;
  pending_count: number;
  pending_amount: number;
  approved_count: number;
  approved_amount: number;
  rejected_count: number;
  rejected_amount: number;
}

export interface DepositQueryParams {
  status?: string;
  payment_method?: string;
  search?: string;
}

export const depositsApi = {
  /**
   * Retrieves list of customer deposits with optional filters.
   */
  getDeposits: async (params?: DepositQueryParams): Promise<DepositItem[]> => {
    const searchParams = new URLSearchParams();
    if (params?.status && params.status !== "All Statuses") {
      searchParams.set("status", params.status);
    }
    if (params?.payment_method && params.payment_method !== "All Methods") {
      searchParams.set("payment_method", params.payment_method);
    }
    if (params?.search) {
      searchParams.set("search", params.search);
    }
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    const raw = await api.get<any[]>(`/api/deposits/${query}`);
    return raw.map((d) => ({
      ...d,
      amount: toNumber(d.amount),
    }));
  },

  /**
   * Retrieves deposit statistics overview.
   */
  getStats: async (): Promise<DepositStats> => {
    const raw = await api.get<any>("/api/deposits/stats");
    return {
      total_count: Number(raw.total_count || 0),
      total_amount: toNumber(raw.total_amount),
      pending_count: Number(raw.pending_count || 0),
      pending_amount: toNumber(raw.pending_amount),
      approved_count: Number(raw.approved_count || 0),
      approved_amount: toNumber(raw.approved_amount),
      rejected_count: Number(raw.rejected_count || 0),
      rejected_amount: toNumber(raw.rejected_amount),
    };
  },

  /**
   * Retrieves single deposit detail.
   */
  getDeposit: async (id: number): Promise<DepositItem> => {
    const d = await api.get<any>(`/api/deposits/${id}`);
    return {
      ...d,
      amount: toNumber(d.amount),
    };
  },

  /**
   * Reviews a deposit (approve or reject with notes).
   */
  reviewDeposit: (id: number, status: "APPROVED" | "REJECTED" | "PENDING", notes?: string, reviewed_by?: string) =>
    api.put<DepositItem>(`/api/deposits/${id}/status`, {
      status,
      notes,
      reviewed_by,
    }),

  /**
   * Deletes a deposit record.
   */
  deleteDeposit: (id: number) => api.delete<void>(`/api/deposits/${id}`),
};
