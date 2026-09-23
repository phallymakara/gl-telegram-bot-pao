/**
 * @file withdrawals.ts
 * @description Customer Withdrawals API client and type definitions.
 * Handles fetching customer withdrawals, reviewing/approving payouts, and retrieving statistics.
 */

import { api, toNumber } from "./client";

export interface WithdrawalCustomer {
  id: number;
  name: string | null;
  contact: string | null;
  customer_code: string | null;
}

export interface WithdrawalItem {
  id: number;
  withdraw_no: string;
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
  customer?: WithdrawalCustomer | null;
}

export interface WithdrawalStats {
  total_count: number;
  total_amount: number;
  pending_count: number;
  pending_amount: number;
  approved_count: number;
  approved_amount: number;
  rejected_count: number;
  rejected_amount: number;
}

export interface WithdrawalQueryParams {
  status?: string;
  payment_method?: string;
  search?: string;
}

export const withdrawalsApi = {
  /**
   * Retrieves list of customer withdrawals with optional filters.
   */
  getWithdrawals: async (params?: WithdrawalQueryParams): Promise<WithdrawalItem[]> => {
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
    const raw = await api.get<any[]>(`/api/withdrawals/${query}`);
    return raw.map((w) => ({
      ...w,
      amount: toNumber(w.amount),
    }));
  },

  /**
   * Retrieves withdrawal statistics overview.
   */
  getStats: async (): Promise<WithdrawalStats> => {
    const raw = await api.get<any>("/api/withdrawals/stats");
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
   * Retrieves single withdrawal detail.
   */
  getWithdrawal: async (id: number): Promise<WithdrawalItem> => {
    const w = await api.get<any>(`/api/withdrawals/${id}`);
    return {
      ...w,
      amount: toNumber(w.amount),
    };
  },

  /**
   * Reviews a withdrawal (approve or reject payout with reference notes).
   */
  reviewWithdrawal: (
    id: number,
    status: "APPROVED" | "REJECTED" | "PENDING",
    notes?: string,
    reviewed_by?: string,
    receipt_url?: string
  ) =>
    api.put<WithdrawalItem>(`/api/withdrawals/${id}/status`, {
      status,
      notes,
      reviewed_by,
      receipt_url,
    }),

  /**
   * Deletes a withdrawal record.
   */
  deleteWithdrawal: (id: number) => api.delete<void>(`/api/withdrawals/${id}`),
};
