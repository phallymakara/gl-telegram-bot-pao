const BASE = "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text || `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(text);
      if (parsed && parsed.detail) message = String(parsed.detail);
    } catch {
      // keep raw text
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function toNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/* -------- Types matching backend schemas -------- */

export interface UserData {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface OrderData {
  id: number;
  order_no: string;
  customer_name: string | null;
  group_name: string | null;
  slot_date: string | null;
  quantity: number;
  premium: number;
  premium_amount: number;
  transaction_type: string;
  status: string;
  created_at: string;
}

export interface SlotRowData {
  id: number;
  slot_date: string;
  premium: number;
}

export interface SlotTableData {
  id: number;
  table_name: string;
  stock: number;
  is_active: boolean;
  display_order: number;
  rows: SlotRowData[];
}

export interface AlertData {
  id: number;
  type: string;
  title: string;
  message: string;
  premium: number | null;
  discount: number | null;
  discount_type: string | null;
  trigger_stock: number | null;
  start_at: string | null;
  end_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DashboardStatsData {
  total_gold: number;
  total_orders: number;
  sold_today: number;
  buy_today: number;
  total_buy_kg: number;
  total_sell_kg: number;
  physical_stock?: number;
  reserved?: number;
  available?: number;
  open_orders?: number;
}

export interface RevenuePointData {
  day: string;
  buy: number;
  sell: number;
}

export interface CustomerData {
  id: number;
  telegram_user_id: string;
  username: string | null;
  display_name: string | null;
  created_at: string;
}

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

export interface PurchaseOrderData {
  id: number;
  po_no: string;
  po_type: string;
  supplier_id: number | null;
  supplier_name: string | null;
  slot_table_id: number;
  slot_table_name: string | null;
  quantity: number;
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
