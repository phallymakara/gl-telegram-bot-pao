/**
 * @file auditLogs.ts
 * @description Audit & Activity Logs API service and TypeScript interfaces for Super Admin monitoring.
 */

import { api } from "./client";

export interface ActivityLogItem {
  id: number;
  user_id: number | null;
  username: string | null;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  category: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  status: string;
  created_at: string;
}

export interface ActivityLogListResponse {
  items: ActivityLogItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface ActivityLogStats {
  total_logs: number;
  today_logs: number;
  auth_events_today: number;
  sell_order_events: number;
  stock_adjustments: number;
  failed_events: number;
  categories: string[];
  actions: string[];
}

export interface ActivityLogFilters {
  search?: string;
  category?: string;
  action?: string;
  status?: string;
  user_id?: number;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export type AuthEventType =
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "USER_SWITCH"
  | "SUPER_ADMIN_UNLOCK"
  | "SUPER_ADMIN_LOCK";

export interface AuthEventPayload {
  event_type: AuthEventType;
  target_user_id?: number | null;
  previous_user_id?: number | null;
  description?: string;
}

function buildQuery(params: ActivityLogFilters): string {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.category) qs.set("category", params.category);
  if (params.action) qs.set("action", params.action);
  if (params.status) qs.set("status", params.status);
  if (params.user_id !== undefined) qs.set("user_id", String(params.user_id));
  if (params.date_from) qs.set("date_from", params.date_from);
  if (params.date_to) qs.set("date_to", params.date_to);
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  if (params.offset !== undefined) qs.set("offset", String(params.offset));
  const encoded = qs.toString();
  return encoded ? `?${encoded}` : "";
}

export const auditLogsApi = {
  getLogs: (filters: ActivityLogFilters = {}) =>
    api.get<ActivityLogListResponse>(`/api/audit-logs/${buildQuery(filters)}`),

  getStats: () => api.get<ActivityLogStats>("/api/audit-logs/stats"),

  recordAuthEvent: (payload: AuthEventPayload) =>
    api.post<ActivityLogItem>("/api/audit-logs/auth-event", payload),

  logout: () => api.post<{ status: string }>("/api/auth/logout", {}),
};

