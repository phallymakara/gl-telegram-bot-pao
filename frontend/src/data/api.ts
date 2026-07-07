const BASE = "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers: { ...headers, ...(options?.headers as Record<string, string>) } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/* -------- Types matching backend schemas -------- */

export interface UserData {
  id: number; name: string; username: string; email: string;
  role: string; is_active: boolean; last_login: string | null; created_at: string;
}

export interface OrderData {
  id: number; order_no: string; customer_name: string | null; group_name: string | null;
  slot_date: string | null; quantity: number; premium: number; premium_amount: number;
  transaction_type: string; status: string; created_at: string;
}

export interface SlotRowData {
  id: number; slot_date: string; premium: number;
}

export interface SlotTableData {
  id: number; table_name: string; stock: number;
  is_active: boolean; display_order: number; rows: SlotRowData[];
}

export interface AlertData {
  id: number; type: string; title: string; message: string;
  premium: number | null; discount: number | null; discount_type: string | null;
  trigger_stock: number | null; start_at: string | null; end_at: string | null;
  is_active: boolean; created_at: string;
}

export interface DashboardStatsData {
  total_gold: number; total_orders: number; sold_today: number;
  buy_today: number; total_buy_kg: number; total_sell_kg: number;
}

export interface RevenuePointData {
  day: string; buy: number; sell: number;
}

export interface CustomerData {
  id: number; telegram_user_id: string; username: string | null;
  display_name: string | null; created_at: string;
}
